import axios from 'axios';
import { Bot } from 'grammy';
import { MyContext } from '../lib/types.js';
import { getBotUsername } from '../lib/botContext.js';
import { formatUZS, formatDateTZ, formatTimeTZ } from '../lib/format.js';

const client = axios.create({
  baseURL: process.env.BACKEND_URL ?? 'http://localhost:3000',
  headers: {
    'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '',
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

interface ReminderAppointment {
  id: string;
  startTime: string;
  price: number;
  service: { name: string };
  staff: { name: string } | null;
  customer: {
    id: string;
    name: string;
    telegramUserId: string | null;
  };
  business: {
    name: string;
    ownerTelegramChatId: string | null;
  };
}

async function fetchDueReminders(): Promise<ReminderAppointment[]> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60_000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60_000);

  const res = await client.get('/api/v1/bot/due-reminders', {
    params: {
      botUsername: getBotUsername(),
      from: in24h.toISOString(),
      to: in25h.toISOString(),
    },
  });
  return res.data;
}

async function markReminderSent(appointmentId: string): Promise<void> {
  await client.post('/api/v1/bot/mark-reminder-sent', {
    botUsername: getBotUsername(),
    appointmentId,
  });
}

async function processReminders(bot: Bot<MyContext>): Promise<void> {
  let appointments: ReminderAppointment[];
  try {
    appointments = await fetchDueReminders();
  } catch (err) {
    console.error('[reminders] Failed to fetch due reminders:', err);
    return;
  }

  for (const appt of appointments) {
    const { customer, service, staff, business } = appt;
    if (!customer.telegramUserId) {
      await markReminderSent(appt.id).catch(() => {});
      continue;
    }

    const dateLabel = formatDateTZ(appt.startTime);
    const timeLabel = formatTimeTZ(appt.startTime);
    const staffLine = staff ? ` with ${staff.name}` : '';

    const text =
      `⏰ <b>Reminder from ${business.name}</b>\n\n` +
      `You have a <b>${service.name}</b>${staffLine} appointment tomorrow.\n` +
      `📅 ${dateLabel} at ${timeLabel}\n` +
      `💰 ${formatUZS(appt.price)}\n\n` +
      `Reply <b>CANCEL</b> to this message if you need to cancel.`;

    try {
      await bot.api.sendMessage(customer.telegramUserId, text, { parse_mode: 'HTML' });
      await markReminderSent(appt.id);
      console.log(`[reminders] Sent reminder for appointment ${appt.id} to ${customer.name}`);
    } catch (err) {
      console.error(`[reminders] Failed to send reminder for appointment ${appt.id}:`, err);
    }
  }
}

export function registerCancelReplyHandler(bot: Bot<MyContext>): void {
  bot.hears(/^CANCEL$/i, async (ctx) => {
    const telegramUserId = String(ctx.from?.id ?? '');
    if (!telegramUserId) return;

    try {
      const res = await client.get(
        `/api/v1/bot/customer-appointments/${getBotUsername()}/${telegramUserId}`,
      );
      const appointments: Array<{ id: string; startTime: string; service: { name: string } }> = res.data;

      if (appointments.length === 0) {
        await ctx.reply("You don't have any upcoming appointments to cancel.");
        return;
      }

      const next = appointments[0];
      await client.post('/api/v1/bot/cancel-appointment', {
        botUsername: getBotUsername(),
        appointmentId: next.id,
      });

      const date = formatDateTZ(next.startTime);
      await ctx.reply(
        `✅ Your <b>${next.service.name}</b> appointment on ${date} has been cancelled.\n\nThank you for letting us know!`,
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      console.error('[cancel-reply] Error cancelling appointment:', err);
      await ctx.reply('Could not cancel your appointment. Please contact us directly.');
    }
  });
}

export function runReminderJob(bot: Bot<MyContext>): void {
  registerCancelReplyHandler(bot);

  const ONE_HOUR = 60 * 60_000;

  processReminders(bot).catch((err) => console.error('[reminders] Initial run failed:', err));

  setInterval(() => {
    processReminders(bot).catch((err) => console.error('[reminders] Interval run failed:', err));
  }, ONE_HOUR);
}
