import { InlineKeyboard } from 'grammy';
import { MyContext, ApiOrder, ApiAppointment } from '../lib/types.js';
import { getCatalog, getCustomerOrders, getCustomerAppointments } from '../lib/api.js';
import { formatUZS, formatDateTZ, formatTimeTZ } from '../lib/format.js';
import { showCatalog } from '../scenes/catalog.js';
import { showProjects } from '../scenes/project.js';

const BOT_TOKEN = process.env.BOT_TOKEN ?? '';

const ORDER_STATUS_EMOJI: Record<string, string> = {
  NEW: '🆕',
  PREPARING: '🔧',
  READY: '✅',
  DELIVERED: '📦',
  CANCELLED: '❌',
};

const PAYMENT_STATUS_EMOJI: Record<string, string> = {
  PENDING: '⏳',
  PAYMENT_RECEIVED: '💰',
  CONFIRMED: '✅',
};

const APPT_STATUS_EMOJI: Record<string, string> = {
  REQUESTED: '⏳',
  CONFIRMED: '✅',
  COMPLETED: '🎉',
  CANCELLED: '❌',
  NO_SHOW: '👻',
};

export function registerCommandHandlers(bot: import('grammy').Bot<MyContext>) {
  bot.command('start', async (ctx) => {
    const name = ctx.from?.first_name ?? 'there';

    // Read the business mode from the catalog endpoint (single call, always available)
    let mode: string[] = ['PRODUCTS'];
    try {
      const data = await getCatalog(BOT_TOKEN);
      if (data.business.mode.length > 0) mode = data.business.mode;
    } catch {
      // fallback to PRODUCTS
    }

    const hasProducts = mode.includes('PRODUCTS');
    const hasServices = mode.includes('SERVICES');
    const hasFreelance = mode.includes('FREELANCE');

    const kb = new InlineKeyboard();
    if (hasProducts) kb.text('🛍 Browse catalog', 'catalog').row();
    if (hasServices) {
      kb.text('📅 Book appointment', 'book_appointment').row();
      kb.text('📋 My appointments', 'show_appointments').row();
    }
    if (hasFreelance) kb.text('📁 My projects', 'show_projects').row();
    if (hasProducts || hasServices) kb.text('📦 My orders', 'show_orders').row();

    await ctx.reply(
      `👋 Hello, ${name}!\n\nWelcome! Use the buttons below to get started.`,
      { reply_markup: kb },
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '<b>Available commands:</b>\n\n' +
        '/start — Main menu\n' +
        '/orders — View your recent orders\n' +
        '/appointments — View your upcoming appointments\n' +
        '/projects — View your active projects\n' +
        '/cart — View your cart\n' +
        '/help — Show this message',
      { parse_mode: 'HTML' },
    );
  });

  bot.command('projects', async (ctx) => {
    await showProjects(ctx);
  });

  bot.command('orders', async (ctx) => {
    await showOrders(ctx);
  });

  bot.command('appointments', async (ctx) => {
    await showAppointments(ctx);
  });

  bot.command('cart', async (ctx) => {
    await ctx.reply('Loading...', {
      reply_markup: new InlineKeyboard().text('🛒 View cart', 'cart'),
    });
  });

  bot.callbackQuery('show_orders', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showOrders(ctx);
  });

  bot.callbackQuery('show_appointments', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showAppointments(ctx);
  });

  bot.callbackQuery('book_appointment', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter('bookingConversation');
  });

  // "I have paid" for appointment (pay-in-advance)
  bot.callbackQuery(/^appt_paid:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('Thank you! The business has been notified of your payment. Your appointment is being confirmed.');
  });
}

async function showOrders(ctx: MyContext) {
  const telegramUserId = String(ctx.from?.id ?? '');
  if (!telegramUserId) {
    await ctx.reply('Could not identify you.');
    return;
  }

  let orders: ApiOrder[];
  try {
    orders = await getCustomerOrders(BOT_TOKEN, telegramUserId);
  } catch {
    await ctx.reply('Could not load orders. Please try again later.');
    return;
  }

  if (orders.length === 0) {
    await ctx.reply("You haven't placed any orders yet.", {
      reply_markup: new InlineKeyboard().text('🛍 Browse catalog', 'catalog'),
    });
    return;
  }

  const lines = orders.map((o) => {
    const statusIcon = ORDER_STATUS_EMOJI[o.orderStatus] ?? '📋';
    const payIcon = PAYMENT_STATUS_EMOJI[o.paymentStatus] ?? '';
    const date = formatDateTZ(o.createdAt);
    return `${statusIcon} <b>Order #${o.orderNumber}</b> — ${formatUZS(o.total)}\n   ${date} • Payment: ${payIcon} ${o.paymentStatus}`;
  });

  await ctx.reply('<b>Your recent orders:</b>\n\n' + lines.join('\n\n'), {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('🛍 Browse catalog', 'catalog'),
  });
}

async function showAppointments(ctx: MyContext) {
  const telegramUserId = String(ctx.from?.id ?? '');
  if (!telegramUserId) {
    await ctx.reply('Could not identify you.');
    return;
  }

  let appointments: ApiAppointment[];
  try {
    appointments = await getCustomerAppointments(BOT_TOKEN, telegramUserId);
  } catch {
    await ctx.reply('Could not load appointments. Please try again later.');
    return;
  }

  if (appointments.length === 0) {
    await ctx.reply("You have no upcoming appointments.", {
      reply_markup: new InlineKeyboard().text('📅 Book appointment', 'book_appointment'),
    });
    return;
  }

  const lines = appointments.map((a) => {
    const statusIcon = APPT_STATUS_EMOJI[a.status] ?? '📋';
    const date = formatDateTZ(a.startTime);
    const time = formatTimeTZ(a.startTime);
    const staffLine = a.staff ? ` with ${a.staff.name}` : '';
    return `${statusIcon} <b>${a.service.name}</b>${staffLine}\n   📅 ${date} at ${time} — ${formatUZS(a.price)}`;
  });

  await ctx.reply('<b>Your upcoming appointments:</b>\n\n' + lines.join('\n\n'), {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('📅 Book another', 'book_appointment'),
  });
}
