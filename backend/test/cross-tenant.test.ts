import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { hasTestDb, SKIP_DB_MESSAGE } from './helpers/env.js';
import { seedTenants, cleanAll, type Fixture } from './helpers/seed.js';
import { prisma } from '../src/lib/prisma.js';

// Skip the whole DB suite cleanly (exit 0) when no test DB is configured.
if (!hasTestDb()) console.warn(`\n[cross-tenant isolation] ${SKIP_DB_MESSAGE}\n`);
const describeDb = hasTestDb() ? describe : describe.skip;

describeDb('cross-tenant isolation — Business B must never touch Business A', () => {
  let app: FastifyInstance;
  let fx: Fixture;
  let tokenA: string;
  let tokenB: string;
  const secret = process.env.BOT_MANAGER_SECRET!;

  const asB = (opts: InjectOptions) =>
    app.inject({ ...opts, headers: { authorization: `Bearer ${tokenB}`, ...opts.headers } });
  const asA = (opts: InjectOptions) =>
    app.inject({ ...opts, headers: { authorization: `Bearer ${tokenA}`, ...opts.headers } });
  const asBot = (opts: InjectOptions) =>
    app.inject({ ...opts, headers: { 'x-bot-secret': secret, ...opts.headers } });

  beforeAll(async () => {
    app = await buildTestApp();
    fx = await seedTenants();
    tokenA = app.jwt.sign({ userId: fx.A.userId, phone: '+998900000001' });
    tokenB = app.jwt.sign({ userId: fx.B.userId, phone: '+998900000002' });
  });

  afterAll(async () => {
    await cleanAll();
    await app.close();
    await prisma.$disconnect();
  });

  // ── READ by id ─────────────────────────────────────────────────────────────
  describe('B cannot GET A records by id', () => {
    it('B cannot GET A customer', async () => {
      expect((await asB({ method: 'GET', url: `/api/v1/customers/${fx.A.customerId}` })).statusCode).toBe(404);
    });
    it('B cannot GET A order', async () => {
      expect((await asB({ method: 'GET', url: `/api/v1/orders/${fx.A.orderId}` })).statusCode).toBe(404);
    });
    it('B cannot GET A appointment', async () => {
      expect((await asB({ method: 'GET', url: `/api/v1/appointments/${fx.A.appointmentId}` })).statusCode).toBe(404);
    });
    it('B cannot GET A project', async () => {
      expect((await asB({ method: 'GET', url: `/api/v1/projects/${fx.A.projectId}` })).statusCode).toBe(404);
    });
    it('B cannot GET A product', async () => {
      expect((await asB({ method: 'GET', url: `/api/v1/products/${fx.A.productId}` })).statusCode).toBe(404);
    });
  });

  // ── MUTATE by id → 404 and record UNCHANGED ────────────────────────────────
  describe('B cannot MUTATE A records by id (and A is left unchanged)', () => {
    it('B cannot PATCH A appointment status', async () => {
      const res = await asB({ method: 'PATCH', url: `/api/v1/appointments/${fx.A.appointmentId}/status`, payload: { status: 'CONFIRMED' } });
      expect(res.statusCode).toBe(404);
      const row = await prisma.appointment.findUnique({ where: { id: fx.A.appointmentId } });
      expect(row?.status).toBe('REQUESTED');
    });
    it('B cannot PATCH A appointment payment', async () => {
      const res = await asB({ method: 'PATCH', url: `/api/v1/appointments/${fx.A.appointmentId}/payment`, payload: {} });
      expect(res.statusCode).toBe(404);
      const row = await prisma.appointment.findUnique({ where: { id: fx.A.appointmentId } });
      expect(row?.paymentStatus).toBe('PENDING');
    });
    it('B cannot PATCH A appointment notes', async () => {
      const res = await asB({ method: 'PATCH', url: `/api/v1/appointments/${fx.A.appointmentId}/notes`, payload: { notes: 'hijack' } });
      expect(res.statusCode).toBe(404);
      const row = await prisma.appointment.findUnique({ where: { id: fx.A.appointmentId } });
      expect(row?.notes ?? null).toBeNull();
    });
    it('B cannot PATCH A order status', async () => {
      const res = await asB({ method: 'PATCH', url: `/api/v1/orders/${fx.A.orderId}/status`, payload: { status: 'PREPARING' } });
      expect(res.statusCode).toBe(404);
      const row = await prisma.order.findUnique({ where: { id: fx.A.orderId } });
      expect(row?.orderStatus).toBe('NEW');
    });
    it('B cannot PATCH A customer profile', async () => {
      const res = await asB({ method: 'PATCH', url: `/api/v1/customers/${fx.A.customerId}`, payload: { name: 'hijacked' } });
      expect(res.statusCode).toBe(404);
      const row = await prisma.customer.findUnique({ where: { id: fx.A.customerId } });
      expect(row?.name).toBe('Cust A');
    });
    it('B cannot PATCH A product', async () => {
      const res = await asB({ method: 'PATCH', url: `/api/v1/products/${fx.A.productId}`, payload: { price: 999 } });
      expect(res.statusCode).toBe(404);
      const row = await prisma.product.findUnique({ where: { id: fx.A.productId } });
      expect(row?.price).toBe(50000);
    });
    it('B cannot DELETE A product (no soft-delete)', async () => {
      const res = await asB({ method: 'DELETE', url: `/api/v1/products/${fx.A.productId}` });
      expect(res.statusCode).toBe(404);
      const row = await prisma.product.findUnique({ where: { id: fx.A.productId } });
      expect(row?.deletedAt ?? null).toBeNull();
    });
    it('B cannot toggle A product', async () => {
      const res = await asB({ method: 'PATCH', url: `/api/v1/products/${fx.A.productId}/toggle` });
      expect(res.statusCode).toBe(404);
      const row = await prisma.product.findUnique({ where: { id: fx.A.productId } });
      expect(row?.active).toBe(true);
    });
    it('B cannot PATCH / toggle A service', async () => {
      expect((await asB({ method: 'PATCH', url: `/api/v1/services/${fx.A.serviceId}`, payload: { name: 'x' } })).statusCode).toBe(404);
      expect((await asB({ method: 'PATCH', url: `/api/v1/services/${fx.A.serviceId}/toggle` })).statusCode).toBe(404);
      const row = await prisma.service.findUnique({ where: { id: fx.A.serviceId } });
      expect(row?.name).toBe('Svc A');
      expect(row?.active).toBe(true);
    });
    it('B cannot PATCH / DELETE A staff', async () => {
      expect((await asB({ method: 'PATCH', url: `/api/v1/staff/${fx.A.staffId}`, payload: { name: 'x' } })).statusCode).toBe(404);
      expect((await asB({ method: 'DELETE', url: `/api/v1/staff/${fx.A.staffId}` })).statusCode).toBe(404);
      const row = await prisma.staff.findUnique({ where: { id: fx.A.staffId } });
      expect(row?.name).toBe('Staff A');
      expect(row?.deletedAt ?? null).toBeNull();
    });
    it('B cannot PATCH / DELETE A project', async () => {
      expect((await asB({ method: 'PATCH', url: `/api/v1/projects/${fx.A.projectId}`, payload: { status: 'COMPLETED' } })).statusCode).toBe(404);
      expect((await asB({ method: 'DELETE', url: `/api/v1/projects/${fx.A.projectId}` })).statusCode).toBe(404);
      const row = await prisma.project.findUnique({ where: { id: fx.A.projectId } });
      expect(row?.status).toBe('PROPOSAL_SENT');
      expect(row?.deletedAt ?? null).toBeNull();
    });
    it('B cannot DELETE A blocked slot', async () => {
      const res = await asB({ method: 'DELETE', url: `/api/v1/blocked-slots/${fx.A.blockedSlotId}` });
      expect(res.statusCode).toBe(404);
      const row = await prisma.blockedSlot.findUnique({ where: { id: fx.A.blockedSlotId } });
      expect(row).not.toBeNull();
    });
  });

  // ── Nested resources (milestones / invoices under A's project) ─────────────
  describe('B cannot touch A nested resources', () => {
    it('B cannot PATCH A milestone via A project', async () => {
      const res = await asB({ method: 'PATCH', url: `/api/v1/projects/${fx.A.projectId}/milestones/${fx.A.milestoneId}`, payload: { status: 'APPROVED' } });
      expect(res.statusCode).toBe(404);
      const row = await prisma.milestone.findUnique({ where: { id: fx.A.milestoneId } });
      expect(row?.status).toBe('PENDING');
    });
    it('B cannot DELETE A milestone', async () => {
      const res = await asB({ method: 'DELETE', url: `/api/v1/projects/${fx.A.projectId}/milestones/${fx.A.milestoneId}` });
      expect(res.statusCode).toBe(404);
      const row = await prisma.milestone.findUnique({ where: { id: fx.A.milestoneId } });
      expect(row?.deletedAt ?? null).toBeNull();
    });
    it('B cannot mark A invoice paid', async () => {
      const res = await asB({ method: 'PATCH', url: `/api/v1/projects/${fx.A.projectId}/invoices/${fx.A.invoiceId}/paid` });
      expect(res.statusCode).toBe(404);
      const row = await prisma.invoice.findUnique({ where: { id: fx.A.invoiceId } });
      expect(row?.status).toBe('UNPAID');
    });
    it('B cannot add a milestone to A project', async () => {
      const before = await prisma.milestone.count({ where: { projectId: fx.A.projectId } });
      const res = await asB({ method: 'POST', url: `/api/v1/projects/${fx.A.projectId}/milestones`, payload: { name: 'injected', amount: 1 } });
      expect(res.statusCode).toBe(404);
      const after = await prisma.milestone.count({ where: { projectId: fx.A.projectId } });
      expect(after).toBe(before);
    });
    it("B cannot reach A's milestone by nesting it under B's own project", async () => {
      const res = await asB({ method: 'PATCH', url: `/api/v1/projects/${fx.B.projectId}/milestones/${fx.A.milestoneId}`, payload: { status: 'APPROVED' } });
      expect(res.statusCode).toBe(404);
      const row = await prisma.milestone.findUnique({ where: { id: fx.A.milestoneId } });
      expect(row?.status).toBe('PENDING');
    });
  });

  // ── List endpoints return ONLY the caller's rows ───────────────────────────
  describe('list endpoints scope to the caller', () => {
    it('GET /customers as B → only B', async () => {
      const body = (await asB({ method: 'GET', url: '/api/v1/customers' })).json();
      const ids = body.customers.map((c: { id: string }) => c.id);
      expect(ids).toContain(fx.B.customerId);
      expect(ids).not.toContain(fx.A.customerId);
    });
    it('GET /orders as B → only B', async () => {
      const ids = (await asB({ method: 'GET', url: '/api/v1/orders' })).json().map((o: { id: string }) => o.id);
      expect(ids).toContain(fx.B.orderId);
      expect(ids).not.toContain(fx.A.orderId);
    });
    it('GET /appointments as B → only B', async () => {
      const ids = (await asB({ method: 'GET', url: '/api/v1/appointments' })).json().map((a: { id: string }) => a.id);
      expect(ids).toContain(fx.B.appointmentId);
      expect(ids).not.toContain(fx.A.appointmentId);
    });
    it('GET /projects as B → only B', async () => {
      const ids = (await asB({ method: 'GET', url: '/api/v1/projects' })).json().map((p: { id: string }) => p.id);
      expect(ids).toContain(fx.B.projectId);
      expect(ids).not.toContain(fx.A.projectId);
    });
    it('GET /services as B → only B', async () => {
      const ids = (await asB({ method: 'GET', url: '/api/v1/services' })).json().map((s: { id: string }) => s.id);
      expect(ids).toContain(fx.B.serviceId);
      expect(ids).not.toContain(fx.A.serviceId);
    });
    it('GET /staff as B → only B', async () => {
      const ids = (await asB({ method: 'GET', url: '/api/v1/staff' })).json().map((s: { id: string }) => s.id);
      expect(ids).toContain(fx.B.staffId);
      expect(ids).not.toContain(fx.A.staffId);
    });
    it('GET /products as B → only B', async () => {
      const ids = (await asB({ method: 'GET', url: '/api/v1/products' })).json().map((p: { id: string }) => p.id);
      expect(ids).toContain(fx.B.productId);
      expect(ids).not.toContain(fx.A.productId);
    });
    it('GET /blocked-slots as B → only B', async () => {
      const ids = (await asB({ method: 'GET', url: '/api/v1/blocked-slots' })).json().map((s: { id: string }) => s.id);
      expect(ids).toContain(fx.B.blockedSlotId);
      expect(ids).not.toContain(fx.A.blockedSlotId);
    });
  });

  // ── /business never leaks bot-token fields ─────────────────────────────────
  describe('GET /business', () => {
    it('returns B and never exposes bot-token fields', async () => {
      const res = await asB({ method: 'GET', url: '/api/v1/business' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(fx.B.businessId);
      expect(body.name).toBe('Biz B');
      expect('botTokenEncrypted' in body).toBe(false);
      expect('botTokenIv' in body).toBe(false);
      expect('botTokenTag' in body).toBe(false);
    });
  });

  // ── Aggregates never cross tenants ─────────────────────────────────────────
  describe('analytics / home / availability never include A data', () => {
    it("B analytics exclude A's revenue, customers and products", async () => {
      const a = (await asB({ method: 'GET', url: '/api/v1/analytics' })).json();
      // Each business has exactly one CONFIRMED order of 50000 — B must see only its own.
      expect(a.revenueThisMonth).toBe(50000);
      const topIds = (a.topCustomers ?? []).map((c: { id: string }) => c.id);
      expect(topIds).not.toContain(fx.A.customerId);
      expect(a.bestSellingProduct?.id ?? null).not.toBe(fx.A.productId);
    });
    it("B home excludes A's orders and customers", async () => {
      const h = (await asB({ method: 'GET', url: '/api/v1/home' })).json();
      const orderIds = h.todayOrders.map((o: { id: string }) => o.id);
      const customerIds = h.newCustomers.map((c: { id: string }) => c.id);
      expect(orderIds).not.toContain(fx.A.orderId);
      expect(customerIds).not.toContain(fx.A.customerId);
    });
    it("B cannot probe A's availability (A service → 404)", async () => {
      const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res = await asB({ method: 'GET', url: `/api/v1/availability?serviceId=${fx.A.serviceId}&date=${date}` });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Bot endpoints: A's botUsername + B's record id → not found / no mutation ─
  describe('bot endpoints (shared secret) stay within the botUsername business', () => {
    it("A's bot cannot mark B's appointment reminder-sent", async () => {
      const res = await asBot({ method: 'POST', url: '/api/v1/bot/mark-reminder-sent', payload: { botUsername: fx.A.botUsername, appointmentId: fx.B.appointmentId } });
      expect(res.statusCode).toBe(404);
      const row = await prisma.appointment.findUnique({ where: { id: fx.B.appointmentId } });
      expect(row?.reminderSent).toBe(false);
    });
    it("A's bot cannot confirm payment on B's order", async () => {
      const res = await asBot({ method: 'POST', url: '/api/v1/bot/confirm-payment', payload: { botUsername: fx.A.botUsername, orderId: fx.B.orderId } });
      expect(res.statusCode).toBe(404);
    });
    it("A's bot cannot review B's milestone", async () => {
      const res = await asBot({ method: 'POST', url: '/api/v1/bot/milestone-review', payload: { botUsername: fx.A.botUsername, milestoneId: fx.B.milestoneId, approved: true } });
      expect(res.statusCode).toBe(404);
      const row = await prisma.milestone.findUnique({ where: { id: fx.B.milestoneId } });
      expect(row?.status).toBe('PENDING');
    });
  });

  // ── Positive controls — isolation is real scoping, not blanket-deny ─────────
  describe('positive controls (own-tenant access still works)', () => {
    it('A can GET its own appointment', async () => {
      const res = await asA({ method: 'GET', url: `/api/v1/appointments/${fx.A.appointmentId}` });
      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(fx.A.appointmentId);
    });
    it("A's bot CAN mark A's own appointment reminder-sent", async () => {
      const res = await asBot({ method: 'POST', url: '/api/v1/bot/mark-reminder-sent', payload: { botUsername: fx.A.botUsername, appointmentId: fx.A.appointmentId } });
      expect(res.statusCode).toBe(200);
      const row = await prisma.appointment.findUnique({ where: { id: fx.A.appointmentId } });
      expect(row?.reminderSent).toBe(true);
    });
  });

  // ── Admin boundary + impersonation scope ───────────────────────────────────
  describe('admin boundary + impersonation', () => {
    it('owner JWT cannot reach an admin route', async () => {
      const res = await asB({ method: 'GET', url: '/api/v1/admin/dashboard' });
      expect([401, 403]).toContain(res.statusCode);
    });
    it('an impersonation token for A acts only on A', async () => {
      const login = await app.inject({ method: 'POST', url: '/api/v1/admin/auth/login', payload: { email: fx.admin.email, password: fx.admin.password } });
      expect(login.statusCode).toBe(200);
      const adminToken = login.json().token;

      const imp = await app.inject({ method: 'POST', url: `/api/v1/admin/businesses/${fx.A.businessId}/impersonate`, headers: { authorization: `Bearer ${adminToken}` } });
      expect(imp.statusCode).toBe(200);
      const impToken = imp.json().token;
      const impHeaders = { authorization: `Bearer ${impToken}` };

      // Acts on A
      const ownBiz = await app.inject({ method: 'GET', url: '/api/v1/business', headers: impHeaders });
      expect(ownBiz.statusCode).toBe(200);
      expect(ownBiz.json().id).toBe(fx.A.businessId);

      const ownAppt = await app.inject({ method: 'GET', url: `/api/v1/appointments/${fx.A.appointmentId}`, headers: impHeaders });
      expect(ownAppt.statusCode).toBe(200);

      // But NOT on B
      const foreignAppt = await app.inject({ method: 'GET', url: `/api/v1/appointments/${fx.B.appointmentId}`, headers: impHeaders });
      expect(foreignAppt.statusCode).toBe(404);
    });
  });
});
