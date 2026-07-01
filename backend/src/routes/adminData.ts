import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, prismaUnscoped } from '../lib/prisma.js';
import { sendError } from '../lib/errors.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/adminAuth.js';
import { writeAuditLog } from '../lib/audit.js';
import { softDelete, restore, type BusinessScopedSoftDeletable } from '../services/softDelete.js';
import { anonymizeCustomer, ANONYMIZE_SCRUBBED_FIELDS } from '../services/anonymizeCustomer.js';

/**
 * Admin tenant data-management (Phase B).
 *
 * VIEW / EDIT / SOFT-DELETE / RESTORE any business's customers, orders,
 * appointments and projects. Hard-delete / erasure is Phase C.
 *
 * Tenant safety: collection routes scope to the :id business-id in the path;
 * single-record routes resolve the owning businessId from the record itself
 * (admin has no business of its own). No query ever merges two businesses.
 *
 * Role gating (see report):
 *   - read + edit  → requireAdmin   (support can view and fix data)
 *   - delete + restore → requireSuperAdmin (destructive intent, even if
 *     recoverable; mirrors the existing super-admin gate on suspend/plan)
 *
 * `includeDeleted=true` (admin-only) switches reads to `prismaUnscoped` so the
 * soft-delete extension is bypassed and deleted rows are returned, each tagged
 * with a `deleted` flag. Default excludes deleted. Single-record detail always
 * uses the unscoped client so an admin can open a deleted record directly.
 */

// The unextended client typed as the extended one — same delegates, identical
// runtime behaviour for writes/by-id reads, but returns soft-deleted rows.
const unscoped = prismaUnscoped as unknown as typeof prisma;

function readClient(includeDeleted: boolean): typeof prisma {
  return includeDeleted ? unscoped : prisma;
}

function parsePagination(query: Record<string, string>) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function wantsDeleted(query: Record<string, string>): boolean {
  return query.includeDeleted === 'true' || query.includeDeleted === '1';
}

// Tag a row with a `deleted` boolean derived from deletedAt.
function flag<T extends { deletedAt: Date | null }>(row: T): T & { deleted: boolean } {
  return { ...row, deleted: row.deletedAt != null };
}

// Record which fields actually changed, for the audit log.
function diffChanges(
  before: Record<string, unknown>,
  applied: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(applied)) {
    const b = before[key] instanceof Date ? (before[key] as Date).toISOString() : before[key];
    const a = applied[key] instanceof Date ? (applied[key] as Date).toISOString() : applied[key];
    if (JSON.stringify(b ?? null) !== JSON.stringify(a ?? null)) {
      changes[key] = { from: before[key] ?? null, to: applied[key] ?? null };
    }
  }
  return changes;
}

// ── Edit schemas — mirror exactly what the owner can edit, no identity fields ──

const editCustomerBody = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).nullable().optional(),
  birthday: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  customFields: z.record(z.string()).nullable().optional(),
});

const editOrderBody = z.object({
  orderStatus: z.enum(['NEW', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAYMENT_RECEIVED', 'CONFIRMED']).optional(),
  internalNotes: z.string().max(2000).nullable().optional(),
});

const editAppointmentBody = z.object({
  status: z.enum(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAYMENT_RECEIVED', 'CONFIRMED']).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const editProjectBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  totalPrice: z.number().int().nonnegative().optional(),
  startDate: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  paymentTerms: z.string().max(500).nullable().optional(),
  status: z.enum(['PROPOSAL_SENT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED']).optional(),
});

export default async function adminDataRoutes(app: FastifyInstance) {
  // ════════════════════════════════════════════════════════════════════════
  // READ — collections under a business
  // ════════════════════════════════════════════════════════════════════════

  // GET /admin/businesses/:id/customers
  app.get('/admin/businesses/:id/customers', { preHandler: requireAdmin }, async (request, reply) => {
    const { id: businessId } = request.params as { id: string };
    const query = request.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(query);
    const db = readClient(wantsDeleted(query));

    const search = query.search?.trim();
    const where: Record<string, unknown> = {
      businessId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { telegramUsername: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.customer.findMany({
        where,
        select: {
          id: true, name: true, phone: true, telegramUsername: true,
          createdAt: true, lastInteractionAt: true, deletedAt: true, anonymizedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.customer.count({ where }),
    ]);

    return reply.send({ items: items.map(flag), total, page, limit });
  });

  // GET /admin/businesses/:id/orders
  app.get('/admin/businesses/:id/orders', { preHandler: requireAdmin }, async (request, reply) => {
    const { id: businessId } = request.params as { id: string };
    const query = request.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(query);
    const db = readClient(wantsDeleted(query));

    const where: Record<string, unknown> = { businessId };
    if (query.status) where.orderStatus = query.status;
    const search = query.search?.trim();
    if (search) {
      const num = parseInt(search, 10);
      const or: unknown[] = [{ customer: { name: { contains: search, mode: 'insensitive' } } }];
      if (!isNaN(num)) or.push({ orderNumber: num });
      where.OR = or;
    }

    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        select: {
          id: true, orderNumber: true, total: true, orderStatus: true,
          paymentStatus: true, createdAt: true, deletedAt: true,
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
    ]);

    return reply.send({ items: items.map(flag), total, page, limit });
  });

  // GET /admin/businesses/:id/appointments
  app.get('/admin/businesses/:id/appointments', { preHandler: requireAdmin }, async (request, reply) => {
    const { id: businessId } = request.params as { id: string };
    const query = request.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(query);
    const db = readClient(wantsDeleted(query));

    const where: Record<string, unknown> = { businessId };
    if (query.status) where.status = query.status;
    if (query.date) {
      const day = new Date(query.date);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      where.startTime = { gte: day, lt: next };
    }

    const [items, total] = await Promise.all([
      db.appointment.findMany({
        where,
        select: {
          id: true, startTime: true, endTime: true, status: true, price: true,
          paymentStatus: true, createdAt: true, deletedAt: true,
          customer: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
          staff: { select: { id: true, name: true } },
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      db.appointment.count({ where }),
    ]);

    return reply.send({ items: items.map(flag), total, page, limit });
  });

  // GET /admin/businesses/:id/projects
  app.get('/admin/businesses/:id/projects', { preHandler: requireAdmin }, async (request, reply) => {
    const { id: businessId } = request.params as { id: string };
    const query = request.query as Record<string, string>;
    const { page, limit, skip } = parsePagination(query);
    const db = readClient(wantsDeleted(query));

    const where: Record<string, unknown> = { businessId };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      db.project.findMany({
        where,
        select: {
          id: true, name: true, totalPrice: true, status: true,
          deadline: true, createdAt: true, deletedAt: true,
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.project.count({ where }),
    ]);

    return reply.send({ items: items.map(flag), total, page, limit });
  });

  // ════════════════════════════════════════════════════════════════════════
  // READ — single record detail (always viewable, even if deleted)
  // ════════════════════════════════════════════════════════════════════════

  // GET /admin/customers/:id
  app.get('/admin/customers/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as Record<string, string>;
    const db = readClient(wantsDeleted(query));

    const customer = await unscoped.customer.findUnique({
      where: { id },
      select: {
        id: true, businessId: true, name: true, phone: true,
        telegramUserId: true, telegramUsername: true, birthday: true,
        notes: true, customFields: true, languagePreference: true,
        createdAt: true, lastInteractionAt: true, deletedAt: true, anonymizedAt: true,
      },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    const [orders, appointments, projects] = await Promise.all([
      db.order.findMany({
        where: { customerId: id, businessId: customer.businessId },
        select: { id: true, orderNumber: true, total: true, orderStatus: true, paymentStatus: true, createdAt: true, deletedAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.appointment.findMany({
        where: { customerId: id, businessId: customer.businessId },
        select: { id: true, startTime: true, status: true, price: true, deletedAt: true, service: { select: { name: true } } },
        orderBy: { startTime: 'desc' },
        take: 50,
      }),
      db.project.findMany({
        where: { customerId: id, businessId: customer.businessId },
        select: { id: true, name: true, totalPrice: true, status: true, deadline: true, createdAt: true, deletedAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return reply.send({
      ...flag(customer),
      orders: orders.map(flag),
      appointments: appointments.map(flag),
      projects: projects.map(flag),
    });
  });

  // GET /admin/orders/:id
  app.get('/admin/orders/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await unscoped.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, telegramUsername: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    if (!order) return sendError(reply, 404, 'Order not found');
    // Never return the raw Telegram file_id or the internal proof URL to any
    // client (same rule as the owner order serializer). Expose only a boolean;
    // admins view the image via the authenticated proxy, not the raw pointer.
    const { paymentProofFileId, paymentProofUrl, ...safeOrder } = order;
    void paymentProofUrl; // intentionally omitted from the response
    return reply.send(flag({ ...safeOrder, hasPaymentProof: paymentProofFileId != null }));
  });

  // GET /admin/appointments/:id
  app.get('/admin/appointments/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const appointment = await unscoped.appointment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, telegramUsername: true } },
        service: { select: { id: true, name: true, durationMinutes: true } },
        staff: { select: { id: true, name: true } },
      },
    });
    if (!appointment) return sendError(reply, 404, 'Appointment not found');
    return reply.send(flag(appointment));
  });

  // GET /admin/projects/:id
  app.get('/admin/projects/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await unscoped.project.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, telegramUsername: true } },
        milestones: { orderBy: { createdAt: 'asc' } },
        invoices: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!project) return sendError(reply, 404, 'Project not found');
    return reply.send(flag(project));
  });

  // ════════════════════════════════════════════════════════════════════════
  // EDIT — mirror owner-editable fields only (no businessId / identity fields)
  // ════════════════════════════════════════════════════════════════════════

  // PATCH /admin/customers/:id
  app.patch('/admin/customers/:id', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await unscoped.customer.findUnique({
      where: { id },
      select: { id: true, businessId: true, name: true, phone: true, birthday: true, notes: true, customFields: true },
    });
    if (!existing) return sendError(reply, 404, 'Customer not found');

    const parsed = editCustomerBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
    if (parsed.data.birthday !== undefined) data.birthday = parsed.data.birthday ? new Date(parsed.data.birthday) : null;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.customFields !== undefined) data.customFields = parsed.data.customFields;

    const updated = await unscoped.customer.update({ where: { id }, data });
    await writeAuditLog({
      adminUserId: request.adminUser!.id,
      action: 'EDIT_TENANT_RECORD',
      targetType: 'Customer',
      targetId: id,
      metadata: { businessId: existing.businessId, changes: diffChanges(existing, data) },
      ipAddress: request.ip,
    });
    return reply.send(flag(updated));
  });

  // PATCH /admin/orders/:id
  app.patch('/admin/orders/:id', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await unscoped.order.findUnique({
      where: { id },
      select: { id: true, businessId: true, orderStatus: true, paymentStatus: true, internalNotes: true },
    });
    if (!existing) return sendError(reply, 404, 'Order not found');

    const parsed = editOrderBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const data: Record<string, unknown> = {};
    if (parsed.data.orderStatus !== undefined) data.orderStatus = parsed.data.orderStatus;
    if (parsed.data.paymentStatus !== undefined) data.paymentStatus = parsed.data.paymentStatus;
    if (parsed.data.internalNotes !== undefined) data.internalNotes = parsed.data.internalNotes;

    const updated = await unscoped.order.update({ where: { id }, data });
    await writeAuditLog({
      adminUserId: request.adminUser!.id,
      action: 'EDIT_TENANT_RECORD',
      targetType: 'Order',
      targetId: id,
      metadata: { businessId: existing.businessId, changes: diffChanges(existing, data) },
      ipAddress: request.ip,
    });
    return reply.send(flag(updated));
  });

  // PATCH /admin/appointments/:id
  app.patch('/admin/appointments/:id', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await unscoped.appointment.findUnique({
      where: { id },
      select: { id: true, businessId: true, status: true, paymentStatus: true, notes: true },
    });
    if (!existing) return sendError(reply, 404, 'Appointment not found');

    const parsed = editAppointmentBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const data: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.paymentStatus !== undefined) data.paymentStatus = parsed.data.paymentStatus;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

    const updated = await unscoped.appointment.update({ where: { id }, data });
    await writeAuditLog({
      adminUserId: request.adminUser!.id,
      action: 'EDIT_TENANT_RECORD',
      targetType: 'Appointment',
      targetId: id,
      metadata: { businessId: existing.businessId, changes: diffChanges(existing, data) },
      ipAddress: request.ip,
    });
    return reply.send(flag(updated));
  });

  // PATCH /admin/projects/:id
  app.patch('/admin/projects/:id', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await unscoped.project.findUnique({
      where: { id },
      select: { id: true, businessId: true, name: true, description: true, totalPrice: true, startDate: true, deadline: true, paymentTerms: true, status: true },
    });
    if (!existing) return sendError(reply, 404, 'Project not found');

    const parsed = editProjectBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.totalPrice !== undefined) data.totalPrice = parsed.data.totalPrice;
    if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
    if (parsed.data.deadline !== undefined) data.deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
    if (parsed.data.paymentTerms !== undefined) data.paymentTerms = parsed.data.paymentTerms;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;

    const updated = await unscoped.project.update({ where: { id }, data });
    await writeAuditLog({
      adminUserId: request.adminUser!.id,
      action: 'EDIT_TENANT_RECORD',
      targetType: 'Project',
      targetId: id,
      metadata: { businessId: existing.businessId, changes: diffChanges(existing, data) },
      ipAddress: request.ip,
    });
    return reply.send(flag(updated));
  });

  // ════════════════════════════════════════════════════════════════════════
  // SOFT-DELETE + RESTORE (super-admin only)
  // ════════════════════════════════════════════════════════════════════════

  const SOFT_DELETE_ENTITIES: Array<{
    url: string;
    targetType: string;
    model: BusinessScopedSoftDeletable;
    find: (id: string) => Promise<{ businessId: string } | null>;
  }> = [
    { url: 'customers', targetType: 'Customer', model: 'customer', find: (id) => prismaUnscoped.customer.findUnique({ where: { id }, select: { businessId: true } }) },
    { url: 'orders', targetType: 'Order', model: 'order', find: (id) => prismaUnscoped.order.findUnique({ where: { id }, select: { businessId: true } }) },
    { url: 'appointments', targetType: 'Appointment', model: 'appointment', find: (id) => prismaUnscoped.appointment.findUnique({ where: { id }, select: { businessId: true } }) },
    { url: 'projects', targetType: 'Project', model: 'project', find: (id) => prismaUnscoped.project.findUnique({ where: { id }, select: { businessId: true } }) },
  ];

  for (const entity of SOFT_DELETE_ENTITIES) {
    // DELETE /admin/{entity}/:id  → soft-delete (recoverable)
    app.delete(`/admin/${entity.url}/:id`, { preHandler: requireSuperAdmin }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const rec = await entity.find(id);
      if (!rec) return sendError(reply, 404, `${entity.targetType} not found`);

      const { deleted } = await softDelete(entity.model, id, rec.businessId);
      if (deleted) {
        await writeAuditLog({
          adminUserId: request.adminUser!.id,
          action: `SOFT_DELETE_${entity.targetType.toUpperCase()}`,
          targetType: entity.targetType,
          targetId: id,
          metadata: { businessId: rec.businessId },
          ipAddress: request.ip,
        });
      }
      return reply.send({ id, deleted });
    });

    // POST /admin/{entity}/:id/restore  → clear deletedAt
    app.post(`/admin/${entity.url}/:id/restore`, { preHandler: requireSuperAdmin }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const rec = await entity.find(id);
      if (!rec) return sendError(reply, 404, `${entity.targetType} not found`);

      const { restored } = await restore(entity.model, id, rec.businessId);
      if (restored) {
        await writeAuditLog({
          adminUserId: request.adminUser!.id,
          action: `RESTORE_${entity.targetType.toUpperCase()}`,
          targetType: entity.targetType,
          targetId: id,
          metadata: { businessId: rec.businessId },
          ipAddress: request.ip,
        });
      }
      return reply.send({ id, restored });
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // ERASURE — irreversible, super-admin only (Phase C). Distinct from the
  // recoverable soft-delete above.
  // ════════════════════════════════════════════════════════════════════════

  // POST /admin/customers/:id/anonymize
  // De-identify a customer (GDPR "delete my info") while KEEPING the business's
  // de-identified transactional records. Irreversible — no restore.
  app.post('/admin/customers/:id/anonymize', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await prismaUnscoped.customer.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    // Shared, single-source scrub (also used by the bot /deletedata erase).
    await anonymizeCustomer(id);

    await writeAuditLog({
      adminUserId: request.adminUser!.id,
      action: 'ANONYMIZE_CUSTOMER',
      targetType: 'Customer',
      targetId: id,
      metadata: { businessId: customer.businessId, scrubbedFields: ANONYMIZE_SCRUBBED_FIELDS },
      ipAddress: request.ip,
    });

    return reply.send({ id, anonymized: true, scrubbedFields: ANONYMIZE_SCRUBBED_FIELDS });
  });

  // POST /admin/businesses/:id/erase
  // True hard-delete of a whole business/account: an ordered, all-or-nothing
  // cascade (children → parents) inside one transaction. Irreversible. The
  // AuditLog (which references AdminUser, not Business/User) is NOT touched, so
  // the compliance record — including the ERASE_BUSINESS row written below —
  // survives the erasure.
  app.post('/admin/businesses/:id/erase', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id: businessId } = request.params as { id: string };

    const business = await prismaUnscoped.business.findUnique({
      where: { id: businessId },
      select: { id: true, owner: { select: { id: true, phone: true } } },
    });
    if (!business) return sendError(reply, 404, 'Business not found');

    const ownerId = business.owner.id;
    const ownerPhone = business.owner.phone;

    let tableCounts: Record<string, number>;
    try {
      tableCounts = await prismaUnscoped.$transaction(
        async (tx) => {
          const counts: Record<string, number> = {};
          // ── children first (FK-safe), scoped to this business ──────────────
          counts.orderItems = (await tx.orderItem.deleteMany({ where: { order: { businessId } } })).count;
          counts.invoices = (await tx.invoice.deleteMany({ where: { project: { businessId } } })).count;
          counts.milestones = (await tx.milestone.deleteMany({ where: { project: { businessId } } })).count;
          counts.orders = (await tx.order.deleteMany({ where: { businessId } })).count;
          counts.appointments = (await tx.appointment.deleteMany({ where: { businessId } })).count;
          counts.projects = (await tx.project.deleteMany({ where: { businessId } })).count;
          counts.staffServices = (await tx.staffService.deleteMany({ where: { staff: { businessId } } })).count;
          counts.blockedSlots = (await tx.blockedSlot.deleteMany({ where: { businessId } })).count;
          counts.customerFieldValues = (await tx.customerFieldValue.deleteMany({ where: { customer: { businessId } } })).count;
          counts.customerTags = (await tx.customerTag.deleteMany({ where: { businessId } })).count;
          counts.reminders = (await tx.reminder.deleteMany({ where: { businessId } })).count;
          counts.sentReminders = (await tx.sentReminder.deleteMany({ where: { businessId } })).count;
          counts.deviceTokens = (await tx.deviceToken.deleteMany({ where: { businessId } })).count;
          counts.usageLogs = (await tx.usageLog.deleteMany({ where: { businessId } })).count;
          counts.checkoutQuestions = (await tx.checkoutQuestion.deleteMany({ where: { businessId } })).count;
          counts.businessCustomFields = (await tx.businessCustomField.deleteMany({ where: { businessId } })).count;
          // Customer holds the FK to CustomerStage (currentStageId) → delete
          // customers before stages.
          counts.customers = (await tx.customer.deleteMany({ where: { businessId } })).count;
          counts.customerStages = (await tx.customerStage.deleteMany({ where: { businessId } })).count;
          counts.services = (await tx.service.deleteMany({ where: { businessId } })).count;
          counts.staff = (await tx.staff.deleteMany({ where: { businessId } })).count;
          counts.products = (await tx.product.deleteMany({ where: { businessId } })).count;
          // ── the business itself (holds the FK to its owner User) ───────────
          await tx.business.delete({ where: { id: businessId } });
          counts.business = 1;
          // ── owner User + its auth artifacts (ConsentRecord FK → User) ──────
          counts.consentRecords = (await tx.consentRecord.deleteMany({ where: { userId: ownerId } })).count;
          counts.otpCodes = (await tx.otpCode.deleteMany({ where: { phone: ownerPhone } })).count;
          counts.linkTokens = (await tx.linkToken.deleteMany({ where: { phone: ownerPhone } })).count;
          await tx.user.delete({ where: { id: ownerId } });
          counts.user = 1;
          return counts;
        },
        { timeout: 30000, maxWait: 10000 },
      );
    } catch (err) {
      request.log.error({ err }, 'ERASE_BUSINESS failed — transaction rolled back');
      return sendError(reply, 500, 'Erase failed and was rolled back; no data was deleted.');
    }

    await writeAuditLog({
      adminUserId: request.adminUser!.id,
      action: 'ERASE_BUSINESS',
      targetType: 'Business',
      targetId: businessId,
      // Proof of compliance without retaining the erased PII: last-4 of the
      // owner phone + per-table counts.
      metadata: { ownerPhoneLast4: ownerPhone.slice(-4), tableCounts },
      ipAddress: request.ip,
    });

    return reply.send({ id: businessId, erased: true, tableCounts });
  });

  // ════════════════════════════════════════════════════════════════════════
  // GLOBAL SEARCH (Phase D) — cross-business, admin-only. Intentionally spans
  // tenants (that is the admin's job); never reachable by an owner token.
  // ════════════════════════════════════════════════════════════════════════

  // GET /admin/search?q=&type=business|customer|all&page=&limit=&includeDeleted=
  app.get('/admin/search', { preHandler: requireAdmin }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const q = (query.q ?? '').trim();
    const { page, limit, skip } = parsePagination(query);

    if (q.length < 2) {
      return reply.send({
        items: [],
        total: 0,
        page,
        limit,
        counts: { businesses: 0, customers: 0 },
        message: 'Type at least 2 characters',
      });
    }

    const type = query.type === 'business' || query.type === 'customer' ? query.type : 'all';
    const includeDeleted = wantsDeleted(query);
    const customerDb = readClient(includeDeleted); // soft-delete aware
    const like = { contains: q, mode: 'insensitive' as const };

    const businessWhere = { OR: [{ name: like }, { owner: { phone: like } }] };
    const customerWhere = { OR: [{ name: like }, { phone: like }, { telegramUsername: like }] };

    // Counts for the unified, paginated result. Businesses occupy the first
    // [0, businessTotal) slots of the merged list; customers follow.
    const businessTotal = type === 'customer' ? 0 : await prisma.business.count({ where: businessWhere });
    const customerTotal = type === 'business' ? 0 : await customerDb.customer.count({ where: customerWhere });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = [];

    if (type !== 'customer' && skip < businessTotal) {
      const take = Math.min(limit, businessTotal - skip);
      const rows = await prisma.business.findMany({
        where: businessWhere,
        select: { id: true, name: true, plan: true, suspendedAt: true, owner: { select: { phone: true } } },
        orderBy: { name: 'asc' },
        skip,
        take,
      });
      for (const b of rows) {
        items.push({
          kind: 'business',
          id: b.id,
          name: b.name,
          ownerPhone: b.owner.phone,
          plan: b.plan,
          status: b.suspendedAt ? 'suspended' : 'active',
        });
      }
    }

    if (type !== 'business' && items.length < limit) {
      const customerSkip = Math.max(0, skip - businessTotal);
      const take = limit - items.length;
      if (take > 0) {
        const rows = await customerDb.customer.findMany({
          where: customerWhere,
          select: {
            id: true, name: true, phone: true, telegramUsername: true,
            businessId: true, anonymizedAt: true, deletedAt: true,
            business: { select: { name: true } },
          },
          orderBy: { name: 'asc' },
          skip: customerSkip,
          take,
        });
        for (const c of rows) {
          items.push({
            kind: 'customer',
            id: c.id,
            name: c.name,
            phone: c.phone,
            telegramUsername: c.telegramUsername,
            businessId: c.businessId,
            businessName: c.business.name,
            anonymizedAt: c.anonymizedAt,
            deleted: c.deletedAt != null,
          });
        }
      }
    }

    return reply.send({
      items,
      total: businessTotal + customerTotal,
      page,
      limit,
      counts: { businesses: businessTotal, customers: customerTotal },
    });
  });
}
