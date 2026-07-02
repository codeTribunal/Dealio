/**
 * Local development seed — refuses to run against anything but localhost.
 *
 * Idempotent: wipes and recreates the dev business (keyed by OWNER_PHONE) on
 * every run. Also (re)issues the fixed LOGIN code 1234 for the dev owner —
 * the real auth flow has no dev bypass (codes are HMAC-hashed OtpCode rows
 * normally delivered via the platform Telegram bot), so the seed creates the
 * row itself. Login locally with:
 *   POST /auth/login/request { phone: "+998901234567" }            (generic 200)
 *   POST /auth/login/verify  { phone: "+998901234567", code: "123456",
 *                              generalConsent: true, crossBorderConsent: true }
 * (The route validates codes as exactly 6 digits, so the classic "1234" dev
 * code is impossible — 123456 is the local equivalent.)
 * The code expires 24h after seeding — re-run the seed to refresh it.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { hashCode } from '../src/lib/authCodes.js';

const prisma = new PrismaClient();

// HARD GUARD: local dev databases only. The check runs after the Prisma client
// import so .env has been loaded either way; a missing URL also refuses.
const dbUrl = process.env.DATABASE_URL ?? '';
if (!dbUrl.includes('localhost')) {
  console.error('[seed] REFUSING to run: DATABASE_URL must point at localhost (local dev DB only).');
  process.exit(1);
}

const OWNER_PHONE = '+998901234567';
const ADMIN_EMAIL = 'dev@dealio.uz';
const ADMIN_PASSWORD = 'dealio-dev-2026';
const DEV_LOGIN_CODE = '123456';

const DAY_MS = 24 * 60 * 60 * 1000;
const at = (daysFromNow: number, hour: number, minute = 0): Date => {
  const d = new Date(Date.now() + daysFromNow * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d;
};

// Mon–Sat 09:00–18:00, closed Sunday (keys "0".."6", 0 = Sunday).
const WORKING_HOURS = {
  '0': null,
  '1': { start: '09:00', end: '18:00' },
  '2': { start: '09:00', end: '18:00' },
  '3': { start: '09:00', end: '18:00' },
  '4': { start: '09:00', end: '18:00' },
  '5': { start: '09:00', end: '18:00' },
  '6': { start: '10:00', end: '16:00' },
};

/** Delete the dev business and all its children (FK-safe order, no DB cascades). */
async function wipeBusiness(businessId: string) {
  await prisma.orderItem.deleteMany({ where: { order: { businessId } } });
  await prisma.invoice.deleteMany({ where: { project: { businessId } } });
  await prisma.milestone.deleteMany({ where: { project: { businessId } } });
  await prisma.order.deleteMany({ where: { businessId } });
  await prisma.appointment.deleteMany({ where: { businessId } });
  await prisma.project.deleteMany({ where: { businessId } });
  await prisma.staffService.deleteMany({ where: { staff: { businessId } } });
  await prisma.blockedSlot.deleteMany({ where: { businessId } });
  await prisma.customerFieldValue.deleteMany({ where: { customer: { businessId } } });
  await prisma.customerTag.deleteMany({ where: { businessId } });
  await prisma.reminder.deleteMany({ where: { businessId } });
  await prisma.sentReminder.deleteMany({ where: { businessId } });
  await prisma.deviceToken.deleteMany({ where: { businessId } });
  await prisma.usageLog.deleteMany({ where: { businessId } });
  await prisma.customer.deleteMany({ where: { businessId } });
  await prisma.product.deleteMany({ where: { businessId } });
  await prisma.service.deleteMany({ where: { businessId } });
  await prisma.staff.deleteMany({ where: { businessId } });
  await prisma.checkoutQuestion.deleteMany({ where: { businessId } });
  await prisma.customerStage.deleteMany({ where: { businessId } });
  await prisma.businessCustomField.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
}

async function main() {
  // ── Owner + business (wipe previous run first) ─────────────────────────────
  const existingUser = await prisma.user.findUnique({
    where: { phone: OWNER_PHONE },
    include: { business: { select: { id: true } } },
  });
  if (existingUser?.business) await wipeBusiness(existingUser.business.id);

  const owner = await prisma.user.upsert({
    where: { phone: OWNER_PHONE },
    update: {},
    create: { phone: OWNER_PHONE },
  });

  // NOTE: schema has a single scalar `mode` (Mode[] was migrated away); the
  // seeded data still covers products + services + freelance regardless.
  const business = await prisma.business.create({
    data: {
      name: 'Dev Bakery',
      description: 'Local development business — seeded data.',
      mode: 'SERVICES',
      language: 'UZBEK',
      ownerId: owner.id,
      workingHours: WORKING_HOURS,
      cardNumber: '8600123412341234',
      cardHolderName: 'DEV BAKERY',
      address: 'Toshkent, Chilonzor 9',
    },
  });

  // ── Products ───────────────────────────────────────────────────────────────
  const productRows = [
    { name: 'Napoleon torti', price: 250_000, unlimited: false, stockQty: 4, prepTime: '2 kun' },
    { name: 'Medovik', price: 180_000, unlimited: false, stockQty: 7, prepTime: '1 kun' },
    { name: 'Cheesecake', price: 220_000, unlimited: true, stockQty: null, prepTime: null },
    { name: 'Eclair (6 dona)', price: 90_000, unlimited: true, stockQty: null, prepTime: null },
    { name: 'Cupcake to‘plami', price: 120_000, unlimited: false, stockQty: 0, prepTime: '1 kun' },
  ];
  const products: { id: string; price: number }[] = [];
  for (const row of productRows) {
    products.push(
      await prisma.product.create({
        data: { businessId: business.id, description: null, photos: [], ...row },
      }),
    );
  }

  // ── Customers ──────────────────────────────────────────────────────────────
  const customerRows = [
    { name: 'Aziza Karimova', phone: '+998901112233' },
    { name: 'Bekzod Tashkentov', phone: '+998902223344' },
    { name: 'Dilnoza Yusupova', phone: '+998903334455' },
    { name: 'Eldor Rashidov', phone: '+998904445566' },
    { name: 'Feruza Alimova', phone: '+998905556677' },
    { name: 'G‘ulom Nazarov', phone: '+998906667788' },
    { name: 'Hulkar Saidova', phone: '+998907778899' },
    { name: 'Islom Berdiyev', phone: null },
  ];
  const customers: { id: string }[] = [];
  for (const row of customerRows) {
    customers.push(
      await prisma.customer.create({
        data: {
          businessId: business.id,
          ...row,
          languagePreference: 'UZBEK',
          consentedAt: new Date(),
          consentVersion: '2026-07-01',
        },
      }),
    );
  }

  // ── Orders (mixed statuses / payment states) ───────────────────────────────
  const orderPlan: Array<{ status: string; pay: string; delivery: string }> = [
    { status: 'NEW', pay: 'PENDING', delivery: 'PICKUP' },
    { status: 'NEW', pay: 'PAYMENT_RECEIVED', delivery: 'DELIVERY' },
    { status: 'PREPARING', pay: 'CONFIRMED', delivery: 'PICKUP' },
    { status: 'PREPARING', pay: 'PENDING', delivery: 'DELIVERY' },
    { status: 'READY', pay: 'CONFIRMED', delivery: 'PICKUP' },
    { status: 'READY', pay: 'PAYMENT_RECEIVED', delivery: 'PICKUP' },
    { status: 'DELIVERED', pay: 'CONFIRMED', delivery: 'DELIVERY' },
    { status: 'DELIVERED', pay: 'CONFIRMED', delivery: 'PICKUP' },
    { status: 'CANCELLED', pay: 'PENDING', delivery: 'PICKUP' },
    { status: 'DELIVERED', pay: 'CONFIRMED', delivery: 'DELIVERY' },
  ];
  let ordersCreated = 0;
  for (let i = 0; i < orderPlan.length; i++) {
    const plan = orderPlan[i];
    const product = products[i % products.length];
    const second = products[(i + 2) % products.length];
    const qty = (i % 2) + 1;
    const total = product.price * qty + (i % 3 === 0 ? second.price : 0);
    await prisma.order.create({
      data: {
        businessId: business.id,
        customerId: customers[i % customers.length].id,
        orderNumber: i + 1,
        total,
        deliveryMethod: plan.delivery as never,
        deliveryAddress: plan.delivery === 'DELIVERY' ? 'Toshkent, Yunusobod 12' : null,
        deliveryDate: at(1 + (i % 5), 14),
        orderStatus: plan.status as never,
        paymentStatus: plan.pay as never,
        timeline: [
          { status: 'NEW', at: new Date(Date.now() - (i + 1) * DAY_MS).toISOString(), by: 'bot' },
          ...(plan.status !== 'NEW'
            ? [{ status: plan.status, at: new Date().toISOString(), by: 'owner' }]
            : []),
        ] as Prisma.InputJsonValue[],
        items: {
          create: [
            { productId: product.id, quantity: qty, price: product.price },
            ...(i % 3 === 0 ? [{ productId: second.id, quantity: 1, price: second.price }] : []),
          ],
        },
      },
    });
    ordersCreated++;
  }

  // ── Services + staff ───────────────────────────────────────────────────────
  const serviceRows = [
    { name: 'Tort bezash masterklassi', durationMinutes: 90, price: 300_000 },
    { name: 'Individual konsultatsiya', durationMinutes: 30, price: 100_000 },
    { name: 'Toy torti degustatsiyasi', durationMinutes: 45, price: 150_000 },
    { name: 'Shirinlik fotosessiyasi', durationMinutes: 60, price: 250_000 },
  ];
  const services: { id: string; price: number; durationMinutes: number }[] = [];
  for (const row of serviceRows) {
    services.push(await prisma.service.create({ data: { businessId: business.id, ...row } }));
  }

  const staff = await prisma.staff.create({
    data: {
      businessId: business.id,
      name: 'Aziza (usta)',
      telegramHandle: '@aziza_dev',
      workingHours: WORKING_HOURS,
      staffServices: { create: services.map((s) => ({ serviceId: s.id })) },
    },
  });

  // ── Appointments across statuses ───────────────────────────────────────────
  const apptPlan = ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  for (let i = 0; i < apptPlan.length; i++) {
    const service = services[i % services.length];
    // COMPLETED / CANCELLED / NO_SHOW in the past, the rest upcoming.
    const dayOffset = i >= 2 ? -(i + 1) : i + 1;
    const start = at(dayOffset, 10 + i);
    await prisma.appointment.create({
      data: {
        businessId: business.id,
        customerId: customers[(i + 3) % customers.length].id,
        serviceId: service.id,
        staffId: staff.id,
        startTime: start,
        endTime: new Date(start.getTime() + service.durationMinutes * 60_000),
        price: service.price,
        status: apptPlan[i] as never,
        paymentStatus: i === 2 ? 'CONFIRMED' : 'PENDING',
      },
    });
  }

  // ── Projects + milestones + invoices ───────────────────────────────────────
  const projectPlans = [
    {
      name: 'Toy torti — 3 qavatli',
      status: 'IN_PROGRESS',
      totalPrice: 2_500_000,
      invoiceNumber: 'INV-DEV-001',
      invoiceStatus: 'PAID',
    },
    {
      name: 'Korporativ shirinliklar seti',
      status: 'PROPOSAL_SENT',
      totalPrice: 1_800_000,
      invoiceNumber: 'INV-DEV-002',
      invoiceStatus: 'UNPAID',
    },
  ];
  for (let i = 0; i < projectPlans.length; i++) {
    const plan = projectPlans[i];
    await prisma.project.create({
      data: {
        businessId: business.id,
        customerId: customers[i].id,
        name: plan.name,
        description: 'Seeded dev project.',
        totalPrice: plan.totalPrice,
        startDate: at(-7 * (i + 1), 9),
        deadline: at(14 * (i + 1), 18),
        status: plan.status as never,
        milestones: {
          create: [
            {
              name: 'Dizayn tasdiqlash',
              amount: Math.round(plan.totalPrice / 2),
              dueDate: at(3 + i, 12),
              status: i === 0 ? 'APPROVED' : 'PENDING',
            },
            {
              name: 'Yakuniy topshirish',
              amount: plan.totalPrice - Math.round(plan.totalPrice / 2),
              dueDate: at(10 + i, 12),
              status: 'PENDING',
            },
          ],
        },
        invoices: {
          create: [
            {
              invoiceNumber: plan.invoiceNumber,
              lineItems: [
                { description: plan.name, quantity: 1, unitPrice: plan.totalPrice },
              ] as Prisma.InputJsonValue[],
              total: plan.totalPrice,
              dueDate: at(7, 18),
              status: plan.invoiceStatus as never,
            },
          ],
        },
      },
    });
  }

  // ── Super admin ────────────────────────────────────────────────────────────
  await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'SUPER_ADMIN', passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 12) },
    create: {
      email: ADMIN_EMAIL,
      name: 'Dev Admin',
      role: 'SUPER_ADMIN',
      passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 12),
    },
  });

  // ── Fixed dev LOGIN code (single live code per phone+purpose) ──────────────
  await prisma.otpCode.updateMany({
    where: { phone: OWNER_PHONE, purpose: 'LOGIN', consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.otpCode.create({
    data: {
      phone: OWNER_PHONE,
      purpose: 'LOGIN',
      userId: owner.id,
      codeHash: hashCode(DEV_LOGIN_CODE),
      expiresAt: new Date(Date.now() + DAY_MS),
    },
  });

  console.log('[seed] Done. Dev business:', business.id);
  console.log(`[seed]   products: ${products.length}, customers: ${customers.length}, orders: ${ordersCreated}`);
  console.log(`[seed]   services: ${services.length}, staff: 1, appointments: ${apptPlan.length}`);
  console.log(`[seed]   projects: ${projectPlans.length} (2 milestones + 1 invoice each)`);
  console.log(`[seed] Owner login: ${OWNER_PHONE} with code ${DEV_LOGIN_CODE} (valid 24h, re-seed to refresh)`);
  console.log(`[seed] Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('[seed] FAILED:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
