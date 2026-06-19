import bcrypt from 'bcrypt';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { hasTestDb, SKIP_DB_MESSAGE } from './helpers/env.js';
import { seedTenants, cleanAll, type Fixture } from './helpers/seed.js';
import { prisma, prismaUnscoped } from '../src/lib/prisma.js';

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

  // ── Owner soft-delete + restore (customers / orders / appointments) ─────────
  describe('owner soft-delete + restore', () => {
    it('owner deletes a customer → customer + their orders/appointments hidden, rows kept', async () => {
      const c = await prisma.customer.create({ data: { businessId: fx.A.businessId, name: 'Soft Target' } });
      const ord = await prisma.order.create({
        data: { businessId: fx.A.businessId, customerId: c.id, orderNumber: 7001, total: 100, deliveryMethod: 'PICKUP', timeline: [] },
      });
      const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const appt = await prisma.appointment.create({
        data: { businessId: fx.A.businessId, customerId: c.id, serviceId: fx.A.serviceId, startTime: start, endTime: new Date(start.getTime() + 3_600_000), price: 100 },
      });

      const custIds = async () =>
        (await asA({ method: 'GET', url: '/api/v1/customers?limit=100' })).json().customers.map((x: { id: string }) => x.id);
      const orderIds = async () =>
        (await asA({ method: 'GET', url: '/api/v1/orders' })).json().map((o: { id: string }) => o.id);
      const apptIds = async () =>
        (await asA({ method: 'GET', url: '/api/v1/appointments' })).json().map((a: { id: string }) => a.id);

      expect(await custIds()).toContain(c.id);

      const del = await asA({ method: 'DELETE', url: `/api/v1/customers/${c.id}` });
      expect(del.statusCode).toBe(200);

      // customer + orphaned order/appointment hidden from default lists
      expect(await custIds()).not.toContain(c.id);
      expect(await orderIds()).not.toContain(ord.id);
      expect(await apptIds()).not.toContain(appt.id);

      // but the order/appointment rows are NOT deleted (leave & filter)
      expect((await prismaUnscoped.order.findUnique({ where: { id: ord.id } }))?.deletedAt ?? null).toBeNull();
      expect((await prismaUnscoped.appointment.findUnique({ where: { id: appt.id } }))?.deletedAt ?? null).toBeNull();

      // includeDeleted shows the customer, flagged
      const shown = (await asA({ method: 'GET', url: '/api/v1/customers?limit=100&includeDeleted=true' })).json().customers;
      expect(shown.find((x: { id: string }) => x.id === c.id)?.deleted).toBe(true);

      // restore the customer → customer + orphans reappear
      const res = await asA({ method: 'POST', url: `/api/v1/customers/${c.id}/restore` });
      expect(res.statusCode).toBe(200);
      expect(await custIds()).toContain(c.id);
      expect(await orderIds()).toContain(ord.id);
      expect(await apptIds()).toContain(appt.id);
    });

    it('owner deletes an individual order → hidden, includeDeleted flags it, restore brings it back', async () => {
      const ids = async () =>
        (await asA({ method: 'GET', url: '/api/v1/orders' })).json().map((o: { id: string }) => o.id);
      expect((await asA({ method: 'DELETE', url: `/api/v1/orders/${fx.A.orderId}` })).statusCode).toBe(200);
      expect(await ids()).not.toContain(fx.A.orderId);
      const shown = (await asA({ method: 'GET', url: '/api/v1/orders?includeDeleted=true' })).json();
      expect(shown.find((o: { id: string }) => o.id === fx.A.orderId)?.deleted).toBe(true);
      expect((await asA({ method: 'POST', url: `/api/v1/orders/${fx.A.orderId}/restore` })).statusCode).toBe(200);
      expect(await ids()).toContain(fx.A.orderId);
    });

    it('owner deletes an individual appointment → hidden, restore brings it back', async () => {
      const ids = async () =>
        (await asA({ method: 'GET', url: '/api/v1/appointments' })).json().map((a: { id: string }) => a.id);
      expect((await asA({ method: 'DELETE', url: `/api/v1/appointments/${fx.A.appointmentId}` })).statusCode).toBe(200);
      expect(await ids()).not.toContain(fx.A.appointmentId);
      expect((await asA({ method: 'POST', url: `/api/v1/appointments/${fx.A.appointmentId}/restore` })).statusCode).toBe(200);
      expect(await ids()).toContain(fx.A.appointmentId);
    });

    it("owner cannot delete or restore another business's records (404, untouched)", async () => {
      expect((await asB({ method: 'DELETE', url: `/api/v1/customers/${fx.A.customerId}` })).statusCode).toBe(404);
      expect((await asB({ method: 'DELETE', url: `/api/v1/orders/${fx.A.orderId}` })).statusCode).toBe(404);
      expect((await asB({ method: 'POST', url: `/api/v1/appointments/${fx.A.appointmentId}/restore` })).statusCode).toBe(404);
      expect((await prismaUnscoped.customer.findUnique({ where: { id: fx.A.customerId } }))?.deletedAt ?? null).toBeNull();
      expect((await prismaUnscoped.order.findUnique({ where: { id: fx.A.orderId } }))?.deletedAt ?? null).toBeNull();
    });
  });

  // ── Admin boundary + impersonation scope ───────────────────────────────────
  describe('admin boundary + impersonation', () => {
    // Log in the seeded SUPER_ADMIN and return an admin Authorization header.
    const adminHeaders = async (): Promise<Record<string, string>> => {
      const login = await app.inject({ method: 'POST', url: '/api/v1/admin/auth/login', payload: { email: fx.admin.email, password: fx.admin.password } });
      return { authorization: `Bearer ${login.json().token}` };
    };

    // Mint a fresh impersonation token for Business A (owner JWT + isImpersonation).
    const impersonateA = async (): Promise<Record<string, string>> => {
      const login = await app.inject({ method: 'POST', url: '/api/v1/admin/auth/login', payload: { email: fx.admin.email, password: fx.admin.password } });
      const adminToken = login.json().token;
      const imp = await app.inject({ method: 'POST', url: `/api/v1/admin/businesses/${fx.A.businessId}/impersonate`, headers: { authorization: `Bearer ${adminToken}` } });
      return { authorization: `Bearer ${imp.json().token}` };
    };

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

    // ── Impersonation guardrail — destructive actions disabled ───────────────
    it('impersonation token cannot DELETE (403, row untouched)', async () => {
      const headers = await impersonateA();
      const res = await app.inject({ method: 'DELETE', url: `/api/v1/products/${fx.A.productId}`, headers });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe('IMPERSONATION_READONLY');
      const row = await prisma.product.findUnique({ where: { id: fx.A.productId } });
      expect(row?.deletedAt ?? null).toBeNull();
    });

    it('impersonation token cannot confirm a payment (403)', async () => {
      const headers = await impersonateA();
      const res = await app.inject({ method: 'PATCH', url: `/api/v1/orders/${fx.A.orderId}/payment`, headers, payload: {} });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe('IMPERSONATION_READONLY');
    });

    it('impersonation token can still READ (lists work)', async () => {
      const headers = await impersonateA();
      const res = await app.inject({ method: 'GET', url: '/api/v1/products', headers });
      expect(res.statusCode).toBe(200);
    });

    it('a normal owner token is NOT blocked from DELETE', async () => {
      // Throwaway product so we never disturb the shared fixture rows.
      const p = await prisma.product.create({ data: { businessId: fx.A.businessId, name: 'throwaway', price: 1 } });
      const res = await asA({ method: 'DELETE', url: `/api/v1/products/${p.id}` });
      expect(res.statusCode).toBe(204);
      const row = await prisma.product.findUnique({ where: { id: p.id } });
      expect(row?.deletedAt).not.toBeNull();
    });

    // ── Soft-delete exclusion is real (extension excludes deleted rows) ──────
    it('a soft-deleted row disappears from normal reads but the unscoped client still sees it', async () => {
      const c = await prisma.customer.create({ data: { businessId: fx.A.businessId, name: 'to-be-deleted' } });

      // Visible before deletion.
      expect(await prisma.customer.findFirst({ where: { id: c.id } })).not.toBeNull();
      expect(await prisma.customer.count({ where: { id: c.id } })).toBe(1);

      // Soft-delete via the Phase-A primitive (business-scoped).
      const { softDelete } = await import('../src/services/softDelete.js');
      expect(await softDelete('customer', c.id, fx.A.businessId)).toEqual({ deleted: true });

      // Excluded from the extended client's reads…
      expect(await prisma.customer.findFirst({ where: { id: c.id } })).toBeNull();
      expect(await prisma.customer.count({ where: { id: c.id } })).toBe(0);
      const listed = await prisma.customer.findMany({ where: { businessId: fx.A.businessId } });
      expect(listed.map((r) => r.id)).not.toContain(c.id);

      // …but the unscoped client (and explicit opt-in) still sees it.
      const { prismaUnscoped } = await import('../src/lib/prisma.js');
      expect(await prismaUnscoped.customer.findUnique({ where: { id: c.id } })).not.toBeNull();
      const optIn = await prisma.customer.findMany({ where: { businessId: fx.A.businessId, deletedAt: { not: null } } });
      expect(optIn.map((r) => r.id)).toContain(c.id);

      // Cross-tenant guard: B cannot soft-delete A's customer.
      const c2 = await prisma.customer.create({ data: { businessId: fx.A.businessId, name: 'safe' } });
      expect(await softDelete('customer', c2.id, fx.B.businessId)).toEqual({ deleted: false });
      expect(await prismaUnscoped.customer.findUnique({ where: { id: c2.id } })).not.toBeNull();
    });

    // ── Admin data-management (Phase B) ──────────────────────────────────────
    it('owner JWT cannot reach the admin data routes', async () => {
      const res = await asB({ method: 'GET', url: `/api/v1/admin/businesses/${fx.A.businessId}/customers` });
      expect([401, 403]).toContain(res.statusCode);
    });

    it('admin business-customers list is scoped to that business only', async () => {
      const headers = await adminHeaders();
      const res = await app.inject({ method: 'GET', url: `/api/v1/admin/businesses/${fx.A.businessId}/customers?limit=50`, headers });
      expect(res.statusCode).toBe(200);
      const ids = res.json().items.map((r: { id: string }) => r.id);
      expect(ids).toContain(fx.A.customerId);
      expect(ids).not.toContain(fx.B.customerId);
    });

    it('admin single-record fetch resolves the owning business from the record', async () => {
      const headers = await adminHeaders();
      const res = await app.inject({ method: 'GET', url: `/api/v1/admin/customers/${fx.A.customerId}`, headers });
      expect(res.statusCode).toBe(200);
      expect(res.json().businessId).toBe(fx.A.businessId);
    });

    it('admin soft-delete → list excludes → includeDeleted shows → owner cannot see → restore (all audit-logged)', async () => {
      const headers = await adminHeaders();
      const c = await prisma.customer.create({ data: { businessId: fx.A.businessId, name: 'PhaseB target' } });

      const del = await app.inject({ method: 'DELETE', url: `/api/v1/admin/customers/${c.id}`, headers });
      expect(del.statusCode).toBe(200);
      expect(del.json().deleted).toBe(true);

      const list = await app.inject({ method: 'GET', url: `/api/v1/admin/businesses/${fx.A.businessId}/customers?limit=50`, headers });
      expect(list.json().items.map((r: { id: string }) => r.id)).not.toContain(c.id);

      const listDeleted = await app.inject({ method: 'GET', url: `/api/v1/admin/businesses/${fx.A.businessId}/customers?limit=50&includeDeleted=true`, headers });
      const found = listDeleted.json().items.find((r: { id: string }) => r.id === c.id);
      expect(found?.deleted).toBe(true);

      // Same mechanism hides it from the OWNER's app (the soft-delete extension).
      const ownerList = await asA({ method: 'GET', url: '/api/v1/customers?limit=100' });
      expect(ownerList.json().customers.map((r: { id: string }) => r.id)).not.toContain(c.id);

      const restored = await app.inject({ method: 'POST', url: `/api/v1/admin/customers/${c.id}/restore`, headers });
      expect(restored.statusCode).toBe(200);
      expect(restored.json().restored).toBe(true);

      const actions = (await prisma.auditLog.findMany({ where: { targetId: c.id } })).map((a) => a.action);
      expect(actions).toContain('SOFT_DELETE_CUSTOMER');
      expect(actions).toContain('RESTORE_CUSTOMER');
    });

    it('admin edit writes an EDIT_TENANT_RECORD audit entry and never crosses tenants', async () => {
      const headers = await adminHeaders();
      const c = await prisma.customer.create({ data: { businessId: fx.A.businessId, name: 'before' } });
      const res = await app.inject({ method: 'PATCH', url: `/api/v1/admin/customers/${c.id}`, headers, payload: { name: 'after' } });
      expect(res.statusCode).toBe(200);
      const row = await prisma.customer.findUnique({ where: { id: c.id } });
      expect(row?.name).toBe('after');
      expect(row?.businessId).toBe(fx.A.businessId);
      const edits = await prisma.auditLog.findMany({ where: { targetId: c.id, action: 'EDIT_TENANT_RECORD' } });
      expect(edits.length).toBeGreaterThan(0);
    });

    // ── Global search (Phase D) — cross-business, admin-only ─────────────────
    it('global search rejects an owner token', async () => {
      const res = await asB({ method: 'GET', url: '/api/v1/admin/search?q=Biz' });
      expect([401, 403]).toContain(res.statusCode);
    });

    it('global search requires at least 2 characters', async () => {
      const headers = await adminHeaders();
      const res = await app.inject({ method: 'GET', url: '/api/v1/admin/search?q=a', headers });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toEqual([]);
      expect(res.json().message).toBeTruthy();
    });

    it('global search finds a business by name and by owner phone', async () => {
      const headers = await adminHeaders();
      const byName = await app.inject({ method: 'GET', url: '/api/v1/admin/search?q=Biz%20A&type=business', headers });
      expect(byName.statusCode).toBe(200);
      expect(byName.json().items.map((i: { id: string }) => i.id)).toContain(fx.A.businessId);

      const byPhone = await app.inject({ method: 'GET', url: '/api/v1/admin/search?q=998900000001&type=business', headers });
      expect(byPhone.json().items.map((i: { id: string }) => i.id)).toContain(fx.A.businessId);
    });

    it('global search finds customers across businesses, each tagged with its business', async () => {
      const headers = await adminHeaders();
      const res = await app.inject({ method: 'GET', url: '/api/v1/admin/search?q=Cust&type=customer&limit=50', headers });
      expect(res.statusCode).toBe(200);
      const customers = res.json().items as Array<{ id: string; businessId: string; businessName: string }>;
      const ids = customers.map((c) => c.id);
      expect(ids).toContain(fx.A.customerId);
      expect(ids).toContain(fx.B.customerId); // spans tenants
      const a = customers.find((c) => c.id === fx.A.customerId);
      expect(a?.businessId).toBe(fx.A.businessId);
      expect(a?.businessName).toBe('Biz A');

      const byPhone = await app.inject({ method: 'GET', url: '/api/v1/admin/search?q=998911111111&type=customer', headers });
      expect(byPhone.json().items.map((i: { id: string }) => i.id)).toContain(fx.A.customerId);
    });

    it('global search excludes soft-deleted customers by default, includes them flagged when asked', async () => {
      const headers = await adminHeaders();
      const c = await prisma.customer.create({ data: { businessId: fx.A.businessId, name: 'SearchDeletable Zed' } });
      await app.inject({ method: 'DELETE', url: `/api/v1/admin/customers/${c.id}`, headers });

      const def = await app.inject({ method: 'GET', url: '/api/v1/admin/search?q=SearchDeletable&type=customer', headers });
      expect(def.json().items.map((i: { id: string }) => i.id)).not.toContain(c.id);

      const incl = await app.inject({ method: 'GET', url: '/api/v1/admin/search?q=SearchDeletable&type=customer&includeDeleted=true', headers });
      const found = (incl.json().items as Array<{ id: string; deleted: boolean }>).find((i) => i.id === c.id);
      expect(found?.deleted).toBe(true);
    });

    // ── Erasure (Phase C) — irreversible, super-admin only ───────────────────
    it('anonymize + erase are super-admin only (SUPPORT can read but is blocked from erasure)', async () => {
      const email = `support-${Date.now()}@test.local`;
      await prisma.adminUser.create({ data: { email, name: 'Support', role: 'SUPPORT', passwordHash: await bcrypt.hash('support-pw-123', 4) } });
      const login = await app.inject({ method: 'POST', url: '/api/v1/admin/auth/login', payload: { email, password: 'support-pw-123' } });
      const supportHeaders = { authorization: `Bearer ${login.json().token}` };

      // SUPPORT can read tenant data…
      const list = await app.inject({ method: 'GET', url: `/api/v1/admin/businesses/${fx.A.businessId}/customers`, headers: supportHeaders });
      expect(list.statusCode).toBe(200);

      // …but cannot anonymize or erase (requireSuperAdmin).
      const anon = await app.inject({ method: 'POST', url: `/api/v1/admin/customers/${fx.A.customerId}/anonymize`, headers: supportHeaders });
      expect(anon.statusCode).toBe(403);
      const erase = await app.inject({ method: 'POST', url: `/api/v1/admin/businesses/${fx.A.businessId}/erase`, headers: supportHeaders });
      expect(erase.statusCode).toBe(403);

      const row = await prisma.customer.findUnique({ where: { id: fx.A.customerId } });
      expect(row?.anonymizedAt ?? null).toBeNull();
    });

    it('anonymize scrubs personal fields, keeps de-identified records, logs field NAMES only', async () => {
      const headers = await adminHeaders();
      const c = await prisma.customer.create({
        data: { businessId: fx.A.businessId, name: 'Real Person', phone: '+998900000123', telegramUsername: 'realperson', notes: 'sensitive note' },
      });
      const o = await prisma.order.create({
        data: { businessId: fx.A.businessId, customerId: c.id, orderNumber: 9001, total: 1000, deliveryMethod: 'DELIVERY', deliveryAddress: '123 Secret St', customAnswers: { q: 'personal answer' }, timeline: [] },
      });
      await prisma.customerTag.create({ data: { customerId: c.id, businessId: fx.A.businessId, label: 'VIP' } });

      const res = await app.inject({ method: 'POST', url: `/api/v1/admin/customers/${c.id}/anonymize`, headers });
      expect(res.statusCode).toBe(200);
      expect(res.json().anonymized).toBe(true);

      // Personal fields scrubbed, marker set.
      const row = await prisma.customer.findUnique({ where: { id: c.id } });
      expect(row?.name).toBe('Deleted customer');
      expect(row?.phone ?? null).toBeNull();
      expect(row?.telegramUsername ?? null).toBeNull();
      expect(row?.notes ?? null).toBeNull();
      expect(row?.anonymizedAt).not.toBeNull();

      // Transactional record KEPT but de-identified.
      const order = await prisma.order.findUnique({ where: { id: o.id } });
      expect(order).not.toBeNull();
      expect(order?.deliveryAddress ?? null).toBeNull();
      expect(order?.customAnswers ?? null).toBeNull();

      // Tags removed.
      expect(await prisma.customerTag.count({ where: { customerId: c.id } })).toBe(0);

      // Audit logs field NAMES only — never the scrubbed values.
      const audit = await prisma.auditLog.findFirst({ where: { targetId: c.id, action: 'ANONYMIZE_CUSTOMER' } });
      expect(audit).not.toBeNull();
      const meta = JSON.stringify(audit?.metadata ?? {});
      expect(meta).toContain('phone');
      expect(meta).not.toContain('+998900000123');
      expect(meta).not.toContain('Real Person');
      expect(meta).not.toContain('sensitive note');
    });

    // MUST be last — it destroys fixture business A.
    it('erase removes business A\'s full graph + owner in a transaction, keeps audit, never touches B', async () => {
      const headers = await adminHeaders();
      const bCustomersBefore = await prisma.customer.count({ where: { businessId: fx.B.businessId } });

      const res = await app.inject({ method: 'POST', url: `/api/v1/admin/businesses/${fx.A.businessId}/erase`, headers });
      expect(res.statusCode).toBe(200);
      expect(res.json().erased).toBe(true);
      expect(res.json().tableCounts.business).toBe(1);

      // A fully gone — children, business, owner.
      expect(await prisma.business.findUnique({ where: { id: fx.A.businessId } })).toBeNull();
      expect(await prisma.user.findUnique({ where: { id: fx.A.userId } })).toBeNull();
      expect(await prisma.customer.count({ where: { businessId: fx.A.businessId } })).toBe(0);
      expect(await prisma.order.count({ where: { businessId: fx.A.businessId } })).toBe(0);
      expect(await prisma.appointment.count({ where: { businessId: fx.A.businessId } })).toBe(0);
      expect(await prisma.project.count({ where: { businessId: fx.A.businessId } })).toBe(0);

      // B untouched.
      expect(await prisma.business.findUnique({ where: { id: fx.B.businessId } })).not.toBeNull();
      expect(await prisma.customer.count({ where: { businessId: fx.B.businessId } })).toBe(bCustomersBefore);

      // Compliance audit row written AND survives the erasure; no full PII.
      const audit = await prisma.auditLog.findFirst({ where: { targetId: fx.A.businessId, action: 'ERASE_BUSINESS' } });
      expect(audit).not.toBeNull();
      const meta = audit?.metadata as { ownerPhoneLast4?: string; tableCounts?: Record<string, number> };
      expect(meta?.tableCounts?.business).toBe(1);
      expect(meta?.ownerPhoneLast4?.length).toBe(4);
      expect(JSON.stringify(meta)).not.toContain('+998900000001');
    });
  });
});
