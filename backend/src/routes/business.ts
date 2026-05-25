import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';

const createBusinessBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  mode: z.array(z.enum(['PRODUCTS', 'SERVICES', 'FREELANCE'])).min(1),
  language: z.enum(['UZBEK', 'RUSSIAN']).optional(),
  cardNumber: z.string().min(16).max(20).optional(),
  cardBank: z.enum(['UZCARD', 'HUMO']).optional(),
  ownerTelegramChatId: z.string().optional(),
  botToken: z.string().optional(),
  botUsername: z.string().optional(),
});

const updateBusinessBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  mode: z.array(z.enum(['PRODUCTS', 'SERVICES', 'FREELANCE'])).min(1).optional(),
  language: z.enum(['UZBEK', 'RUSSIAN']).optional(),
  workingHours: z.record(z.any()).optional(),
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

export default async function businessRoutes(app: FastifyInstance) {
  app.get('/business', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;
    return reply.send(business);
  });

  app.post('/business', { preHandler: authenticate }, async (request, reply) => {
    const existing = await prisma.business.findUnique({
      where: { ownerId: request.user.userId },
    });
    if (existing) return sendError(reply, 409, 'Business already exists for this account');

    const parsed = createBusinessBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const business = await prisma.business.create({
      data: {
        ...parsed.data,
        ownerId: request.user.userId,
      },
    });
    return reply.status(201).send(business);
  });

  app.patch('/business', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = updateBusinessBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: parsed.data,
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
}
