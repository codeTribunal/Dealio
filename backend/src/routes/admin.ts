import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendError } from '../lib/errors.js';
import { requireAdmin, requireSuperAdmin, ADMIN_SESSION_COOKIE } from '../middleware/adminAuth.js';
import { writeAuditLog } from '../lib/audit.js';
import { getCardPaymentsEnabled, setCardPaymentsEnabled } from '../lib/platformSettings.js';
import { invalidateVersionCache, type LegalDocType } from '../lib/legalVersion.js';
import { startBusinessBot } from '../lib/botManager.js';
import { runDeletionPurge } from '../jobs/deletionPurge.js';
import { PLAN_LIMITS } from '../lib/planLimits.js';

// Admin login lockout: after ADMIN_LOCK_THRESHOLD consecutive failures, lock the
// ACCOUNT for ADMIN_LOCK_MINUTES. This is the PRIMARY brute-force defense (the
// per-IP rate limit is secondary, since x-forwarded-for is client-spoofable).
// DUMMY_HASH equalizes bcrypt timing for unknown emails so login responses do
// not reveal whether an account exists.
const ADMIN_LOCK_THRESHOLD = 5;
const ADMIN_LOCK_MINUTES = 15;
const DUMMY_HASH = bcrypt.hashSync('unused-timing-equalizer', 12);

// Legal-document publish body. Version must be a non-empty string; a no-op
// (same-as-current) publish is rejected in the handler. `content` is the
// deterministic serialization of the document's in-code text (produced by
// web/lib/legalHash.ts — the text lives in the web codebase, which the backend
// cannot import): the server computes sha256 over it and stamps the hash on
// the row, so the admin legal page can later detect wording drift between the
// code and the in-force published version.
const publishLegalBody = z.object({
  version: z.string().trim().min(1).max(100),
  content: z.string().min(1).max(500_000),
});

const LEGAL_DOC_TYPES = ['PRIVACY', 'OFFER'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  // Owner-requested account deletion — surfaced in the admin businesses list so
  // an operator sees pending deletions + the scheduled purge date.
  deletionState: true,
  deletionRequestedAt: true,
  deletionScheduledAt: true,
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

// Unsuspend and impersonation now require a justification (like suspend), stored
// in the audit log. Bounded length; trimmed.
const unsuspendBody = z.object({
  reason: z.string().trim().min(10).max(500),
});

const impersonateBody = z.object({
  reason: z.string().trim().min(10).max(500),
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

const platformSettingsBody = z.object({
  cardPaymentsEnabled: z.boolean(),
});

// ── Dashboard v2 helpers ──────────────────────────────────────────────────────
// Every number below is computed on request from existing rows (no new tables,
// no instrumentation). At current scale (hundreds of businesses) a handful of
// aggregate queries per dashboard load is fine; if this ever gets slow the fix
// is a cached snapshot, not per-write counters.

/** Percentage of `n` over `d`, one decimal, 0 when the denominator is 0. */
const pctOf = (n: number, d: number): number => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

interface FunnelStep {
  count: number;
  /** % of the window's signups (0 when there are no signups). */
  pct: number;
}

interface FunnelWindow {
  signups: number;
  botConnected: FunnelStep;
  catalogReady: FunnelStep;
  firstSale: FunnelStep;
  activated: FunnelStep;
  /** Median days from signup to first order/appointment/project; null when no
   *  business in the window has a first sale. */
  medianDaysToFirstSale: number | null;
}

// One activation-funnel window. `cutoff` = null means all-time. Aggregate
// queries only — the per-business predicates run as EXISTS/correlated
// subqueries inside single SQL statements, never as app-level loops.
// NOTE: raw SQL bypasses the soft-delete client extension, so every raw
// subquery filters `deletedAt IS NULL` explicitly.
async function computeFunnelWindow(cutoff: Date | null): Promise<FunnelWindow> {
  const windowWhere = cutoff ? { createdAt: { gte: cutoff } } : {};

  const [signups, botConnected, catalogReady, firstSale, activatedRows, medianRows] =
    await Promise.all([
      prisma.business.count({ where: windowWhere }),
      prisma.business.count({ where: { ...windowWhere, botUsername: { not: null } } }),
      // Catalog ready: something a customer could buy — an active product or
      // service; FREELANCE businesses have no catalog, so they count as ready.
      prisma.business.count({
        where: {
          ...windowWhere,
          OR: [
            { mode: 'FREELANCE' },
            { products: { some: { active: true, deletedAt: null } } },
            { services: { some: { active: true, deletedAt: null } } },
          ],
        },
      }),
      prisma.business.count({
        where: {
          ...windowWhere,
          OR: [
            { orders: { some: { deletedAt: null } } },
            { appointments: { some: { deletedAt: null } } },
            { projects: { some: { deletedAt: null } } },
          ],
        },
      }),
      // Activated: >=5 orders+appointments created within 30 days of that
      // business's own signup date ("created" = row createdAt for both).
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM "Business" b
        WHERE (${cutoff}::timestamptz IS NULL OR b."createdAt" >= ${cutoff}::timestamptz)
          AND (
            (SELECT COUNT(*) FROM "Order" o
              WHERE o."businessId" = b.id AND o."deletedAt" IS NULL
                AND o."createdAt" <= b."createdAt" + INTERVAL '30 days')
            +
            (SELECT COUNT(*) FROM "Appointment" a
              WHERE a."businessId" = b.id AND a."deletedAt" IS NULL
                AND a."createdAt" <= b."createdAt" + INTERVAL '30 days')
          ) >= 5
      `,
      prisma.$queryRaw<{ median: number | null }[]>`
        SELECT (percentile_cont(0.5) WITHIN GROUP (ORDER BY s.days))::float8 AS median
        FROM (
          SELECT EXTRACT(EPOCH FROM (
            LEAST(
              (SELECT MIN(o."createdAt") FROM "Order" o
                WHERE o."businessId" = b.id AND o."deletedAt" IS NULL),
              (SELECT MIN(a."createdAt") FROM "Appointment" a
                WHERE a."businessId" = b.id AND a."deletedAt" IS NULL),
              (SELECT MIN(p."createdAt") FROM "Project" p
                WHERE p."businessId" = b.id AND p."deletedAt" IS NULL)
            ) - b."createdAt"
          )) / 86400.0 AS days
          FROM "Business" b
          WHERE (${cutoff}::timestamptz IS NULL OR b."createdAt" >= ${cutoff}::timestamptz)
        ) s
        WHERE s.days IS NOT NULL
      `,
    ]);

  const activated = activatedRows[0]?.count ?? 0;
  const median = medianRows[0]?.median ?? null;

  return {
    signups,
    botConnected: { count: botConnected, pct: pctOf(botConnected, signups) },
    catalogReady: { count: catalogReady, pct: pctOf(catalogReady, signups) },
    firstSale: { count: firstSale, pct: pctOf(firstSale, signups) },
    activated: { count: activated, pct: pctOf(activated, signups) },
    medianDaysToFirstSale: median === null ? null : Math.round(median * 10) / 10,
  };
}

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

      // Unknown account: dummy compare to equalize timing, then the SAME generic
      // error (no account-existence leak). Per-account lockout is impossible with
      // no account; the per-IP limit covers this path.
      if (!admin) {
        await bcrypt.compare(password, DUMMY_HASH);
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Locked account: deny even a correct password during the cooldown, with
      // the SAME generic error (do not reveal lock state).
      if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
        await bcrypt.compare(password, admin.passwordHash); // equalize timing
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) {
        // Count the failure; at the threshold, lock the account for the cooldown
        // (and reset the counter so a fresh window starts after it expires).
        const nextCount = admin.failedLoginCount + 1;
        const lock = nextCount >= ADMIN_LOCK_THRESHOLD;
        await prisma.adminUser.update({
          where: { id: admin.id },
          data: lock
            ? {
                failedLoginCount: 0,
                lockedUntil: new Date(Date.now() + ADMIN_LOCK_MINUTES * 60_000),
              }
            : { failedLoginCount: nextCount },
        });
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Success: clear the counter + any lock, stamp lastLoginAt.
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
      });

      const token = await reply.adminSign(
        { adminUserId: admin.id, role: admin.role },
        { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN ?? '8h' },
      );

      // The session travels ONLY as an httpOnly cookie — never in the body —
      // so panel JS (and any XSS payload running in it) cannot read the token.
      // Path-scoped to the admin API; sameSite strict is the first CSRF wall,
      // the x-requested-with guard (adminCsrfGuard) is the second.
      reply.setCookie(ADMIN_SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'strict',
        path: '/api/v1/admin',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60, // seconds — matches the 8h JWT expiry
      });

      return reply.send({
        admin: { id: admin.id, name: admin.name, role: admin.role },
      });
    },
  );

  // POST /admin/auth/logout — clears the session cookie. The clearing cookie
  // must carry the same path/flags as the one set at login or browsers keep
  // the original.
  app.post('/admin/auth/logout', { preHandler: requireAdmin }, async (_request, reply) => {
    reply.clearCookie(ADMIN_SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/v1/admin',
      secure: process.env.NODE_ENV === 'production',
    });
    return reply.status(204).send();
  });

  // GET /admin/auth/me — identity of the authenticated admin. The panel uses
  // this to gate UI by role (display only — privileged routes still enforce
  // requireSuperAdmin server-side regardless).
  app.get('/admin/auth/me', { preHandler: requireAdmin }, async (request, reply) => {
    const admin = request.adminUser!;
    return reply.send({ id: admin.id, name: admin.name, role: admin.role });
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────

  // GET /admin/dashboard
  app.get('/admin/dashboard', { preHandler: requireAdmin }, async (_request, reply) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60_000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60_000);

    // 80% of the FREE limits from planLimits.ts — a business past these is
    // close enough to the wall to be worth an upgrade conversation.
    const FREE = PLAN_LIMITS.FREE;
    const NEAR_CUSTOMERS = 24; // of FREE.customers (30)
    const NEAR_ORDERS = 40; // of FREE.ordersPerMonth (50)
    const NEAR_APPOINTMENTS = 40; // of FREE.appointmentsPerMonth (50)

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
      // ── v2 additions (all aggregate queries; see Dashboard v2 helpers) ──
      funnel7d,
      funnel30d,
      funnelAll,
      pendingDeletion,
      stuckOnboarding,
      goneQuiet,
      momentum,
      nearCustomerRows,
      nearOrderRows,
      nearApptRows,
      modeCounts,
      languageCounts,
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

      // Activation funnel per window.
      computeFunnelWindow(sevenDaysAgo),
      computeFunnelWindow(thirtyDaysAgo),
      computeFunnelWindow(null),

      // Attention: owner-requested deletions waiting for the purge.
      prisma.business.findMany({
        where: { deletionState: 'PENDING_DELETION' },
        orderBy: { deletionScheduledAt: 'desc' },
        take: 20,
        select: { id: true, name: true, deletionScheduledAt: true },
      }),
      // Attention: signed up >48h ago and never connected a bot. Businesses
      // already pending deletion are excluded so they don't appear twice.
      prisma.business.findMany({
        where: {
          createdAt: { lt: fortyEightHoursAgo },
          botUsername: null,
          deletionState: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, name: true, createdAt: true },
      }),
      // Attention: had at least one order/appointment ever, none in 14 days.
      prisma.business.findMany({
        where: {
          AND: [
            {
              OR: [
                { orders: { some: { deletedAt: null } } },
                { appointments: { some: { deletedAt: null } } },
              ],
            },
            { orders: { none: { deletedAt: null, createdAt: { gte: fourteenDaysAgo } } } },
            { appointments: { none: { deletedAt: null, createdAt: { gte: fourteenDaysAgo } } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, name: true },
      }),

      // Momentum: last 30 calendar days (server timezone), one row per day
      // even when a day had no activity. Raw SQL bypasses the soft-delete
      // extension, so deletedAt is filtered explicitly.
      prisma.$queryRaw<
        { day: string; ordersPlusAppointments: number; newCustomers: number }[]
      >`
        WITH days AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day'
          )::date AS day
        ),
        o AS (
          SELECT "createdAt"::date AS day, COUNT(*)::int AS c FROM "Order"
          WHERE "deletedAt" IS NULL AND "createdAt" >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY 1
        ),
        a AS (
          SELECT "createdAt"::date AS day, COUNT(*)::int AS c FROM "Appointment"
          WHERE "deletedAt" IS NULL AND "createdAt" >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY 1
        ),
        c AS (
          SELECT "createdAt"::date AS day, COUNT(*)::int AS c FROM "Customer"
          WHERE "deletedAt" IS NULL AND "createdAt" >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY 1
        )
        SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
               (COALESCE(o.c, 0) + COALESCE(a.c, 0))::int AS "ordersPlusAppointments",
               COALESCE(c.c, 0)::int AS "newCustomers"
        FROM days
        LEFT JOIN o ON o.day = days.day
        LEFT JOIN a ON a.day = days.day
        LEFT JOIN c ON c.day = days.day
        ORDER BY days.day
      `,

      // Upgrade candidates: FREE businesses near a plan limit. Monthly counts
      // come from createdAt >= start of month (not UsageLog).
      prisma.customer.groupBy({
        by: ['businessId'],
        where: { deletedAt: null, business: { plan: 'FREE' } },
        _count: { _all: true },
        having: { businessId: { _count: { gte: NEAR_CUSTOMERS } } },
      }),
      prisma.order.groupBy({
        by: ['businessId'],
        where: { deletedAt: null, createdAt: { gte: startOfMonth }, business: { plan: 'FREE' } },
        _count: { _all: true },
        having: { businessId: { _count: { gte: NEAR_ORDERS } } },
      }),
      prisma.appointment.groupBy({
        by: ['businessId'],
        where: { deletedAt: null, createdAt: { gte: startOfMonth }, business: { plan: 'FREE' } },
        _count: { _all: true },
        having: { businessId: { _count: { gte: NEAR_APPOINTMENTS } } },
      }),

      // Composition.
      prisma.business.groupBy({ by: ['mode'], _count: { _all: true } }),
      prisma.business.groupBy({ by: ['language'], _count: { _all: true } }),
    ]);

    const activeBizSet = new Set([
      ...activeOrderBizIds.map((o) => o.businessId),
      ...activeApptBizIds.map((a) => a.businessId),
    ]);

    const byPlan: Record<string, number> = { FREE: 0, PRO: 0, BUSINESS: 0 };
    for (const pc of planCounts) byPlan[pc.plan] = pc._count._all;

    // Resolve names for upgrade candidates in ONE query, then emit one row per
    // metric a business is near (a business can appear for several metrics).
    const candidateIds = [
      ...new Set([
        ...nearCustomerRows.map((r) => r.businessId),
        ...nearOrderRows.map((r) => r.businessId),
        ...nearApptRows.map((r) => r.businessId),
      ]),
    ];
    const candidateNames = new Map(
      candidateIds.length > 0
        ? (
            await prisma.business.findMany({
              where: { id: { in: candidateIds } },
              select: { id: true, name: true },
            })
          ).map((b) => [b.id, b.name] as const)
        : [],
    );
    const upgradeCandidates = [
      ...nearCustomerRows.map((r) => ({
        id: r.businessId,
        name: candidateNames.get(r.businessId) ?? '',
        metric: 'customers' as const,
        current: r._count._all,
        limit: FREE.customers,
      })),
      ...nearOrderRows.map((r) => ({
        id: r.businessId,
        name: candidateNames.get(r.businessId) ?? '',
        metric: 'ordersPerMonth' as const,
        current: r._count._all,
        limit: FREE.ordersPerMonth,
      })),
      ...nearApptRows.map((r) => ({
        id: r.businessId,
        name: candidateNames.get(r.businessId) ?? '',
        metric: 'appointmentsPerMonth' as const,
        current: r._count._all,
        limit: FREE.appointmentsPerMonth,
      })),
    ].sort((x, y) => y.current / y.limit - x.current / x.limit);

    const byMode: Record<string, number> = { PRODUCTS: 0, SERVICES: 0, FREELANCE: 0 };
    for (const mc of modeCounts) byMode[mc.mode] = mc._count._all;
    const byLanguage: Record<string, number> = { UZBEK: 0, RUSSIAN: 0, ENGLISH: 0 };
    for (const lc of languageCounts) byLanguage[lc.language] = lc._count._all;

    return reply.send({
      totalBusinesses,
      activeThisMonth: activeBizSet.size,
      newThisWeek,
      byPlan,
      totalCustomers,
      suspended,
      recentSignups,
      recentSuspensions,
      // ── v2 ──
      funnel: { '7d': funnel7d, '30d': funnel30d, all: funnelAll },
      attention: { pendingDeletion, stuckOnboarding, goneQuiet },
      momentum,
      upgradeCandidates,
      composition: { byMode, byLanguage },
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

    const [
      business,
      usageLog,
      recentOrders,
      recentCustomers,
      customerCount,
      orderCount,
      appointmentCount,
      staffCount,
    ] = await Promise.all([
      prisma.business.findUnique({ where: { id }, select: SAFE_BUSINESS_SELECT }),
      prisma.usageLog.findUnique({ where: { businessId_month: { businessId: id, month: monthKey } } }),
      prisma.order.findMany({
        where: { businessId: id, deletedAt: null },
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
      // Accurate counts: the extended client excludes soft-deleted rows, so
      // these replace the relation _count (which would include deleted rows).
      prisma.customer.count({ where: { businessId: id } }),
      prisma.order.count({ where: { businessId: id } }),
      prisma.appointment.count({ where: { businessId: id } }),
      prisma.staff.count({ where: { businessId: id } }),
    ]);

    if (!business) return sendError(reply, 404, 'Business not found');

    return reply.send({
      ...business,
      _count: {
        customers: customerCount,
        orders: orderCount,
        appointments: appointmentCount,
        staff: staffCount,
      },
      usageThisMonth: usageLog,
      recentOrders,
      recentCustomers,
    });
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

      const parsed = unsuspendBody.safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

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
        metadata: { reason: parsed.data.reason },
        ipAddress: request.ip,
      });

      return reply.send(updated);
    },
  );

  // POST /admin/businesses/:id/impersonate
  app.post(
    '/admin/businesses/:id/impersonate',
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const parsed = impersonateBody.safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

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
        metadata: { reason: parsed.data.reason },
        ipAddress: request.ip,
      });

      return reply.send({
        token,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
        businessName: business.name,
      });
    },
  );

  // ── Platform Settings (global flags) ────────────────────────────────────────

  // GET /admin/platform-settings — any authenticated admin may read the flags
  // (so the panel can render the current state even for SUPPORT, who can't edit).
  app.get('/admin/platform-settings', { preHandler: requireAdmin }, async (_request, reply) => {
    const cardPaymentsEnabled = await getCardPaymentsEnabled();
    return reply.send({ cardPaymentsEnabled });
  });

  // PATCH /admin/platform-settings — SUPER_ADMIN only (enforced here on the
  // backend, not just hidden in the UI). Toggles the global card-payments flag.
  app.patch('/admin/platform-settings', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = platformSettingsBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const previous = await getCardPaymentsEnabled();
    const cardPaymentsEnabled = await setCardPaymentsEnabled(parsed.data.cardPaymentsEnabled);

    await writeAuditLog({
      adminUserId: request.adminUser!.id,
      action: 'UPDATE_PLATFORM_SETTINGS',
      targetType: 'PlatformSettings',
      targetId: 'singleton',
      metadata: { setting: 'cardPaymentsEnabled', from: previous, to: cardPaymentsEnabled },
      ipAddress: request.ip,
    });

    return reply.send({ cardPaymentsEnabled });
  });

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

  // ── Legal documents (versioning + re-consent) ─────────────────────────────
  // The document TEXT lives in the codebase (web/lib/legalConfig.ts) and deploys
  // separately; these endpoints only read/bump the in-force VERSION. Publishing a
  // new PRIVACY version is what forces re-consent (customers via the bot consent
  // gate, owners via the login CONSENT_REQUIRED gate). SuperAdmin only.

  // GET /admin/legal-docs — both documents with current version + publish info.
  app.get('/admin/legal-docs', { preHandler: requireSuperAdmin }, async (_request, reply) => {
    const rows = await prisma.legalDocument.findMany({
      select: {
        docType: true,
        version: true,
        publishedAt: true,
        publishedByAdminId: true,
        contentHash: true,
      },
    });
    const docs: Record<
      string,
      {
        version: string;
        publishedAt: string;
        publishedByAdminId: string | null;
        contentHash: string | null;
      }
    > = {};
    for (const d of rows) {
      docs[d.docType] = {
        version: d.version,
        publishedAt: d.publishedAt.toISOString(),
        publishedByAdminId: d.publishedByAdminId ?? null,
        // Null on rows published before hash tracking — the legal page treats
        // that as "publish pending" (it cannot prove the wording matches).
        contentHash: d.contentHash ?? null,
      };
    }
    return reply.send({ docs });
  });

  // POST /admin/legal-docs/:docType/publish — bump the in-force version. THIS is
  // the action that forces re-consent (for PRIVACY). Rejects an empty version and
  // a no-op (same-as-current) publish.
  app.post(
    '/admin/legal-docs/:docType/publish',
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const { docType } = request.params as { docType: string };
      if (!LEGAL_DOC_TYPES.includes(docType as (typeof LEGAL_DOC_TYPES)[number])) {
        return sendError(reply, 400, 'Unknown document type');
      }

      const parsed = publishLegalBody.safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);
      const newVersion = parsed.data.version;

      // sha256 over the deterministic serialization of the in-code document
      // text, computed SERVER-side so the stored hash provably matches the
      // submitted payload (the serialization itself is produced by the admin
      // panel, which is where the text lives — see web/lib/legalHash.ts).
      const contentHash = createHash('sha256')
        .update(parsed.data.content, 'utf8')
        .digest('hex');

      const existing = await prisma.legalDocument.findUnique({
        where: { docType: docType as LegalDocType },
        select: { version: true },
      });
      if (!existing) return sendError(reply, 404, 'Legal document not found');
      if (existing.version === newVersion) {
        return sendError(reply, 400, 'New version must differ from the current version');
      }

      const updated = await prisma.legalDocument.update({
        where: { docType: docType as LegalDocType },
        data: {
          version: newVersion,
          publishedAt: new Date(),
          publishedByAdminId: request.adminUser!.id,
          contentHash,
        },
        select: {
          docType: true,
          version: true,
          publishedAt: true,
          publishedByAdminId: true,
          contentHash: true,
        },
      });

      // Drop the cache so the new version is in force immediately (this instance).
      invalidateVersionCache(docType as LegalDocType);

      await writeAuditLog({
        adminUserId: request.adminUser!.id,
        action: 'PUBLISH_LEGAL_VERSION',
        targetType: 'LegalDocument',
        targetId: docType,
        metadata: { docType, fromVersion: existing.version, toVersion: newVersion, contentHash },
        ipAddress: request.ip,
      });

      return reply.send({
        docType: updated.docType,
        version: updated.version,
        publishedAt: updated.publishedAt.toISOString(),
        publishedByAdminId: updated.publishedByAdminId ?? null,
        contentHash: updated.contentHash,
      });
    },
  );

  // ── Account deletion (admin oversight) ────────────────────────────────────

  // POST /admin/businesses/:id/cancel-deletion — superadmin cancels a pending
  // owner deletion (before the purge fires), restoring the account like a
  // reactivate. Clears the deletion + suspension and restarts the bot.
  app.post(
    '/admin/businesses/:id/cancel-deletion',
    { preHandler: requireSuperAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.business.findUnique({
        where: { id },
        select: { id: true, deletionState: true },
      });
      if (!existing) return sendError(reply, 404, 'Business not found');
      if (existing.deletionState !== 'PENDING_DELETION') {
        return sendError(reply, 400, 'Business is not pending deletion');
      }

      const updated = await prisma.business.update({
        where: { id },
        data: {
          deletionState: 'ACTIVE',
          deletionRequestedAt: null,
          deletionScheduledAt: null,
          suspendedAt: null,
          suspendedReason: null,
        },
        select: SAFE_BUSINESS_SELECT,
      });

      startBusinessBot(id).catch((err) =>
        request.log.error({ err, businessId: id }, '[admin] cancel-deletion start-bot failed'),
      );

      await writeAuditLog({
        adminUserId: request.adminUser!.id,
        action: 'CANCEL_BUSINESS_DELETION',
        targetType: 'Business',
        targetId: id,
        ipAddress: request.ip,
      });

      return reply.send(updated);
    },
  );

  // POST /admin/purge-deletions — superadmin manual trigger of the deletion
  // purge sweep (the same job that runs on boot + every 24h). Safety net /
  // expedite for overdue purges. Irreversible for anything past its window.
  app.post('/admin/purge-deletions', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const result = await runDeletionPurge();

    await writeAuditLog({
      adminUserId: request.adminUser!.id,
      action: 'PURGE_BUSINESS_DELETIONS',
      targetType: 'System',
      targetId: 'deletion-purge',
      metadata: { purged: result.purged, failed: result.failed, overdue: result.overdue },
      ipAddress: request.ip,
    });

    return reply.send(result);
  });
}
