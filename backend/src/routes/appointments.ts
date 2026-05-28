import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';
import { computeAvailableSlots } from '../services/availability.js';
import { checkAppointmentLimit } from '../middleware/checkLimits.js';

const createAppointmentBody = z.object({
  customerId: z.string(),
  serviceId: z.string(),
  staffId: z.string().optional(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
  paymentType: z.enum(['AT_APPOINTMENT', 'IN_ADVANCE']).optional(),
});

const updateStatusBody = z.object({
  status: z.enum(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
});

const updateNotesBody = z.object({
  notes: z.string().max(2000),
});

const appointmentInclude = {
  customer: { select: { id: true, name: true, phone: true, telegramUsername: true } },
  service: { select: { id: true, name: true, durationMinutes: true } },
  staff: { select: { id: true, name: true } },
} as const;

export default async function appointmentRoutes(app: FastifyInstance) {
  app.get('/appointments', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const query = request.query as Record<string, string>;
    const where: Record<string, unknown> = { businessId: business.id, deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.staffId) where.staffId = query.staffId;
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      end.setDate(end.getDate() + 1); // make endDate inclusive
      where.startTime = { gte: start, lt: end };
    } else if (query.date) {
      const day = new Date(query.date);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      where.startTime = { gte: day, lt: next };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startTime: 'asc' },
    });
    return reply.send(appointments);
  });

  app.post('/appointments', { preHandler: [authenticate, checkAppointmentLimit()] }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = createAppointmentBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { customerId, serviceId, staffId, startTime, notes, paymentType } = parsed.data;

    const [customer, service] = await Promise.all([
      prisma.customer.findFirst({ where: { id: customerId, businessId: business.id, deletedAt: null } }),
      prisma.service.findFirst({ where: { id: serviceId, businessId: business.id, deletedAt: null } }),
    ]);
    if (!customer) return sendError(reply, 404, 'Customer not found');
    if (!service) return sendError(reply, 404, 'Service not found');

    if (staffId) {
      const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id, deletedAt: null } });
      if (!staff) return sendError(reply, 404, 'Staff member not found');
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);

    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
        customerId,
        serviceId,
        staffId: staffId ?? null,
        startTime: start,
        endTime: end,
        price: service.price,
        notes: notes ?? null,
        paymentType: paymentType ?? 'AT_APPOINTMENT',
      },
      include: appointmentInclude,
    });
    return reply.status(201).send(appointment);
  });

  app.get('/appointments/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const appointment = await prisma.appointment.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
      include: appointmentInclude,
    });
    if (!appointment) return sendError(reply, 404, 'Appointment not found');
    return reply.send(appointment);
  });

  app.patch('/appointments/:id/status', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.appointment.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Appointment not found');

    const parsed = updateStatusBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: parsed.data.status },
      include: appointmentInclude,
    });
    return reply.send(updated);
  });

  app.patch('/appointments/:id/payment', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.appointment.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Appointment not found');
    if (existing.paymentStatus === 'CONFIRMED') return sendError(reply, 409, 'Payment already confirmed');

    const updated = await prisma.appointment.update({
      where: { id },
      data: { paymentStatus: 'CONFIRMED' },
      include: appointmentInclude,
    });
    return reply.send(updated);
  });

  app.patch('/appointments/:id/notes', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.appointment.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Appointment not found');

    const parsed = updateNotesBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const updated = await prisma.appointment.update({
      where: { id },
      data: { notes: parsed.data.notes },
      include: appointmentInclude,
    });
    return reply.send(updated);
  });

  // GET /availability?serviceId=&staffId=&date=YYYY-MM-DD
  app.get('/availability', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const query = request.query as Record<string, string>;
    if (!query.serviceId || !query.date) {
      return sendError(reply, 400, 'serviceId and date are required');
    }

    const service = await prisma.service.findFirst({
      where: { id: query.serviceId, businessId: business.id, deletedAt: null, active: true },
    });
    if (!service) return sendError(reply, 404, 'Service not found');

    let staff = null;
    if (query.staffId) {
      staff = await prisma.staff.findFirst({
        where: { id: query.staffId, businessId: business.id, deletedAt: null },
      });
      if (!staff) return sendError(reply, 404, 'Staff member not found');
    }

    const slots = await computeAvailableSlots({
      business,
      service,
      staff,
      dateStr: query.date,
    });

    return reply.send(slots);
  });
}
