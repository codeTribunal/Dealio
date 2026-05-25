import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';

const createServiceBody = z.object({
  name: z.string().min(1).max(200),
  durationMinutes: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  staffIds: z.array(z.string()).optional(),
});

const updateServiceBody = z.object({
  name: z.string().min(1).max(200).optional(),
  durationMinutes: z.number().int().positive().optional(),
  price: z.number().int().nonnegative().optional(),
  staffIds: z.array(z.string()).optional(),
});

const serviceInclude = {
  staffServices: {
    include: {
      staff: { select: { id: true, name: true } },
    },
  },
} as const;

export default async function serviceRoutes(app: FastifyInstance) {
  app.get('/services', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const services = await prisma.service.findMany({
      where: { businessId: business.id, deletedAt: null },
      include: serviceInclude,
      orderBy: { createdAt: 'asc' },
    });
    return reply.send(services);
  });

  app.post('/services', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = createServiceBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { staffIds, ...serviceData } = parsed.data;

    if (staffIds && staffIds.length > 0) {
      const staffCount = await prisma.staff.count({
        where: { id: { in: staffIds }, businessId: business.id, deletedAt: null },
      });
      if (staffCount !== staffIds.length) {
        return sendError(reply, 400, 'One or more staff members not found');
      }
    }

    const service = await prisma.service.create({
      data: {
        ...serviceData,
        businessId: business.id,
        ...(staffIds && staffIds.length > 0
          ? {
              staffServices: {
                create: staffIds.map((staffId) => ({ staffId })),
              },
            }
          : {}),
      },
      include: serviceInclude,
    });
    return reply.status(201).send(service);
  });

  app.patch('/services/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.service.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Service not found');

    const parsed = updateServiceBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { staffIds, ...serviceData } = parsed.data;

    if (staffIds !== undefined) {
      if (staffIds.length > 0) {
        const staffCount = await prisma.staff.count({
          where: { id: { in: staffIds }, businessId: business.id, deletedAt: null },
        });
        if (staffCount !== staffIds.length) {
          return sendError(reply, 400, 'One or more staff members not found');
        }
      }
      // Replace staff assignments
      await prisma.staffService.deleteMany({ where: { serviceId: id } });
      if (staffIds.length > 0) {
        await prisma.staffService.createMany({
          data: staffIds.map((staffId) => ({ staffId, serviceId: id })),
        });
      }
    }

    const updated = await prisma.service.update({
      where: { id },
      data: serviceData,
      include: serviceInclude,
    });
    return reply.send(updated);
  });

  app.patch('/services/:id/toggle', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.service.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Service not found');

    const updated = await prisma.service.update({
      where: { id },
      data: { active: !existing.active },
    });
    return reply.send({ id: updated.id, active: updated.active });
  });
}
