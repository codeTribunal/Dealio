import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';

const createQuestionBody = z.object({
  question: z.string().min(1).max(500),
  required: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

const updateQuestionBody = z.object({
  question: z.string().min(1).max(500).optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export default async function checkoutQuestionRoutes(app: FastifyInstance) {
  // ── List checkout questions ────────────────────────────────────
  app.get('/checkout-questions', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const questions = await prisma.checkoutQuestion.findMany({
      where: { businessId: business.id, deletedAt: null },
      orderBy: { order: 'asc' },
    });
    return reply.send(questions);
  });

  // ── Create checkout question ───────────────────────────────────
  app.post('/checkout-questions', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const parsed = createQuestionBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const question = await prisma.checkoutQuestion.create({
      data: {
        businessId: business.id,
        question: parsed.data.question,
        required: parsed.data.required,
        order: parsed.data.order,
      },
    });
    return reply.status(201).send(question);
  });

  // ── Update checkout question ───────────────────────────────────
  app.patch('/checkout-questions/:questionId', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { questionId } = request.params as { questionId: string };
    const existing = await prisma.checkoutQuestion.findFirst({
      where: { id: questionId, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Question not found');

    const parsed = updateQuestionBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const updated = await prisma.checkoutQuestion.update({
      where: { id: questionId },
      data: parsed.data,
    });
    return reply.send(updated);
  });

  // ── Delete checkout question (soft delete) ─────────────────────
  app.delete('/checkout-questions/:questionId', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { questionId } = request.params as { questionId: string };
    const existing = await prisma.checkoutQuestion.findFirst({
      where: { id: questionId, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Question not found');

    await prisma.checkoutQuestion.update({
      where: { id: questionId },
      data: { deletedAt: new Date() },
    });
    return reply.status(204).send();
  });
}
