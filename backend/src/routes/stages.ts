import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';

const createStageBody = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366F1'),
  order: z.number().int().min(0).default(0),
});

const updateStageBody = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  order: z.number().int().min(0).optional(),
});

const setCustomerStageBody = z.object({
  stageId: z.string().nullable(),
});

export default async function stageRoutes(app: FastifyInstance) {
  // ── List stages ────────────────────────────────────────────────
  app.get('/stages', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const stages = await prisma.customerStage.findMany({
      where: { businessId: business.id, deletedAt: null },
      orderBy: { order: 'asc' },
    });
    return reply.send(stages);
  });

  // ── Create stage ───────────────────────────────────────────────
  app.post('/stages', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = createStageBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const stage = await prisma.customerStage.create({
      data: {
        businessId: business.id,
        name: parsed.data.name,
        color: parsed.data.color,
        order: parsed.data.order,
      },
    });
    return reply.status(201).send(stage);
  });

  // ── Update stage ───────────────────────────────────────────────
  app.patch('/stages/:stageId', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { stageId } = request.params as { stageId: string };
    const stage = await prisma.customerStage.findFirst({
      where: { id: stageId, businessId: business.id, deletedAt: null },
    });
    if (!stage) return sendError(reply, 404, 'Stage not found');

    const parsed = updateStageBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const updated = await prisma.customerStage.update({
      where: { id: stageId },
      data: parsed.data,
    });
    return reply.send(updated);
  });

  // ── Delete stage (soft delete) ─────────────────────────────────
  app.delete('/stages/:stageId', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { stageId } = request.params as { stageId: string };
    const stage = await prisma.customerStage.findFirst({
      where: { id: stageId, businessId: business.id, deletedAt: null },
    });
    if (!stage) return sendError(reply, 404, 'Stage not found');

    // Clear stage from any customers currently in it, then soft-delete
    await prisma.$transaction([
      prisma.customer.updateMany({
        where: { businessId: business.id, currentStageId: stageId },
        data: { currentStageId: null },
      }),
      prisma.customerStage.update({
        where: { id: stageId },
        data: { deletedAt: new Date() },
      }),
    ]);
    return reply.status(204).send();
  });

  // ── Set a customer's stage ─────────────────────────────────────
  app.patch('/customers/:customerId/stage', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { customerId } = request.params as { customerId: string };
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: business.id, deletedAt: null },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    const parsed = setCustomerStageBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    // If stageId provided, verify it belongs to this business
    if (parsed.data.stageId !== null) {
      const stage = await prisma.customerStage.findFirst({
        where: { id: parsed.data.stageId, businessId: business.id, deletedAt: null },
      });
      if (!stage) return sendError(reply, 404, 'Stage not found');
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { currentStageId: parsed.data.stageId },
      include: { currentStage: true },
    });
    return reply.send({ id: updated.id, currentStage: updated.currentStage });
  });
}
