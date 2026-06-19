import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, prismaUnscoped } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';
import { computeAvailableSlots, isSlotBookable } from '../services/availability.js';
import { checkAppointmentLimit } from '../middleware/checkLimits.js';
import { softDelete, restore } from '../services/softDelete.js';

const createAppointmentBody = z.object({
  customerId: z.string(),
  serviceId: z.string(),
  staffId: z.string().optional(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
  paymentType: z.enum(['AT_APPOINTMENT', 'IN_ADVANCE']).optional(),
  // Owner override: proceed even though the slot overlaps an existing booking.
  allowConflict: z.boolean().optional(),
});

// Owner edit/reschedule — every field optional; overlap re-check + override.
const updateAppointmentBody = z.object({
  startTime: z.string().datetime().optional(),
  serviceId: z.string().optional(),
  staffId: z.string().nullable().optional(),
  price: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).nullable().optional(),
  paymentType: z.enum(['AT_APPOINTMENT', 'IN_ADVANCE']).optional(),
  status: z.enum(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  allowConflict: z.boolean().optional(),
});

const updateStatusBody = z.object({
  status: z.enum(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
});

const updateNotesBody = z.object({
  notes: z.string().max(2000),
});

const appointmentInclude = {
  customer: { select: { id: true, name: true, phone: true, telegramUsername: true, deletedAt: true } },
  service: { select: { id: true, name: true, durationMinutes: true } },
  staff: { select: { id: true, name: true } },
} as const;

export default async function appointmentRoutes(app: FastifyInstance) {
  app.get('/appointments', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const query = request.query as Record<string, string>;
    const includeDeleted = query.includeDeleted === 'true';
    const db = includeDeleted ? (prismaUnscoped as unknown as typeof prisma) : prisma;
    const where: Record<string, unknown> = { businessId: business.id };
    // Orphan filter ("leave & filter"): default view hides appointments whose
    // customer is soft-deleted (own deletedAt hidden by the extension).
    // "Show deleted" drops both filters via prismaUnscoped.
    if (!includeDeleted) where.customer = { deletedAt: null };

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

    const appointments = await db.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startTime: 'asc' },
    });
    return reply.send(appointments.map((a) => ({ ...a, deleted: a.deletedAt != null })));
  });

  app.post('/appointments', { preHandler: [authenticate, checkAppointmentLimit()] }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = createAppointmentBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { customerId, serviceId, staffId, startTime, notes, paymentType, allowConflict } = parsed.data;

    const [customer, service] = await Promise.all([
      prisma.customer.findFirst({ where: { id: customerId, businessId: business.id, deletedAt: null } }),
      prisma.service.findFirst({ where: { id: serviceId, businessId: business.id, deletedAt: null } }),
    ]);
    if (!customer) return sendError(reply, 404, 'Customer not found');
    if (!service) return sendError(reply, 404, 'Service not found');

    let staff: { id: string; daysOff: Date[] } | null = null;
    if (staffId) {
      staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id, deletedAt: null } });
      if (!staff) return sendError(reply, 404, 'Staff member not found');
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);

    // Owner manual create has a FREE HAND on timing: PAST and OUT_OF_HOURS are
    // allowed (logging history, walk-ins, after-hours). The ONLY guardrail is
    // overlap, and even that is overridable via allowConflict.
    const slotCheck = await isSlotBookable({ business, service, staff, startTime: start });
    if (slotCheck.reason === 'CONFLICT' && allowConflict !== true) {
      return reply.status(409).send({ error: 'APPOINTMENT_CONFLICT', reason: 'CONFLICT' });
    }

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

  // ── Owner EDIT / RESCHEDULE ─────────────────────────────────────
  // Full edit of an existing appointment (time, service, staff, price, notes,
  // payment type, status). Owner free hand: past / out-of-hours allowed; only
  // overlap warns (overridable via allowConflict), and the appointment is
  // self-excluded from the overlap check. businessId-scoped → 404 on foreign id.
  app.patch('/appointments/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.appointment.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Appointment not found');

    const parsed = updateAppointmentBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);
    const body = parsed.data;

    // Effective service (for duration + a default price when the service
    // changes). Reuse the existing one unless the body changes it.
    const effServiceId = body.serviceId ?? existing.serviceId;
    const service = await prisma.service.findFirst({
      where: { id: effServiceId, businessId: business.id, deletedAt: null },
    });
    if (!service) return sendError(reply, 404, 'Service not found');

    // Effective staff (nullable → "Any available").
    let effStaffId: string | null = existing.staffId;
    if (body.staffId !== undefined) effStaffId = body.staffId;
    let staffObj: { id: string; daysOff: Date[] } | null = null;
    if (effStaffId) {
      staffObj = await prisma.staff.findFirst({
        where: { id: effStaffId, businessId: business.id, deletedAt: null },
      });
      if (!staffObj) return sendError(reply, 404, 'Staff member not found');
    }

    const start = body.startTime ? new Date(body.startTime) : existing.startTime;
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);

    // Only re-check overlap when a scheduling-affecting field changes. Past and
    // out-of-hours are allowed; only CONFLICT warns (overridable). The row is
    // self-excluded so it never conflicts with itself on a no-op reschedule.
    const schedulingChanged =
      body.startTime !== undefined || body.serviceId !== undefined || body.staffId !== undefined;
    if (schedulingChanged) {
      const slotCheck = await isSlotBookable({
        business,
        service,
        staff: staffObj,
        startTime: start,
        ignoreAppointmentId: id,
      });
      if (slotCheck.reason === 'CONFLICT' && body.allowConflict !== true) {
        return reply.status(409).send({ error: 'APPOINTMENT_CONFLICT', reason: 'CONFLICT' });
      }
    }

    // Write only what changed. Price: explicit wins; else follow a service
    // change; else leave as-is.
    const data: Record<string, unknown> = {};
    if (schedulingChanged) {
      data.serviceId = effServiceId;
      data.staffId = effStaffId;
      data.startTime = start;
      data.endTime = end;
    }
    if (body.price !== undefined) data.price = body.price;
    else if (body.serviceId !== undefined) data.price = service.price;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.paymentType !== undefined) data.paymentType = body.paymentType;
    if (body.status !== undefined) data.status = body.status;

    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: appointmentInclude,
    });
    return reply.send(updated);
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

  // ── Soft-delete appointment (recoverable) ───────────────────────
  app.delete('/appointments/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const { deleted } = await softDelete('appointment', id, business.id);
    if (!deleted) return sendError(reply, 404, 'Appointment not found');
    return reply.send({ id, deleted: true });
  });

  // ── Restore a soft-deleted appointment ──────────────────────────
  app.post('/appointments/:id/restore', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const { restored } = await restore('appointment', id, business.id);
    if (!restored) return sendError(reply, 404, 'Appointment not found');
    return reply.send({ id, restored: true });
  });
}
