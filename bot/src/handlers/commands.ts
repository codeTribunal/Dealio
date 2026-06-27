import { InlineKeyboard } from 'grammy';
import { MyContext, ApiOrder, ApiAppointment } from '../lib/types.js';
import {
  getCatalog,
  getCustomerOrders,
  getCustomerAppointments,
  setCustomerLanguage,
  SuspendedError,
  SUSPENSION_MESSAGE,
} from '../lib/api.js';
import { formatDateTZ, formatTimeTZ } from '../lib/format.js';
import { t, tOrderStatus, tPaymentStatus, formatMoney, type Lang } from '../lib/i18n.js';
import { getLang, needsLanguagePicker, languageKeyboard } from '../lib/lang.js';
import { showCatalog, showCart } from '../scenes/catalog.js';
import { showProjects } from '../scenes/project.js';

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

export async function showWelcomeMenu(ctx: MyContext, lang: Lang) {
  const name = ctx.from?.first_name ?? 'there';

  // mode is a single scalar value now ('SERVICES' | 'FREELANCE'; 'PRODUCTS' dormant).
  let mode = 'SERVICES';
  try {
    const data = await getCatalog(ctx.botUsername);
    if (data.business.mode) mode = data.business.mode;
  } catch {
    // fallback to SERVICES
  }

  const hasProducts = mode === 'PRODUCTS';
  const hasServices = mode === 'SERVICES';
  const hasFreelance = mode === 'FREELANCE';

  const kb = new InlineKeyboard();
  // Product-seller mode is disabled: catalog/orders are gated behind hasProducts,
  // which is never true now (no business has PRODUCTS), so the product flow is
  // unreachable. The scenes remain in the codebase but dormant.
  if (hasProducts) kb.text(t(lang, 'browseCatalog'), 'catalog').row();
  if (hasServices) {
    kb.text(t(lang, 'bookAppointment'), 'book_appointment').row();
    kb.text(t(lang, 'myAppointments'), 'show_appointments').row();
  }
  if (hasFreelance) kb.text(t(lang, 'myProjects'), 'show_projects').row();
  if (hasProducts) kb.text(t(lang, 'myOrders'), 'show_orders').row();
  kb.text(t(lang, 'languageMenu'), 'change_language').row();

  await ctx.reply(t(lang, 'welcome', { name }), { reply_markup: kb });
}

export function registerCommandHandlers(bot: import('grammy').Bot<MyContext>) {
  bot.command('start', async (ctx) => {
    console.log(`[${ctx.botUsername}] /start handler reached (from ${ctx.from?.id ?? '?'})`);
    if (await needsLanguagePicker(ctx)) {
      await ctx.reply(t('UZBEK', 'chooseLanguage'), { reply_markup: languageKeyboard() });
      return;
    }
    const lang = await getLang(ctx);
    await showWelcomeMenu(ctx, lang);
  });

  // Customer picks a language from the picker
  bot.callbackQuery(/^setlang:(UZBEK|RUSSIAN|ENGLISH)$/, async (ctx) => {
    const lang = ctx.match[1] as Lang;
    await ctx.answerCallbackQuery();
    const telegramUserId = String(ctx.from?.id ?? '');
    try {
      await setCustomerLanguage({
        botUsername: ctx.botUsername,
        telegramUserId,
        telegramUsername: ctx.from?.username,
        name: ctx.from?.first_name,
        language: lang,
      });
    } catch (err) {
      if (err instanceof SuspendedError) {
        await ctx.reply(SUSPENSION_MESSAGE);
        return;
      }
      // Even if persistence failed, continue with the chosen language for this session.
    }
    ctx.session.lang = lang;
    await showWelcomeMenu(ctx, lang);
  });

  // Re-show the language picker
  bot.command('language', async (ctx) => {
    await ctx.reply(t('UZBEK', 'chooseLanguage'), { reply_markup: languageKeyboard() });
  });

  bot.callbackQuery('change_language', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(t('UZBEK', 'chooseLanguage'), { reply_markup: languageKeyboard() });
  });

  bot.command('help', async (ctx) => {
    const lang = await getLang(ctx);
    await ctx.reply(t(lang, 'help'), { parse_mode: 'HTML' });
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
    // Show the customer's current session cart. Items persist in
    // ctx.session.cart across the catalog/checkout flow; showCart renders the
    // real cart (and handles the empty case with a "Browse catalog" button).
    await showCart(ctx);
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

  bot.callbackQuery(/^appt_paid:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const lang = await getLang(ctx);
    await ctx.reply(t(lang, 'apptPaidThanks'));
  });

  // Suppress unused import warning
  void showCatalog;
}

async function showOrders(ctx: MyContext) {
  const lang = await getLang(ctx);
  const telegramUserId = String(ctx.from?.id ?? '');
  if (!telegramUserId) {
    await ctx.reply(t(lang, 'cantIdentify'));
    return;
  }

  let orders: ApiOrder[];
  try {
    orders = await getCustomerOrders(ctx.botUsername, telegramUserId);
  } catch (err) {
    if (err instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    await ctx.reply(t(lang, 'ordersLoadError'));
    return;
  }

  if (orders.length === 0) {
    // Product-seller mode disabled — no 'browse catalog' CTA into the product flow.
    await ctx.reply(t(lang, 'noOrders'));
    return;
  }

  const lines = orders.map((o) =>
    t(lang, 'orderLine', {
      icon: ORDER_STATUS_EMOJI[o.orderStatus] ?? '📋',
      number: o.orderNumber,
      total: formatMoney(lang, o.total),
      date: formatDateTZ(o.createdAt),
      payIcon: PAYMENT_STATUS_EMOJI[o.paymentStatus] ?? '',
      payStatus: tPaymentStatus(lang, o.paymentStatus),
    }),
  );

  await ctx.reply(`${t(lang, 'yourOrders')}\n\n` + lines.join('\n\n'), {
    parse_mode: 'HTML',
  });
  void tOrderStatus;
}

async function showAppointments(ctx: MyContext) {
  const lang = await getLang(ctx);
  const telegramUserId = String(ctx.from?.id ?? '');
  if (!telegramUserId) {
    await ctx.reply(t(lang, 'cantIdentify'));
    return;
  }

  let appointments: ApiAppointment[];
  try {
    appointments = await getCustomerAppointments(ctx.botUsername, telegramUserId);
  } catch (err) {
    if (err instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    await ctx.reply(t(lang, 'apptsLoadError'));
    return;
  }

  if (appointments.length === 0) {
    await ctx.reply(t(lang, 'noAppts'), {
      reply_markup: new InlineKeyboard().text(t(lang, 'bookAppointment'), 'book_appointment'),
    });
    return;
  }

  const lines = appointments.map((a) =>
    t(lang, 'apptLine', {
      icon: APPT_STATUS_EMOJI[a.status] ?? '📋',
      service: a.service.name,
      staffLine: a.staff ? t(lang, 'withStaff', { staff: a.staff.name }) : '',
      date: formatDateTZ(a.startTime),
      time: formatTimeTZ(a.startTime),
      price: formatMoney(lang, a.price),
    }),
  );

  await ctx.reply(`${t(lang, 'yourAppts')}\n\n` + lines.join('\n\n'), {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text(t(lang, 'bookAnother'), 'book_appointment'),
  });
}
