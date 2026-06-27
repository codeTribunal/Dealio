import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';

const createBlockedSlotBody = z
  .object({
    staffId: z.string().optional(), // omitted/null = whole-business block
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    reason: z.string().max(500).optional(),
  })
  .refine((b) => new Date(b.endTime).getTime() > new Date(b.startTime).getTime(), {
    message: 'endTime must be after startTime',
  });

export default async function blockedSlotRoutes(app: FastifyInstance) {
  // GET /blocked-slots?from=&to=&staffId=
  app.get('/blocked-slots', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const query = request.query as Record<string, string>;
    const where: Record<string, unknown> = { businessId: business.id };

    if (query.staffId) where.staffId = query.staffId;
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      // Overlap semantics: a block is in range if it starts before `to`
      // and ends after `from`.
      if (query.to) where.startTime = { lt: new Date(query.to) };
      if (query.from) range.gt = new Date(query.from);
      if (query.from) where.endTime = range;
    }

    const slots = await prisma.blockedSlot.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { staff: { select: { id: true, name: true } } },
    });
    return reply.send(slots);
  });

  // POST /blocked-slots
  app.post('/blocked-slots', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const parsed = createBlockedSlotBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { staffId, startTime, endTime, reason } = parsed.data;

    // Tenant isolation: a per-staff block must reference this business's staff.
    if (staffId) {
      const staff = await prisma.staff.findFirst({
        where: { id: staffId, businessId: business.id, deletedAt: null },
      });
      if (!staff) return sendError(reply, 404, 'Staff member not found');
    }

    const slot = await prisma.blockedSlot.create({
      data: {
        businessId: business.id,
        staffId: staffId ?? null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason: reason ?? null,
      },
      include: { staff: { select: { id: true, name: true } } },
    });
    return reply.status(201).send(slot);
  });

  // DELETE /blocked-slots/:id
  app.delete('/blocked-slots/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.blockedSlot.findFirst({
      where: { id, businessId: business.id },
    });
    if (!existing) return sendError(reply, 404, 'Blocked slot not found');

    await prisma.blockedSlot.delete({ where: { id } });
    return reply.status(204).send();
  });
}
