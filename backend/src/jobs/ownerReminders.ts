import { prisma } from '../lib/prisma.js';
import { mergeReminderSettings, ReminderSettings } from '../lib/reminderDefaults.js';
import { sendTelegramMessage } from '../lib/telegram.js';
import { getBotToken, hasBotToken } from '../lib/getBotToken.js';
import { sendPushToAll } from '../lib/push.js';

// Cron runs every 15 minutes; each reminder fires when its event falls inside a
// 15-minute window so it is sent exactly once per (business, entity, kind).
const WINDOW_MS = 15 * 60_000;

// The business shape this job needs: identity + modes + settings + the fields
// required to send the owner a Telegram message directly from the backend.
interface BusinessForReminder {
  id: string;
  mode: ('PRODUCTS' | 'SERVICES' | 'FREELANCE')[];
  reminderSettings: unknown;
  suspendedAt: Date | null;
  ownerTelegramChatId: string | null;
  botTokenEncrypted: string | null;
  botTokenIv: string | null;
  botTokenTag: string | null;
}

type EntityType = 'APPOINTMENT' | 'ORDER' | 'MILESTONE' | 'PROJECT';
type ReminderKind = 'FIRST' | 'SECOND';

async function alreadySent(
  businessId: string,
  entityType: EntityType,
  entityId: string,
  reminderKind: ReminderKind,
): Promise<boolean> {
  const existing = await prisma.sentReminder.findUnique({
    where: {
      businessId_entityType_entityId_reminderKind: {
        businessId,
        entityType,
        entityId,
        reminderKind,
      },
    },
  });
  return existing !== null;
}

async function markSent(
  businessId: string,
  entityType: EntityType,
  entityId: string,
  reminderKind: ReminderKind,
): Promise<void> {
  await prisma.sentReminder.create({
    data: { businessId, entityType, entityId, reminderKind },
  });
}

// Sends via BOTH Telegram and push. Either channel failing does not stop the
// other — both are always attempted. Telegram goes directly from the backend
// using the business's own bot token, matching how other owner notifications
// (milestone approval, proposal accepted) are delivered.
async function deliver(
  business: BusinessForReminder,
  title: string,
  body: string,
): Promise<void> {
  const telegramMsg = `📅 ${title}\n\n${body}`;

  await Promise.allSettled([
    hasBotToken(business) && business.ownerTelegramChatId
      ? sendTelegramMessage(getBotToken(business), business.ownerTelegramChatId, telegramMsg)
      : Promise.resolve(),
    sendPushToAll(business.id, title, body),
  ]);
}

function formatUZS(amount: number): string {
  return amount.toLocaleString('en-US').replace(/,/g, ' ') + ' UZS';
}

// Display times in Tashkent time so labels are correct regardless of server TZ.
// The firing windows above use absolute instants and are unaffected by this.
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export async function runOwnerReminders(): Promise<void> {
  console.log('[reminders] Running owner reminder check...');

  const now = new Date();

  const businesses = (await prisma.business.findMany({
    select: {
      id: true,
      mode: true,
      reminderSettings: true,
      suspendedAt: true,
      ownerTelegramChatId: true,
      botTokenEncrypted: true,
      botTokenIv: true,
      botTokenTag: true,
    },
  })) as BusinessForReminder[];

  for (const business of businesses) {
    // No reminders while a business is suspended.
    if (business.suspendedAt) continue;

    const settings = mergeReminderSettings(business.reminderSettings);

    if (business.mode.includes('SERVICES') && settings.appointmentEnabled) {
      await processAppointmentReminders(business, settings, now);
    }

    if (business.mode.includes('PRODUCTS') && settings.deliveryEnabled) {
      await processDeliveryReminders(business, settings, now);
    }

    if (business.mode.includes('FREELANCE') && settings.deadlineEnabled) {
      await processDeadlineReminders(business, settings, now);
    }
  }

  console.log('[reminders] Owner reminder check complete');
}

async function processAppointmentReminders(
  business: BusinessForReminder,
  settings: ReminderSettings,
  now: Date,
): Promise<void> {
  const businessId = business.id;

  // First reminder window
  const firstStart = new Date(now.getTime() + settings.appointmentHoursBefore * 3_600_000);
  const firstEnd = new Date(firstStart.getTime() + WINDOW_MS);

  const firstAppts = await prisma.appointment.findMany({
    where: {
      businessId,
      startTime: { gte: firstStart, lt: firstEnd },
      status: { notIn: ['CANCELLED'] },
      deletedAt: null,
    },
    include: {
      customer: { select: { name: true } },
      service: { select: { name: true } },
    },
  });

  for (const appt of firstAppts) {
    if (await alreadySent(businessId, 'APPOINTMENT', appt.id, 'FIRST')) continue;

    const time = formatTime(new Date(appt.startTime));
    await deliver(
      business,
      'Upcoming appointment',
      `${appt.service?.name || 'Appointment'} with ${appt.customer?.name || 'a customer'} at ${time}`,
    );
    await markSent(businessId, 'APPOINTMENT', appt.id, 'FIRST');
  }

  // Second reminder (e.g. 1 hour before)
  if (settings.appointmentSecondEnabled) {
    const secStart = new Date(now.getTime() + settings.appointmentSecondHoursBefore * 3_600_000);
    const secEnd = new Date(secStart.getTime() + WINDOW_MS);

    const secAppts = await prisma.appointment.findMany({
      where: {
        businessId,
        startTime: { gte: secStart, lt: secEnd },
        status: { notIn: ['CANCELLED'] },
        deletedAt: null,
      },
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true } },
      },
    });

    for (const appt of secAppts) {
      if (await alreadySent(businessId, 'APPOINTMENT', appt.id, 'SECOND')) continue;

      const time = formatTime(new Date(appt.startTime));
      await deliver(
        business,
        'Appointment soon',
        `${appt.service?.name || 'Appointment'} with ${appt.customer?.name || 'a customer'} at ${time}`,
      );
      await markSent(businessId, 'APPOINTMENT', appt.id, 'SECOND');
    }
  }
}

async function processDeliveryReminders(
  business: BusinessForReminder,
  settings: ReminderSettings,
  now: Date,
): Promise<void> {
  const businessId = business.id;

  const start = new Date(now.getTime() + settings.deliveryHoursBefore * 3_600_000);
  const end = new Date(start.getTime() + WINDOW_MS);

  const orders = await prisma.order.findMany({
    where: {
      businessId,
      deliveryDate: { gte: start, lt: end },
      orderStatus: { notIn: ['CANCELLED', 'DELIVERED'] },
      deletedAt: null,
    },
    include: {
      customer: { select: { name: true } },
    },
  });

  for (const order of orders) {
    if (await alreadySent(businessId, 'ORDER', order.id, 'FIRST')) continue;

    await deliver(
      business,
      'Delivery due soon',
      `Order #${order.orderNumber} for ${order.customer?.name || 'a customer'} (${formatUZS(order.total)})`,
    );
    await markSent(businessId, 'ORDER', order.id, 'FIRST');
  }
}

async function processDeadlineReminders(
  business: BusinessForReminder,
  settings: ReminderSettings,
  now: Date,
): Promise<void> {
  const businessId = business.id;

  const start = new Date(now.getTime() + settings.deadlineHoursBefore * 3_600_000);
  const end = new Date(start.getTime() + WINDOW_MS);

  // Milestone due dates
  const milestones = await prisma.milestone.findMany({
    where: {
      dueDate: { gte: start, lt: end },
      deletedAt: null,
      project: {
        businessId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        deletedAt: null,
      },
    },
    include: {
      project: { select: { name: true } },
    },
  });

  for (const m of milestones) {
    if (await alreadySent(businessId, 'MILESTONE', m.id, 'FIRST')) continue;

    await deliver(
      business,
      'Milestone due soon',
      `"${m.name}" for project "${m.project?.name || ''}" is due`,
    );
    await markSent(businessId, 'MILESTONE', m.id, 'FIRST');
  }

  // Project deadlines
  const projects = await prisma.project.findMany({
    where: {
      businessId,
      deadline: { gte: start, lt: end },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      deletedAt: null,
    },
    include: {
      customer: { select: { name: true } },
    },
  });

  for (const p of projects) {
    if (await alreadySent(businessId, 'PROJECT', p.id, 'FIRST')) continue;

    await deliver(
      business,
      'Project deadline soon',
      `"${p.name}" for ${p.customer?.name || 'a client'} is due`,
    );
    await markSent(businessId, 'PROJECT', p.id, 'FIRST');
  }
}
