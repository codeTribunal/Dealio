import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendError } from '../lib/errors.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/adminAuth.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function writeAuditLog(params: {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.auditLog.create({ data: params as any });
}

const SAFE_BUSINESS_SELECT = {
  id: true,
  name: true,
  description: true,
  mode: true,
  language: true,
  botUsername: true,
  plan: true,
  planExpiresAt: true,
  suspendedAt: true,
  suspendedReason: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: { id: true, phone: true },
  },
  _count: {
    select: {
      customers: true,
      orders: true,
      appointments: true,
      staff: true,
    },
  },
} as const;

// ── Zod schemas ───────────────────────────────────────────────────────────────

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePlanBody = z.object({
  plan: z.enum(['FREE', 'PRO', 'BUSINESS']),
  planExpiresAt: z.string().datetime().optional(),
  note: z.string().optional(),
});

const suspendBody = z.object({
  reason: z.string().min(10),
});

const createAdminBody = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['SUPER_ADMIN', 'SUPPORT']).default('SUPPORT'),
  password: z.string().min(8),
});

const updateAdminBody = z.object({
  role: z.enum(['SUPER_ADMIN', 'SUPPORT']),
});

// ── Routes ────────────────────────────────────────────────────────────────────

export default async function adminRoutes(app: FastifyInstance) {
  // ── Auth ──────────────────────────────────────────────────────────────────

  // POST /admin/auth/login
  app.post(
    '/admin/auth/login',
    {
      config: {
        rateLimit: { max: 10, timeWindow: 3600000 },
      },
    },
    async (request, reply) => {
      const parsed = loginBody.safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

      const { email, password } = parsed.data;

      const admin = await prisma.adminUser.findUnique({ where: { email } });
      if (!admin) return reply.status(401).send({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });

      const token = await reply.adminSign(
        { adminUserId: admin.id, role: admin.role },
        { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN ?? '8h' },
      );

      return reply.send({
        token,
        admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
      });
    },
  );

  // POST /admin/auth/logout
  app.post('/admin/auth/logout', { preHandler: requireAdmin }, async (_request, reply) => {
    return reply.send({ success: true });
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────

  // GET /admin/dashboard
  app.get('/admin/dashboard', { preHandler: requireAdmin }, async (_request, reply) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000);

    const [
      totalBusinesses,
      newThisWeek,
      planCounts,
      totalCustomers,
      suspended,
      recentSignups,
      recentSuspensions,
      activeOrderBizIds,
      activeApptBizIds,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.business.groupBy({ by: ['plan'], _count: { _all: true } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.business.count({ where: { suspendedAt: { not: null } } }),
      prisma.business.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, plan: true, createdAt: true },
      }),
      prisma.business.findMany({
        where: { suspendedAt: { not: null } },
        orderBy: { suspendedAt: 'desc' },
        take: 5,
        select: { id: true, name: true, suspendedReason: true, suspendedAt: true },
      }),
      prisma.order.groupBy({
        by: ['businessId'],
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.appointment.groupBy({
        by: ['businessId'],
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    const activeBizSet = new Set([
      ...activeOrderBizIds.map((o) => o.businessId),
      ...activeApptBizIds.map((a) => a.businessId),
    ]);

    const byPlan: Record<string, number> = { FREE: 0, PRO: 0, BUSINESS: 0 };
    for (const pc of planCounts) byPlan[pc.plan] = pc._count._all;

    return reply.send({
      totalBusinesses,
      activeThisMonth: activeBizSet.size,
      newThisWeek,
      byPlan,
      totalCustomers,
      suspended,
      recentSignups,
      recentSuspensions,
    });
  });

  // ── Businesses ────────────────────────────────────────────────────────────

  // GET /admin/businesses
  app.get('/admin/businesses', { preHandler: requireAdmin }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.plan) where.plan = query.plan;

    if (query.status === 'suspended') {
      where.suspendedAt = { not: null };
    } else if (query.status === 'active') {
      where.suspendedAt = null;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { owner: { phone: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, businesses] = await Promise.all([
      prisma.business.count({ where }),
      prisma.business.findMany({
        where,
        select: SAFE_BUSINESS_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return reply.send({ data: businesses, total, page, limit });
  });

  // GET /admin/businesses/:id
  app.get('/admin/businesses/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [business, usageLog, recentOrders, recentCustomers] = await Promise.all([
      prisma.business.findUnique({ where: { id }, select: SAFE_BUSINESS_SELECT }),
      prisma.usageLog.findUnique({ where: { businessId_month: { businessId: id, month: monthKey } } }),
      prisma.order.findMany({
        where: { businessId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, orderNumber: true, total: true, createdAt: true },
      }),
      prisma.customer.findMany({
        where: { businessId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, createdAt: true },
      }),
    ]);

    if (!business) return sendError(reply, 404, 'Business not found');

    return reply.send({ ...business, usageThisMonth: usageLog, recentOrders, recentCustomers });
  });

  // PATCH /admin/businesses/:id/plan
  app.patch(
    '/admin/businesses/:id/plan',
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.business.findUnique({ where: { id }, select: { plan: true } });
      if (!existing) return sendError(reply, 404, 'Business not found');

      const parsed = changePlanBody.safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

      const { plan, planExpiresAt, note } = parsed.data;

      const updated = await prisma.business.update({
        where: { id },
        data: {
          plan,
          planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
        },
        select: SAFE_BUSINESS_SELECT,
      });

      await writeAuditLog({
        adminUserId: request.adminUser!.id,
        action: 'CHANGE_PLAN',
        targetType: 'Business',
        targetId: id,
        metadata: { oldPlan: existing.plan, newPlan: plan, note },
        ipAddress: request.ip,
      });

      return reply.send(updated);
    },
  );

  // POST /admin/businesses/:id/suspend
  app.post(
    '/admin/businesses/:id/suspend',
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.business.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return sendError(reply, 404, 'Business not found');

      const parsed = suspendBody.safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

      const updated = await prisma.business.update({
        where: { id },
        data: { suspendedAt: new Date(), suspendedReason: parsed.data.reason },
        select: SAFE_BUSINESS_SELECT,
      });

      await writeAuditLog({
        adminUserId: request.adminUser!.id,
        action: 'SUSPEND_BUSINESS',
        targetType: 'Business',
        targetId: id,
        metadata: { reason: parsed.data.reason },
        ipAddress: request.ip,
      });

      return reply.send(updated);
    },
  );

  // POST /admin/businesses/:id/unsuspend
  app.post(
    '/admin/businesses/:id/unsuspend',
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.business.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return sendError(reply, 404, 'Business not found');

      const updated = await prisma.business.update({
        where: { id },
        data: { suspendedAt: null, suspendedReason: null },
        select: SAFE_BUSINESS_SELECT,
      });

      await writeAuditLog({
        adminUserId: request.adminUser!.id,
        action: 'UNSUSPEND_BUSINESS',
        targetType: 'Business',
        targetId: id,
        ipAddress: request.ip,
      });

      return reply.send(updated);
    },
  );

  // POST /admin/businesses/:id/impersonate
  app.post(
    '/admin/businesses/:id/impersonate',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const business = await prisma.business.findUnique({
        where: { id },
        select: { id: true, ownerId: true, name: true, suspendedAt: true },
      });

      if (!business) return sendError(reply, 404, 'Business not found');
      if (business.suspendedAt) return sendError(reply, 403, 'Cannot impersonate a suspended business');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = (app.jwt as any).sign({
        userId: business.ownerId,
        businessId: business.id,
        isImpersonation: true,
        impersonatedBy: request.adminUser!.id,
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      await writeAuditLog({
        adminUserId: request.adminUser!.id,
        action: 'IMPERSONATE_BUSINESS',
        targetType: 'Business',
        targetId: id,
        ipAddress: request.ip,
      });

      return reply.send({
        token,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
        businessName: business.name,
      });
    },
  );

  // ── Audit Logs ────────────────────────────────────────────────────────────

  // GET /admin/audit
  app.get('/admin/audit', { preHandler: requireAdmin }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.adminUserId) where.adminUserId = query.adminUserId;
    if (query.action) where.action = query.action;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { adminUser: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    return reply.send({ data: logs, total, page, limit });
  });

  // ── Admin Users ───────────────────────────────────────────────────────────

  // GET /admin/users
  app.get('/admin/users', { preHandler: requireSuperAdmin }, async (_request, reply) => {
    const users = await prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, role: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return reply.send(users);
  });

  // POST /admin/users
  app.post('/admin/users', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = createAdminBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { email, name, role, password } = parsed.data;

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) return sendError(reply, 409, 'Email already in use');

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.adminUser.create({
      data: { email, name, role, passwordHash },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    await writeAuditLog({
      adminUserId: request.adminUser!.id,
      action: 'CREATE_ADMIN_USER',
      targetType: 'AdminUser',
      targetId: admin.id,
      metadata: { email, role },
      ipAddress: request.ip,
    });

    return reply.status(201).send(admin);
  });

  // PATCH /admin/users/:id
  app.patch('/admin/users/:id', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };

    if (id === request.adminUser!.id) {
      return sendError(reply, 403, 'Cannot change your own role');
    }

    const parsed = updateAdminBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const existing = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!existing) return sendError(reply, 404, 'Admin user not found');

    const updated = await prisma.adminUser.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });

    await writeAuditLog({
      adminUserId: request.adminUser!.id,
      action: 'UPDATE_ADMIN_ROLE',
      targetType: 'AdminUser',
      targetId: id,
      metadata: { oldRole: existing.role, newRole: parsed.data.role },
      ipAddress: request.ip,
    });

    return reply.send(updated);
  });
}
