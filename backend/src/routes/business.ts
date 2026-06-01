import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';
import { encryptBotToken } from '../lib/crypto.js';
import { generateCalendarToken } from '../lib/calendarToken.js';
import { mergeReminderSettings } from '../lib/reminderDefaults.js';

// Fields returned to the app owner — never includes any token fields
const SAFE_BUSINESS_SELECT = {
  id: true,
  name: true,
  description: true,
  photoUrl: true,
  mode: true,
  language: true,
  cardNumber: true,
  cardBank: true,
  botUsername: true,
  calendarToken: true,
  workingHours: true,
  bufferMinutes: true,
  ownerTelegramChatId: true,
  ownerId: true,
  plan: true,
  planExpiresAt: true,
  suspendedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const createBusinessBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  mode: z.array(z.enum(['PRODUCTS', 'SERVICES', 'FREELANCE'])).min(1),
  language: z.enum(['UZBEK', 'RUSSIAN', 'ENGLISH']).optional(),
  cardNumber: z.string().min(16).max(20).optional(),
  cardBank: z.enum(['UZCARD', 'HUMO']).optional(),
  ownerTelegramChatId: z.string().optional(),
  botToken: z.string().optional(),
  botUsername: z.string().optional(),
});

// Working hours: keys "0".."6" (0=Sunday … 6=Saturday, Asia/Tashkent local),
// each value either { start: "HH:MM", end: "HH:MM" } or null = closed.
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format');
const dayWindowSchema = z
  .object({ start: hhmm, end: hhmm })
  .refine(
    (d) => {
      const [sh, sm] = d.start.split(':').map(Number);
      const [eh, em] = d.end.split(':').map(Number);
      return sh * 60 + sm < eh * 60 + em;
    },
    { message: 'Working day start must be before end' },
  );
const workingHoursSchema = z.record(
  z.enum(['0', '1', '2', '3', '4', '5', '6']),
  z.union([dayWindowSchema, z.null()]),
);

const updateBusinessBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  mode: z.array(z.enum(['PRODUCTS', 'SERVICES', 'FREELANCE'])).min(1).optional(),
  language: z.enum(['UZBEK', 'RUSSIAN', 'ENGLISH']).optional(),
  workingHours: workingHoursSchema.optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  botToken: z.string().optional(),
  botUsername: z.string().optional(),
  ownerTelegramChatId: z.string().optional(),
  cardNumber: z.string().min(16).max(20).optional(),
  cardBank: z.enum(['UZCARD', 'HUMO']).optional(),
});

const updatePaymentBody = z.object({
  cardNumber: z.string().min(16).max(20),
  cardBank: z.enum(['UZCARD', 'HUMO']),
});

const reminderSettingsSchema = z.object({
  appointmentEnabled: z.boolean().optional(),
  appointmentHoursBefore: z.number().int().min(1).max(168).optional(),
  appointmentSecondEnabled: z.boolean().optional(),
  appointmentSecondHoursBefore: z.number().int().min(1).max(48).optional(),
  deliveryEnabled: z.boolean().optional(),
  deliveryHoursBefore: z.number().int().min(1).max(168).optional(),
  deadlineEnabled: z.boolean().optional(),
  deadlineHoursBefore: z.number().int().min(1).max(336).optional(),
});

function buildTokenData(botToken: string | undefined) {
  if (!botToken) return {};
  const { encrypted, iv, tag } = encryptBotToken(botToken);
  return {
    botTokenEncrypted: encrypted,
    botTokenIv: iv,
    botTokenTag: tag,
  };
}

export default async function businessRoutes(app: FastifyInstance) {
  app.get('/business', { preHandler: authenticate }, async (request, reply) => {
    const business = await prisma.business.findUnique({
      where: { ownerId: request.user.userId },
      select: SAFE_BUSINESS_SELECT,
    });
    if (!business) return sendError(reply, 404, 'Business not found. Complete onboarding first.');
    return reply.send(business);
  });

  app.post('/business', { preHandler: authenticate }, async (request, reply) => {
    const existing = await prisma.business.findUnique({
      where: { ownerId: request.user.userId },
    });
    if (existing) return sendError(reply, 409, 'Business already exists for this account');

    const parsed = createBusinessBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, ...rest } = parsed.data;

    const business = await prisma.business.create({
      data: {
        ...rest,
        ...buildTokenData(botToken),
        ownerId: request.user.userId,
      },
      select: SAFE_BUSINESS_SELECT,
    });
    return reply.status(201).send(business);
  });

  app.patch('/business', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = updateBusinessBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, ...rest } = parsed.data;

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...rest,
        ...buildTokenData(botToken),
      },
      select: SAFE_BUSINESS_SELECT,
    });
    return reply.send(updated);
  });

  app.patch('/business/payment', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = updatePaymentBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: parsed.data,
    });
    return reply.send({ cardNumber: updated.cardNumber, cardBank: updated.cardBank });
  });

  app.patch('/business/fcm-token', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = z.object({ fcmToken: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    await prisma.business.update({
      where: { id: business.id },
      data: { fcmToken: parsed.data.fcmToken },
    });
    return reply.status(204).send();
  });

  app.get('/business/bot', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    if (!business.botUsername) {
      return sendError(reply, 404, 'Bot not configured yet. Set botUsername first.');
    }

    return reply.send({
      botUsername: business.botUsername,
      botLink: `https://t.me/${business.botUsername}`,
    });
  });

  // POST /business/calendar-token
  // Generates a new calendar token (or regenerates the existing one)
  app.post('/business/calendar-token', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const newToken = generateCalendarToken();

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: { calendarToken: newToken },
      select: { calendarToken: true },
    });

    return reply.send({ calendarToken: updated.calendarToken });
  });

  // DELETE /business/calendar-token
  // Disables calendar sync by removing the token
  app.delete('/business/calendar-token', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    await prisma.business.update({
      where: { id: business.id },
      data: { calendarToken: null },
    });

    return reply.send({ success: true });
  });

  // GET /business/reminder-settings
  // Owner reminder settings, merged with defaults for any missing keys.
  app.get('/business/reminder-settings', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    return reply.send(mergeReminderSettings(business.reminderSettings));
  });

  // PATCH /business/reminder-settings
  // Partial update — merges the provided keys onto the stored settings.
  app.patch('/business/reminder-settings', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = reminderSettingsSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const merged = {
      ...mergeReminderSettings(business.reminderSettings),
      ...parsed.data,
    };

    await prisma.business.update({
      where: { id: business.id },
      data: { reminderSettings: merged },
    });

    return reply.send(merged);
  });
}
