import { InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { MyContext, ApiService, ApiSlot } from '../lib/types.js';
import { upsertCustomer, getServices, getAvailability, createAppointment } from '../lib/api.js';
import { formatUZS, formatDateWeekdayTZ, toTashkentDateStr } from '../lib/format.js';

const BOT_TOKEN = process.env.BOT_TOKEN ?? '';

export type MyConversation = Conversation<MyContext>;

function formatDateLabel(dateStr: string): string {
  // dateStr is YYYY-MM-DD in Tashkent time; parse it as a local noon to avoid
  // any UTC midnight drift, then format with the explicit timezone.
  const d = new Date(dateStr + 'T12:00:00');
  return formatDateWeekdayTZ(d);
}

function formatSlotTime(slot: ApiSlot): string {
  return `${slot.startLabel} – ${slot.endLabel}`;
}

// Returns next 14 days as YYYY-MM-DD strings in Tashkent local time
async function getDatesWithSlots(serviceId: string, staffId?: string): Promise<string[]> {
  const results: string[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = toTashkentDateStr(d);
    const slots = await getAvailability(BOT_TOKEN, serviceId, dateStr, staffId);
    if (slots.length > 0) results.push(dateStr);
  }
  return results;
}

export async function bookingConversation(conversation: MyConversation, ctx: MyContext) {
  // ── Step 1: Load services ─────────────────────────────────────
  await ctx.reply('⏳ Loading services...');

  let data: Awaited<ReturnType<typeof getServices>>;
  try {
    data = await conversation.external(() => getServices(BOT_TOKEN));
  } catch {
    await ctx.reply('Could not load services. Please try again later.');
    return;
  }

  const { services } = data;
  if (services.length === 0) {
    await ctx.reply('No services are available for booking at the moment.');
    return;
  }

  // ── Step 2: Select service ────────────────────────────────────
  const serviceKeyboard = new InlineKeyboard();
  for (const svc of services) {
    serviceKeyboard
      .text(
        `${svc.name} — ${svc.durationMinutes} min — ${formatUZS(svc.price)}`,
        `svc:${svc.id}`,
      )
      .row();
  }
  serviceKeyboard.text('❌ Cancel', 'booking_cancel');

  await ctx.reply('Which service would you like to book?', { reply_markup: serviceKeyboard });

  const svcCtx = await conversation.waitForCallbackQuery(
    ['booking_cancel', ...services.map((s) => `svc:${s.id}`)],
    { otherwise: (c) => c.answerCallbackQuery() },
  );
  await svcCtx.answerCallbackQuery();

  if (svcCtx.callbackQuery.data === 'booking_cancel') {
    await ctx.reply('Booking cancelled.');
    return;
  }

  const serviceId = svcCtx.callbackQuery.data.replace('svc:', '');
  const service = services.find((s) => s.id === serviceId)!;

  await ctx.reply(`✅ Service: <b>${service.name}</b>`, { parse_mode: 'HTML' });

  // ── Step 3: Select staff (if multiple available) ──────────────
  const staffList = service.staffServices.map((ss) => ss.staff);
  let staffId: string | undefined;
  let staffName: string | undefined;

  if (staffList.length > 1) {
    const staffKeyboard = new InlineKeyboard();
    staffKeyboard.text('Any available', 'staff:any').row();
    for (const s of staffList) {
      staffKeyboard.text(s.name, `staff:${s.id}`).row();
    }

    await ctx.reply('Choose a staff member:', { reply_markup: staffKeyboard });

    const staffCtx = await conversation.waitForCallbackQuery(
      ['staff:any', ...staffList.map((s) => `staff:${s.id}`)],
      { otherwise: (c) => c.answerCallbackQuery() },
    );
    await staffCtx.answerCallbackQuery();

    if (staffCtx.callbackQuery.data !== 'staff:any') {
      staffId = staffCtx.callbackQuery.data.replace('staff:', '');
      staffName = staffList.find((s) => s.id === staffId)?.name;
      await ctx.reply(`✅ Staff: <b>${staffName}</b>`, { parse_mode: 'HTML' });
    }
  } else if (staffList.length === 1) {
    staffId = staffList[0].id;
    staffName = staffList[0].name;
  }

  // ── Step 4: Select date ───────────────────────────────────────
  await ctx.reply('⏳ Checking available dates...');

  let availableDates: string[];
  try {
    availableDates = await conversation.external(() => getDatesWithSlots(serviceId, staffId));
  } catch {
    await ctx.reply('Could not load availability. Please try again later.');
    return;
  }

  if (availableDates.length === 0) {
    await ctx.reply('No available slots in the next 14 days. Please contact us directly.');
    return;
  }

  const dateKeyboard = new InlineKeyboard();
  for (const d of availableDates) {
    dateKeyboard.text(formatDateLabel(d), `date:${d}`).row();
  }
  dateKeyboard.text('❌ Cancel', 'booking_cancel');

  await ctx.reply('Choose a date:', { reply_markup: dateKeyboard });

  const dateCtx = await conversation.waitForCallbackQuery(
    ['booking_cancel', ...availableDates.map((d) => `date:${d}`)],
    { otherwise: (c) => c.answerCallbackQuery() },
  );
  await dateCtx.answerCallbackQuery();

  if (dateCtx.callbackQuery.data === 'booking_cancel') {
    await ctx.reply('Booking cancelled.');
    return;
  }

  const selectedDate = dateCtx.callbackQuery.data.replace('date:', '');
  await ctx.reply(`✅ Date: <b>${formatDateLabel(selectedDate)}</b>`, { parse_mode: 'HTML' });

  // ── Step 5: Select time slot ──────────────────────────────────
  let slots: ApiSlot[];
  try {
    slots = await conversation.external(() => getAvailability(BOT_TOKEN, serviceId, selectedDate, staffId));
  } catch {
    await ctx.reply('Could not load time slots. Please try again later.');
    return;
  }

  if (slots.length === 0) {
    await ctx.reply('No slots available on this date. Please choose a different day.');
    return;
  }

  const slotKeyboard = new InlineKeyboard();
  for (const slot of slots) {
    slotKeyboard.text(formatSlotTime(slot), `slot:${slot.startTime}`).row();
  }
  slotKeyboard.text('❌ Cancel', 'booking_cancel');

  await ctx.reply('Choose a time:', { reply_markup: slotKeyboard });

  const slotData = slots.map((s) => `slot:${s.startTime}`);
  const slotCtx = await conversation.waitForCallbackQuery(
    ['booking_cancel', ...slotData],
    { otherwise: (c) => c.answerCallbackQuery() },
  );
  await slotCtx.answerCallbackQuery();

  if (slotCtx.callbackQuery.data === 'booking_cancel') {
    await ctx.reply('Booking cancelled.');
    return;
  }

  const startTime = slotCtx.callbackQuery.data.replace('slot:', '');
  const selectedSlot = slots.find((s) => s.startTime === startTime)!;
  await ctx.reply(`✅ Time: <b>${formatSlotTime(selectedSlot)}</b>`, { parse_mode: 'HTML' });

  // ── Step 6: Collect name ──────────────────────────────────────
  const tgName = ctx.from?.first_name
    ? [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ')
    : null;

  const nameKeyboard = tgName
    ? new InlineKeyboard().text(`Use: ${tgName}`, 'use_tg_name_booking')
    : undefined;

  await ctx.reply('Your name?', { reply_markup: nameKeyboard });

  let name: string;
  const nameCtx = await conversation.waitFor(['message:text', 'callback_query:data']);
  if (nameCtx.callbackQuery?.data === 'use_tg_name_booking') {
    name = tgName ?? 'Customer';
    await nameCtx.answerCallbackQuery();
    await nameCtx.reply(`Name: <b>${name}</b>`, { parse_mode: 'HTML' });
  } else if (nameCtx.message?.text) {
    name = nameCtx.message.text.trim();
  } else {
    await ctx.reply('Please enter your name as text.');
    return;
  }

  // ── Step 7: Collect phone ─────────────────────────────────────
  await ctx.reply('Your phone number?', {
    reply_markup: {
      keyboard: [[{ text: '📱 Share my contact', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });

  let phone: string;
  const phoneCtx = await conversation.waitFor(['message:text', 'message:contact']);
  if (phoneCtx.message?.contact) {
    phone = phoneCtx.message.contact.phone_number;
    if (!phone.startsWith('+')) phone = '+' + phone;
    await phoneCtx.reply(`Phone: <b>${phone}</b>`, {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });
  } else if (phoneCtx.message?.text) {
    phone = phoneCtx.message.text.trim();
    await phoneCtx.reply(`Phone: <b>${phone}</b>`, {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });
  } else {
    await ctx.reply('Please enter your phone number.', { reply_markup: { remove_keyboard: true } });
    return;
  }

  // ── Step 8: Confirm ───────────────────────────────────────────
  const confirmText =
    `<b>Booking Summary</b>\n\n` +
    `📋 <b>Service:</b> ${service.name}\n` +
    (staffName ? `👤 <b>Staff:</b> ${staffName}\n` : '') +
    `📅 <b>Date:</b> ${formatDateLabel(selectedDate)}\n` +
    `🕐 <b>Time:</b> ${formatSlotTime(selectedSlot)}\n` +
    `⏱ <b>Duration:</b> ${service.durationMinutes} min\n` +
    `💰 <b>Price:</b> ${formatUZS(service.price)}\n\n` +
    `<b>Name:</b> ${name}\n` +
    `<b>Phone:</b> ${phone}`;

  await ctx.reply(confirmText, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('✅ Confirm booking', 'confirm_booking')
      .row()
      .text('❌ Cancel', 'booking_cancel'),
  });

  const confirmCtx = await conversation.waitForCallbackQuery(['confirm_booking', 'booking_cancel']);
  await confirmCtx.answerCallbackQuery();

  if (confirmCtx.callbackQuery.data === 'booking_cancel') {
    await ctx.reply('Booking cancelled.');
    return;
  }

  // ── Step 9: Create booking via API ────────────────────────────
  await ctx.reply('⏳ Creating your booking...');

  let result: Awaited<ReturnType<typeof createAppointment>>;
  let customerId: string;

  try {
    const customer = await conversation.external(() =>
      upsertCustomer({
        botToken: BOT_TOKEN,
        telegramUserId: String(ctx.from!.id),
        telegramUsername: ctx.from?.username,
        name,
        phone,
      }),
    );
    customerId = customer.id;

    result = await conversation.external(() =>
      createAppointment({
        botToken: BOT_TOKEN,
        customerId,
        serviceId,
        staffId,
        startTime,
        paymentType: 'AT_APPOINTMENT',
      }),
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[booking] appointment creation failed:', e);
    await ctx.reply(`Something went wrong creating your booking: ${msg}`);
    return;
  }

  ctx.session.customerId = customerId;

  const { appointment, paymentInstructions, ownerTelegramChatId } = result;

  // ── Step 10: Confirmation message ─────────────────────────────
  if (paymentInstructions) {
    await ctx.reply(
      `✅ <b>Booking confirmed!</b>\n\n` +
        `To secure your spot, please transfer <b>${formatUZS(paymentInstructions.amount)}</b> to:\n\n` +
        `<code>${paymentInstructions.cardNumber}</code>\n` +
        `Bank: <b>${paymentInstructions.cardBank}</b>\n\n` +
        `After transferring, tap the button below:`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('✅ I have paid', `appt_paid:${appointment.id}`),
      },
    );
  } else {
    await ctx.reply(
      `✅ <b>Booking confirmed!</b>\n\n` +
        `📋 ${appointment.service.name}\n` +
        `📅 ${formatDateLabel(selectedDate)} at ${selectedSlot.startLabel}\n` +
        `💰 ${formatUZS(appointment.price)} — pay at appointment\n\n` +
        `We look forward to seeing you! Reply CANCEL before your appointment if you need to cancel.`,
      { parse_mode: 'HTML' },
    );
  }
}
