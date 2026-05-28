import axios from 'axios';
import { Bot } from 'grammy';
import { MyContext } from '../lib/types.js';
import { formatDateTZ, formatTimeTZ } from '../lib/format.js';
import { t, resolveLang, formatMoney } from '../lib/i18n.js';
import { getLang } from '../lib/lang.js';

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
    languagePreference: 'UZBEK' | 'RUSSIAN' | 'ENGLISH' | null;
  };
  business: {
    name: string;
    language: 'UZBEK' | 'RUSSIAN' | 'ENGLISH';
    ownerTelegramChatId: string | null;
  };
}

async function fetchDueReminders(botUsername: string): Promise<ReminderAppointment[]> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60_000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60_000);

  const res = await client.get('/api/v1/bot/due-reminders', {
    params: {
      botUsername,
      from: in24h.toISOString(),
      to: in25h.toISOString(),
    },
  });
  return res.data;
}

async function markReminderSent(botUsername: string, appointmentId: string): Promise<void> {
  await client.post('/api/v1/bot/mark-reminder-sent', {
    botUsername,
    appointmentId,
  });
}

async function processReminders(bot: Bot<MyContext>, botUsername: string): Promise<void> {
  let appointments: ReminderAppointment[];
  try {
    appointments = await fetchDueReminders(botUsername);
  } catch (err) {
    console.error('[reminders] Failed to fetch due reminders:', err);
    return;
  }

  for (const appt of appointments) {
    const { customer, service, staff, business } = appt;
    if (!customer.telegramUserId) {
      await markReminderSent(botUsername, appt.id).catch(() => {});
      continue;
    }

    const lang = resolveLang(customer.languagePreference, business.language);
    const dateLabel = formatDateTZ(appt.startTime);
    const timeLabel = formatTimeTZ(appt.startTime);
    const staffLine = staff ? t(lang, 'withStaff', { staff: staff.name }) : '';

    const text = t(lang, 'reminderText', {
      business: business.name,
      service: service.name,
      staffLine,
      date: dateLabel,
      time: timeLabel,
      price: formatMoney(lang, appt.price),
    });

    try {
      await bot.api.sendMessage(customer.telegramUserId, text, { parse_mode: 'HTML' });
      await markReminderSent(botUsername, appt.id);
      console.log(`[reminders] Sent reminder for appointment ${appt.id} to ${customer.name}`);
    } catch (err) {
      console.error(`[reminders] Failed to send reminder for appointment ${appt.id}:`, err);
    }
  }
}

export function registerCancelReplyHandler(bot: Bot<MyContext>, botUsername: string): void {
  bot.hears(/^CANCEL$/i, async (ctx) => {
    const telegramUserId = String(ctx.from?.id ?? '');
    if (!telegramUserId) return;

    const lang = await getLang(ctx);

    try {
      const res = await client.get(
        `/api/v1/bot/customer-appointments/${botUsername}/${telegramUserId}`,
      );
      const appointments: Array<{ id: string; startTime: string; service: { name: string } }> =
        res.data;

      if (appointments.length === 0) {
        await ctx.reply(t(lang, 'cancelNoAppts'));
        return;
      }

      const next = appointments[0];
      await client.post('/api/v1/bot/cancel-appointment', {
        botUsername,
        appointmentId: next.id,
      });

      await ctx.reply(
        t(lang, 'cancelConfirmed', {
          service: next.service.name,
          date: formatDateTZ(next.startTime),
        }),
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      console.error('[cancel-reply] Error cancelling appointment:', err);
      await ctx.reply(t(lang, 'cancelError'));
    }
  });
}

export function runReminderJob(bot: Bot<MyContext>, botUsername: string): void {
  registerCancelReplyHandler(bot, botUsername);

  const ONE_HOUR = 60 * 60_000;

  processReminders(bot, botUsername).catch((err) =>
    console.error('[reminders] Initial run failed:', err),
  );

  setInterval(() => {
    processReminders(bot, botUsername).catch((err) =>
      console.error('[reminders] Interval run failed:', err),
    );
  }, ONE_HOUR);
}
