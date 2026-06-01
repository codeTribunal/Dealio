import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';

const workingHoursSchema = z
  .record(
    z.string(),
    z.union([
      z.object({ start: z.string(), end: z.string() }),
      z.null(),
    ]),
  )
  .optional();

// Accepts ISO date strings (date-only "YYYY-MM-DD" or full datetime) and
// coerces them to Date for storage in the DateTime[] column.
const daysOffSchema = z.array(z.coerce.date()).max(366).optional();

const createStaffBody = z.object({
  name: z.string().min(1).max(200),
  telegramHandle: z.string().max(100).optional(),
  workingHours: workingHoursSchema,
  daysOff: daysOffSchema,
  serviceIds: z.array(z.string()).optional(),
});

const updateStaffBody = z.object({
  name: z.string().min(1).max(200).optional(),
  telegramHandle: z.string().max(100).nullable().optional(),
  workingHours: workingHoursSchema,
  daysOff: daysOffSchema,
  serviceIds: z.array(z.string()).optional(),
});

const staffInclude = {
  staffServices: {
    include: {
      service: { select: { id: true, name: true, durationMinutes: true, price: true } },
    },
  },
} as const;

export default async function staffRoutes(app: FastifyInstance) {
  app.get('/staff', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const staff = await prisma.staff.findMany({
      where: { businessId: business.id, deletedAt: null },
      include: staffInclude,
      orderBy: { createdAt: 'asc' },
    });
    return reply.send(staff);
  });

  app.post('/staff', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = createStaffBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { serviceIds, workingHours, daysOff, ...staffData } = parsed.data;

    if (serviceIds && serviceIds.length > 0) {
      const serviceCount = await prisma.service.count({
        where: { id: { in: serviceIds }, businessId: business.id, deletedAt: null },
      });
      if (serviceCount !== serviceIds.length) {
        return sendError(reply, 400, 'One or more services not found');
      }
    }

    const member = await prisma.staff.create({
      data: {
        ...staffData,
        workingHours: workingHours ?? undefined,
        ...(daysOff !== undefined ? { daysOff } : {}),
        businessId: business.id,
        ...(serviceIds && serviceIds.length > 0
          ? {
              staffServices: {
                create: serviceIds.map((serviceId) => ({ serviceId })),
              },
            }
          : {}),
      },
      include: staffInclude,
    });
    return reply.status(201).send(member);
  });

  app.patch('/staff/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.staff.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Staff member not found');

    const parsed = updateStaffBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { serviceIds, workingHours, daysOff, ...staffData } = parsed.data;

    if (serviceIds !== undefined) {
      if (serviceIds.length > 0) {
        const serviceCount = await prisma.service.count({
          where: { id: { in: serviceIds }, businessId: business.id, deletedAt: null },
        });
        if (serviceCount !== serviceIds.length) {
          return sendError(reply, 400, 'One or more services not found');
        }
      }
      await prisma.staffService.deleteMany({ where: { staffId: id } });
      if (serviceIds.length > 0) {
        await prisma.staffService.createMany({
          data: serviceIds.map((serviceId) => ({ staffId: id, serviceId })),
        });
      }
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        ...staffData,
        ...(workingHours !== undefined ? { workingHours } : {}),
        ...(daysOff !== undefined ? { daysOff } : {}),
      },
      include: staffInclude,
    });
    return reply.send(updated);
  });

  app.delete('/staff/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.staff.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Staff member not found');

    await prisma.staff.update({ where: { id }, data: { deletedAt: new Date() } });
    return reply.status(204).send();
  });
}
