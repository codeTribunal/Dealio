/**
 * DB-gated integration test for the irreversible customer erase scrub
 * (src/services/anonymizeCustomer.ts). Proves the shared anonymize path removes
 * every piece of customer PII — including Order.notes / internalNotes, the
 * Order.timeline free-text `note`, and Appointment.notes — while KEEPING the
 * de-identified transactional records, and that it is idempotent.
 *
 * HOW TO RUN (this test performs IRREVERSIBLE deletes — scratch DB only):
 *   1. Bring up a throwaway Postgres, e.g. local Docker:
 *        docker run --rm -e POSTGRES_PASSWORD=pw -p 5433:5432 -d postgres:16
 *      (or create a disposable Railway "scratch" DB — NOT production).
 *   2. Apply the existing migrations to it:
 *        DATABASE_URL="postgresql://postgres:pw@localhost:5433/postgres" npx prisma migrate deploy
 *   3. Run only this test against that scratch DB:
 *        TEST_DATABASE_URL="postgresql://postgres:pw@localhost:5433/postgres" npx vitest run test/erase-scrub.test.ts
 *
 * SAFETY: with TEST_DATABASE_URL unset the suite SKIPS (does not fail). If
 * TEST_DATABASE_URL looks like the production/Railway host, or matches the app's
 * configured DATABASE_URL, beforeAll THROWS and nothing is touched.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
// The REAL shared scrub under test. It uses the app's Prisma client
// (prismaUnscoped → DATABASE_URL, which test/setup.ts pins to TEST_DATABASE_URL),
// so it hits the SAME scratch DB as our own client below. We seed and assert
// through our OWN client (`db`), pointed explicitly at TEST_DATABASE_URL.
import { anonymizeCustomer } from '../src/services/anonymizeCustomer.js';

const TEST_URL = process.env.TEST_DATABASE_URL;
const PROD_HOST = 'autorack.proxy.rlwy.net';

/** The app's configured (production) DATABASE_URL, read from backend/.env — which
 *  Vitest deliberately does NOT load (envDir is ./test). test/setup.ts overwrites
 *  process.env.DATABASE_URL with TEST_DATABASE_URL, so we compare against the .env
 *  file instead of the (already-overwritten) live env var. Best-effort: a missing
 *  .env just yields null and the host guard still protects. */
function appConfiguredDatabaseUrl(): string | null {
  try {
    const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    const m = text.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m);
    if (!m) return null;
    return m[1].replace(/^["']|["']$/g, '').trim();
  } catch {
    return null;
  }
}

/** Refuse to ever run these destructive deletes against production. Throws. */
function assertScratchDatabase(url: string): void {
  const prodUrl = appConfiguredDatabaseUrl();
  if (
    url.includes(PROD_HOST) ||
    /railway|rlwy\.net|autorack|proxy\.rlwy/i.test(url) ||
    (prodUrl !== null && url === prodUrl)
  ) {
    throw new Error(
      'SAFETY ABORT: TEST_DATABASE_URL resolves to the production database. The erase ' +
        'test performs IRREVERSIBLE deletes and must only run against a throwaway scratch ' +
        'Postgres. Point TEST_DATABASE_URL at a disposable DB and never at production.',
    );
  }
}

// Skip cleanly (exit 0) when no scratch DB is configured.
if (!TEST_URL) {
  console.warn('\n[erase-scrub] set TEST_DATABASE_URL to a scratch DB to run erase tests\n');
}
const describeDb = TEST_URL ? describe : describe.skip;

describeDb('customer erase / anonymizeCustomer — irreversible PII scrub', () => {
  // Our OWN client (not the app default), pointed at the scratch DB. Constructed
  // inside beforeAll so a skipped run never instantiates it.
  let db: PrismaClient;

  const ids = {
    userId: '',
    businessId: '',
    customerId: '',
    fieldId: '',
    orderId: '',
    serviceId: '',
    appointmentId: '',
  };

  // Stable ISO stamps used both to seed the timeline and to assert survivors.
  const isoNew = '2026-06-01T10:00:00.000Z';
  const isoPreparing = '2026-06-01T11:00:00.000Z';
  const isoReady = '2026-06-01T12:00:00.000Z';

  beforeAll(async () => {
    // HARD GUARD first — throws (never proceeds) if this looks like production.
    assertScratchDatabase(TEST_URL!);
    db = new PrismaClient({ datasources: { db: { url: TEST_URL! } } });

    const user = await db.user.create({ data: { phone: '+998905550001' } });
    const business = await db.business.create({
      data: { name: 'Erase Test Biz', mode: 'SERVICES', ownerId: user.id },
    });
    const customer = await db.customer.create({
      data: {
        businessId: business.id,
        name: 'Ali Valiyev',
        phone: '+998901234567',
        telegramUserId: 'tg_erase_1',
        telegramUsername: 'ali_v',
        notes: 'prefers mornings; allergic to peanuts',
        birthday: new Date('1990-05-15T00:00:00.000Z'),
        customFields: { vip: true, ref: 'instagram' },
        consentedAt: new Date('2026-07-01T00:00:00.000Z'),
        consentVersion: '2026-07-01',
      },
    });
    const field = await db.businessCustomField.create({
      data: { businessId: business.id, name: 'Instagram handle' },
    });
    await db.customerFieldValue.create({
      data: { customerId: customer.id, fieldId: field.id, value: '@ali_ig' },
    });
    await db.customerTag.create({
      data: { customerId: customer.id, businessId: business.id, label: 'VIP' },
    });
    const order = await db.order.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        orderNumber: 1,
        total: 150000,
        deliveryMethod: 'DELIVERY',
        deliveryAddress: 'Tashkent, Chilanzar 12-45',
        notes: 'ring the bell twice',
        internalNotes: 'customer Ali, call 998901234567',
        customAnswers: { 'Gift wrap?': 'yes', Message: 'Happy birthday Ali' },
        // Structured status history; the PREPARING entry carries free-text PII in
        // `note`, and the READY entry carries an extra unexpected key too — both
        // must be stripped while the entries themselves (status/at/by) survive.
        timeline: [
          { status: 'NEW', at: isoNew, by: 'bot' },
          { status: 'PREPARING', at: isoPreparing, by: 'owner', note: 'call customer Ali on 998901234567' },
          { status: 'READY', at: isoReady, by: 'owner', note: 'left at door', internalRef: 'secret-ref' },
        ],
      },
    });
    const service = await db.service.create({
      data: { businessId: business.id, name: 'Haircut', durationMinutes: 60, price: 80000 },
    });
    const appointment = await db.appointment.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        serviceId: service.id,
        startTime: new Date('2026-08-01T09:00:00.000Z'),
        endTime: new Date('2026-08-01T10:00:00.000Z'),
        price: 80000,
        notes: 'first-time client, Ali',
      },
    });

    ids.userId = user.id;
    ids.businessId = business.id;
    ids.customerId = customer.id;
    ids.fieldId = field.id;
    ids.orderId = order.id;
    ids.serviceId = service.id;
    ids.appointmentId = appointment.id;
  });

  afterAll(async () => {
    if (!db) return;
    try {
      // FK-safe teardown (child → parent), scoped to this test's business only.
      await db.customerFieldValue.deleteMany({ where: { customerId: ids.customerId } });
      await db.customerTag.deleteMany({ where: { customerId: ids.customerId } });
      await db.appointment.deleteMany({ where: { businessId: ids.businessId } });
      await db.order.deleteMany({ where: { businessId: ids.businessId } });
      await db.service.deleteMany({ where: { businessId: ids.businessId } });
      await db.businessCustomField.deleteMany({ where: { businessId: ids.businessId } });
      await db.customer.deleteMany({ where: { businessId: ids.businessId } });
      await db.business.deleteMany({ where: { id: ids.businessId } });
      await db.user.deleteMany({ where: { id: ids.userId } });
    } finally {
      await db.$disconnect();
    }
  });

  /** Assert the full post-erase state. Re-usable so we can prove idempotency. */
  async function assertScrubbed(): Promise<void> {
    const c = await db.customer.findUnique({ where: { id: ids.customerId } });
    expect(c).not.toBeNull();
    expect(c!.name).toBe('Deleted customer');
    expect(c!.phone).toBeNull();
    expect(c!.telegramUserId).toBeNull();
    expect(c!.telegramUsername).toBeNull();
    expect(c!.notes).toBeNull();
    expect(c!.birthday).toBeNull();
    expect(c!.customFields).toBeNull(); // Prisma DbNull reads back as null
    expect(c!.anonymizedAt).not.toBeNull();
    expect(c!.consentedAt).toBeNull();
    expect(c!.consentVersion).toBeNull();

    // Personal custom-field values and tags are deleted outright.
    expect(await db.customerFieldValue.count({ where: { customerId: ids.customerId } })).toBe(0);
    expect(await db.customerTag.count({ where: { customerId: ids.customerId } })).toBe(0);

    const o = await db.order.findUnique({ where: { id: ids.orderId } });
    expect(o).not.toBeNull(); // order RETAINED — erase scrubs PII, keeps the record
    expect(o!.notes).toBeNull();
    expect(o!.internalNotes).toBeNull();
    expect(o!.deliveryAddress).toBeNull();
    expect(o!.customAnswers).toBeNull();

    // timeline: history preserved (non-empty), but every entry stripped to the
    // structured status fields only — no `note`, no other free-text key remains.
    const timeline = o!.timeline as unknown as Array<Record<string, unknown>>;
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline.length).toBe(3); // no entries dropped
    const ALLOWED = new Set(['status', 'at', 'by']);
    for (const entry of timeline) {
      const keys = Object.keys(entry);
      expect(keys.every((k) => ALLOWED.has(k))).toBe(true);
      expect('note' in entry).toBe(false);
      expect('internalRef' in entry).toBe(false);
    }
    // The specific seeded PREPARING entry lost its note but kept status/at/by.
    const preparing = timeline.find((e) => e.status === 'PREPARING');
    expect(preparing).toBeDefined();
    expect(preparing!.at).toBe(isoPreparing);
    expect(preparing!.by).toBe('owner');
    expect('note' in preparing!).toBe(false);

    // Appointment free-text notes scrubbed.
    const a = await db.appointment.findUnique({ where: { id: ids.appointmentId } });
    expect(a).not.toBeNull();
    expect(a!.notes).toBeNull();
  }

  it('scrubs all customer PII + timeline notes, retains records, and is idempotent', async () => {
    // First erase.
    await anonymizeCustomer(ids.customerId);
    await assertScrubbed();

    // IDEMPOTENCY: a second erase completes without error (re-nulling nulls and
    // re-stripping stripped timelines are no-ops) and every assertion still holds.
    await anonymizeCustomer(ids.customerId);
    await assertScrubbed();
  });
});
