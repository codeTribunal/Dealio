import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { hasTestDb, SKIP_DB_MESSAGE } from './helpers/env.js';
import { seedTenants, cleanAll, type Fixture } from './helpers/seed.js';
import { prisma } from '../src/lib/prisma.js';

// Owner "free hand" over appointments: create at ANY datetime, edit/reschedule
// regardless of timing, set any status — the ONLY guardrail is an overridable
// overlap warning. The bot booking path stays strict (future, in-hours, free).
if (!hasTestDb()) console.warn(`\n[owner-appointments] ${SKIP_DB_MESSAGE}\n`);
const describeDb = hasTestDb() ? describe : describe.skip;

// ISO instant for a Tashkent (UTC+5) wall-clock time, `daysFromNow` days out.
function tashkentSlot(daysFromNow: number, hour: number, minute = 0): string {
  const base = new Date(Date.now() + daysFromNow * 86_400_000 + 5 * 3_600_000);
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour - 5, minute, 0, 0),
  ).toISOString();
}

describeDb('owner appointments — free hand (past/out-of-hours/status), bot stays strict', () => {
  let app: FastifyInstance;
  let fx: Fixture;
  let tokenA: string;
  let tokenB: string;
  const secret = process.env.BOT_MANAGER_SECRET!;

  const asA = (opts: InjectOptions) =>
    app.inject({ ...opts, headers: { authorization: `Bearer ${tokenA}`, ...opts.headers } });
  const asB = (opts: InjectOptions) =>
    app.inject({ ...opts, headers: { authorization: `Bearer ${tokenB}`, ...opts.headers } });
  const asBot = (opts: InjectOptions) =>
    app.inject({ ...opts, headers: { 'x-bot-secret': secret, ...opts.headers } });

  const ownerCreate = (payload: Record<string, unknown>) =>
    asA({ method: 'POST', url: '/api/v1/appointments', payload });
  const botCreate = (payload: Record<string, unknown>) =>
    asBot({ method: 'POST', url: '/api/v1/bot/appointments', payload });

  // Base owner create body for Business A.
  const baseA = () => ({ customerId: fx.A.customerId, serviceId: fx.A.serviceId });
  const baseBot = () => ({
    botUsername: fx.A.botUsername,
    customerId: fx.A.customerId,
    serviceId: fx.A.serviceId,
  });

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

  // ── Owner: past & out-of-hours are ALLOWED ───────────────────────────────
  it('owner can create a PAST appointment', async () => {
    const res = await ownerCreate({ ...baseA(), startTime: tashkentSlot(-30, 10) });
    expect(res.statusCode).toBe(201);
  });

  it('owner can create an OUT-OF-HOURS appointment (03:00)', async () => {
    const res = await ownerCreate({ ...baseA(), startTime: tashkentSlot(8, 3) });
    expect(res.statusCode).toBe(201);
  });

  // ── Bot: stays strict ────────────────────────────────────────────────────
  it('bot booking still REJECTS a past slot', async () => {
    const res = await botCreate({ ...baseBot(), startTime: tashkentSlot(-31, 10) });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('SLOT_UNAVAILABLE');
  });

  it('bot booking still REJECTS an out-of-hours slot', async () => {
    const res = await botCreate({ ...baseBot(), startTime: tashkentSlot(9, 3) });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('SLOT_UNAVAILABLE');
  });

  // ── Overlap: owner warns + override; bot hard-rejects ────────────────────
  it('owner overlap needs allowConflict (409 APPOINTMENT_CONFLICT, then override succeeds)', async () => {
    const slot = tashkentSlot(11, 10);
    expect((await ownerCreate({ ...baseA(), startTime: slot })).statusCode).toBe(201);

    const blocked = await ownerCreate({ ...baseA(), startTime: slot });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error).toBe('APPOINTMENT_CONFLICT');

    const forced = await ownerCreate({ ...baseA(), startTime: slot, allowConflict: true });
    expect(forced.statusCode).toBe(201);
  });

  it('bot booking still REJECTS an overlapping slot', async () => {
    const slot = tashkentSlot(12, 10);
    expect((await ownerCreate({ ...baseA(), startTime: slot })).statusCode).toBe(201);
    const res = await botCreate({ ...baseBot(), startTime: slot });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('SLOT_UNAVAILABLE');
  });

  // ── Edit / reschedule + self-exclusion ───────────────────────────────────
  it('owner can reschedule an existing appointment, and self-overlap does not falsely trigger', async () => {
    const created = (await ownerCreate({ ...baseA(), startTime: tashkentSlot(13, 10) })).json();

    const newSlot = tashkentSlot(14, 11);
    const moved = await asA({
      method: 'PATCH',
      url: `/api/v1/appointments/${created.id}`,
      payload: { startTime: newSlot },
    });
    expect(moved.statusCode).toBe(200);
    expect(new Date(moved.json().startTime).toISOString()).toBe(newSlot);

    // Re-saving the SAME time must not conflict with the row's own slot.
    const noop = await asA({
      method: 'PATCH',
      url: `/api/v1/appointments/${created.id}`,
      payload: { startTime: newSlot },
    });
    expect(noop.statusCode).toBe(200);
  });

  it('owner reschedule onto another booking warns, and allowConflict overrides', async () => {
    const occupied = tashkentSlot(15, 10);
    expect((await ownerCreate({ ...baseA(), startTime: occupied })).statusCode).toBe(201);
    const other = (await ownerCreate({ ...baseA(), startTime: tashkentSlot(16, 10) })).json();

    const warn = await asA({
      method: 'PATCH',
      url: `/api/v1/appointments/${other.id}`,
      payload: { startTime: occupied },
    });
    expect(warn.statusCode).toBe(409);
    expect(warn.json().error).toBe('APPOINTMENT_CONFLICT');

    const forced = await asA({
      method: 'PATCH',
      url: `/api/v1/appointments/${other.id}`,
      payload: { startTime: occupied, allowConflict: true },
    });
    expect(forced.statusCode).toBe(200);
  });

  // ── Status: set anything, anytime, including changing a terminal one ──────
  it('owner can set ANY status directly, including reopening a terminal one', async () => {
    const created = (await ownerCreate({ ...baseA(), startTime: tashkentSlot(17, 10) })).json();

    const toCompleted = await asA({
      method: 'PATCH',
      url: `/api/v1/appointments/${created.id}/status`,
      payload: { status: 'COMPLETED' },
    });
    expect(toCompleted.statusCode).toBe(200);

    // Reopen a terminal status — the owner is correcting records.
    const reopen = await asA({
      method: 'PATCH',
      url: `/api/v1/appointments/${created.id}/status`,
      payload: { status: 'REQUESTED' },
    });
    expect(reopen.statusCode).toBe(200);

    // Status is also settable via the unified edit route.
    const viaEdit = await asA({
      method: 'PATCH',
      url: `/api/v1/appointments/${created.id}`,
      payload: { status: 'NO_SHOW' },
    });
    expect(viaEdit.statusCode).toBe(200);
    const row = await prisma.appointment.findUnique({ where: { id: created.id } });
    expect(row?.status).toBe('NO_SHOW');
  });

  // ── Cross-business edit is forbidden ─────────────────────────────────────
  it('owner B cannot edit Business A appointment (404, A unchanged)', async () => {
    const res = await asB({
      method: 'PATCH',
      url: `/api/v1/appointments/${fx.A.appointmentId}`,
      payload: { notes: 'hijack', status: 'CANCELLED' },
    });
    expect(res.statusCode).toBe(404);
    const row = await prisma.appointment.findUnique({ where: { id: fx.A.appointmentId } });
    expect(row?.notes ?? null).toBeNull();
    expect(row?.status).toBe('REQUESTED');
  });
});
