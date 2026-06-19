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
  // Single mode (scalar). PRODUCTS disabled — only SERVICES/FREELANCE accepted.
  mode: z.enum(['SERVICES', 'FREELANCE']),
  language: z.enum(['UZBEK', 'RUSSIAN', 'ENGLISH']).optional(),
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
const dayIntervalsSchema = z
  .array(dayWindowSchema)
  .refine(
    (intervals) => {
      const sorted = [...intervals].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start < sorted[i - 1].end) return false; // overlapping intervals
      }
      return true;
    },
    { message: 'Working hour intervals must not overlap' },
  );
const workingHoursSchema = z.record(
  z.enum(['0', '1', '2', '3', '4', '5', '6']),
  // Array of intervals (new) | single window (legacy) | null (closed).
  z.union([dayIntervalsSchema, dayWindowSchema, z.null()]),
);

const updateBusinessBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  // Single mode (scalar). PRODUCTS disabled — only SERVICES/FREELANCE accepted.
  mode: z.enum(['SERVICES', 'FREELANCE']).optional(),
  language: z.enum(['UZBEK', 'RUSSIAN', 'ENGLISH']).optional(),
  workingHours: workingHoursSchema.optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  botToken: z.string().optional(),
  botUsername: z.string().optional(),
  ownerTelegramChatId: z.string().optional(),
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

const BOT_TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]{35,}$/;
const updateBotTokenBody = z.object({
  botToken: z.string().regex(BOT_TOKEN_REGEX, 'Invalid bot token format'),
});

/** Authoritative bot identity check via Telegram getMe. */
async function telegramGetMe(token: string): Promise<{ ok: boolean; username?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as { ok: boolean; result?: { username: string } };
    if (!data.ok) return { ok: false };
    return { ok: true, username: data.result?.username };
  } catch {
    return { ok: false };
  }
}

/**
 * Hot-swap a running bot with its newly-stored token. start-bot is a no-op when
 * the bot is already running, so a token change only takes effect after a stop;
 * start-bot then re-fetches the (new) token from the DB. Best-effort.
 */
async function restartBusinessBot(businessId: string): Promise<void> {
  const botServiceUrl = process.env.BOT_SERVICE_URL ?? 'http://localhost:3002';
  const headers = {
    'Content-Type': 'application/json',
    'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '',
  };
  const body = JSON.stringify({ businessId });
  await fetch(`${botServiceUrl}/internal/stop-bot`, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(10_000),
  });
  await fetch(`${botServiceUrl}/internal/start-bot`, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(10_000),
  });
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

  // PATCH /business/bot-token
  // Change the Telegram bot token (e.g. after revoking/replacing the bot).
  // Re-verifies with Telegram, re-derives the username, and hot-swaps the bot.
  app.patch('/business/bot-token', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = updateBotTokenBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const tg = await telegramGetMe(parsed.data.botToken);
    if (!tg.ok || !tg.username) {
      return sendError(reply, 400, 'Invalid bot token. Check and try again.');
    }

    // The bot must not already belong to a different business.
    const taken = await prisma.business.findUnique({ where: { botUsername: tg.username } });
    if (taken && taken.id !== business.id) {
      return sendError(reply, 409, 'This bot is already registered to another business.');
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: { ...buildTokenData(parsed.data.botToken), botUsername: tg.username },
      select: SAFE_BUSINESS_SELECT,
    });

    // Best-effort hot-swap; if the bot service is down it picks up on next restart.
    restartBusinessBot(business.id).catch((err) =>
      app.log.error({ err }, '[business/bot-token] bot restart failed'),
    );

    return reply.send({
      botUsername: updated.botUsername,
      botLink: `https://t.me/${updated.botUsername}`,
    });
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
