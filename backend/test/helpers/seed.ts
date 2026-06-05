import bcrypt from 'bcrypt';
import { prisma } from '../../src/lib/prisma.js';
import { encryptBotToken } from '../../src/lib/crypto.js';

export interface TenantIds {
  userId: string;
  businessId: string;
  botUsername: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  appointmentId: string;
  productId: string;
  orderId: string;
  orderItemId: string;
  projectId: string;
  milestoneId: string;
  invoiceId: string;
  blockedSlotId: string;
}

export interface Fixture {
  A: TenantIds;
  B: TenantIds;
  admin: { email: string; password: string };
}

const ADMIN_EMAIL = 'isolation-admin@test.local';
const ADMIN_PASSWORD = 'test-admin-password';

/** Refuse to mutate anything that looks like the production/Railway DB. */
function assertNotProduction(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (/railway|rlwy\.net|autorack|proxy\.rlwy/i.test(url)) {
    throw new Error('SAFETY ABORT: refusing to seed/truncate a production/Railway database.');
  }
}

/** Delete every seeded row in FK-safe (child → parent) order. Repeatable. */
export async function cleanAll(): Promise<void> {
  assertNotProduction();
  await prisma.auditLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.blockedSlot.deleteMany({});
  await prisma.staffService.deleteMany({});
  await prisma.customerFieldValue.deleteMany({});
  await prisma.customerTag.deleteMany({});
  await prisma.reminder.deleteMany({});
  await prisma.sentReminder.deleteMany({});
  await prisma.usageLog.deleteMany({});
  await prisma.deviceToken.deleteMany({});
  await prisma.checkoutQuestion.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.customerStage.deleteMany({});
  await prisma.businessCustomField.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.consentRecord.deleteMany({});
  await prisma.business.deleteMany({});
  await prisma.adminUser.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.otpCode.deleteMany({});
  await prisma.linkToken.deleteMany({});
}

async function seedBusiness(key: 'A' | 'B'): Promise<TenantIds> {
  const enc = encryptBotToken(`100000${key === 'A' ? 1 : 2}:FAKE_TEST_BOT_TOKEN_${'x'.repeat(30)}`);

  const user = await prisma.user.create({
    data: { phone: key === 'A' ? '+998900000001' : '+998900000002' },
  });

  const business = await prisma.business.create({
    data: {
      name: `Biz ${key}`,
      mode: 'SERVICES',
      ownerId: user.id,
      botUsername: `test_biz_${key.toLowerCase()}_bot`,
      cardNumber: '8600123456781234',
      cardBank: 'UZCARD',
      ownerTelegramChatId: `owner_chat_${key}`,
      botTokenEncrypted: enc.encrypted,
      botTokenIv: enc.iv,
      botTokenTag: enc.tag,
    },
  });

  const customer = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: `Cust ${key}`,
      telegramUserId: `tg_${key}`,
      phone: key === 'A' ? '+998911111111' : '+998922222222',
    },
  });

  const service = await prisma.service.create({
    data: { businessId: business.id, name: `Svc ${key}`, durationMinutes: 60, price: 100000 },
  });

  const staff = await prisma.staff.create({
    data: { businessId: business.id, name: `Staff ${key}` },
  });

  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const appointment = await prisma.appointment.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      serviceId: service.id,
      staffId: staff.id,
      startTime: start,
      endTime: end,
      price: 100000,
    },
  });

  const product = await prisma.product.create({
    data: { businessId: business.id, name: `Prod ${key}`, price: 50000, active: true },
  });

  const order = await prisma.order.create({
    data: {
      businessId: business.id,
      customerId: customer.id,
      orderNumber: 1,
      total: 50000,
      deliveryMethod: 'PICKUP',
      // CONFIRMED so it surfaces in analytics — lets us prove B's analytics
      // never include A's confirmed revenue/customers.
      paymentStatus: 'CONFIRMED',
      timeline: [],
      items: { create: [{ productId: product.id, quantity: 1, price: 50000 }] },
    },
    include: { items: true },
  });

  const project = await prisma.project.create({
    data: { businessId: business.id, customerId: customer.id, name: `Proj ${key}`, totalPrice: 1000000 },
  });

  const milestone = await prisma.milestone.create({
    data: { projectId: project.id, name: `MS ${key}`, amount: 500000 },
  });

  const invoice = await prisma.invoice.create({
    data: { projectId: project.id, invoiceNumber: `INV-${key}-001`, lineItems: [], total: 500000 },
  });

  const blockedSlot = await prisma.blockedSlot.create({
    data: { businessId: business.id, startTime: start, endTime: end, reason: 'test' },
  });

  return {
    userId: user.id,
    businessId: business.id,
    botUsername: business.botUsername!,
    customerId: customer.id,
    serviceId: service.id,
    staffId: staff.id,
    appointmentId: appointment.id,
    productId: product.id,
    orderId: order.id,
    orderItemId: order.items[0].id,
    projectId: project.id,
    milestoneId: milestone.id,
    invoiceId: invoice.id,
    blockedSlotId: blockedSlot.id,
  };
}

/** Wipe and recreate Business A + Business B (+ a super-admin). Repeatable. */
export async function seedTenants(): Promise<Fixture> {
  assertNotProduction();
  await cleanAll();

  const A = await seedBusiness('A');
  const B = await seedBusiness('B');

  await prisma.adminUser.create({
    data: {
      email: ADMIN_EMAIL,
      name: 'Isolation Test Admin',
      role: 'SUPER_ADMIN',
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 4),
    },
  });

  return { A, B, admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } };
}
