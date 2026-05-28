import { InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { MyContext, ApiService, ApiSlot } from '../lib/types.js';
import { upsertCustomer, getServices, getAvailability, createAppointment, SuspendedError } from '../lib/api.js';
import { formatDateWeekdayTZ, toTashkentDateStr } from '../lib/format.js';
import { t, formatMoney, type Lang } from '../lib/i18n.js';

export type MyConversation = Conversation<MyContext>;

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return formatDateWeekdayTZ(d);
}

function formatSlotTime(slot: ApiSlot): string {
  return `${slot.startLabel} – ${slot.endLabel}`;
}

// Returns next 14 days as YYYY-MM-DD strings in Tashkent local time
async function getDatesWithSlots(
  botUsername: string,
  serviceId: string,
  staffId?: string,
): Promise<string[]> {
  const results: string[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = toTashkentDateStr(d);
    const slots = await getAvailability(botUsername, serviceId, dateStr, staffId);
    if (slots.length > 0) results.push(dateStr);
  }
  return results;
}

export async function bookingConversation(conversation: MyConversation, ctx: MyContext) {
  // Capture at conversation entry — used in all conversation.external() closures below
  const botUsername = ctx.botUsername;
  const lang: Lang = ctx.session.lang ?? 'UZBEK';

  // ── Step 1: Load services ─────────────────────────────────────
  await ctx.reply(t(lang, 'loadingServices'));

  let data: Awaited<ReturnType<typeof getServices>>;
  try {
    data = await conversation.external(() => getServices(botUsername));
  } catch (err) {
    if (err instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    await ctx.reply(t(lang, 'servicesLoadError'));
    return;
  }

  const { services } = data;
  if (services.length === 0) {
    await ctx.reply(t(lang, 'noServices'));
    return;
  }

  // ── Step 2: Select service ────────────────────────────────────
  const serviceKeyboard = new InlineKeyboard();
  for (const svc of services) {
    serviceKeyboard
      .text(
        `${svc.name} — ${svc.durationMinutes} ${t(lang, 'minShort')} — ${formatMoney(lang, svc.price)}`,
        `svc:${svc.id}`,
      )
      .row();
  }
  serviceKeyboard.text(t(lang, 'cancel'), 'booking_cancel');

  await ctx.reply(t(lang, 'chooseService'), { reply_markup: serviceKeyboard });

  const svcCtx = await conversation.waitForCallbackQuery(
    ['booking_cancel', ...services.map((s: ApiService) => `svc:${s.id}`)],
    { otherwise: (c) => c.answerCallbackQuery() },
  );
  await svcCtx.answerCallbackQuery();

  if (svcCtx.callbackQuery.data === 'booking_cancel') {
    await ctx.reply(t(lang, 'bookingCancelled'));
    return;
  }

  const serviceId = svcCtx.callbackQuery.data.replace('svc:', '');
  const service = services.find((s: ApiService) => s.id === serviceId)!;

  await ctx.reply(t(lang, 'selected', { label: t(lang, 'labelService'), value: service.name }), { parse_mode: 'HTML' });

  // ── Step 3: Select staff (if multiple available) ──────────────
  const staffList = service.staffServices.map((ss) => ss.staff);
  let staffId: string | undefined;
  let staffName: string | undefined;

  if (staffList.length > 1) {
    const staffKeyboard = new InlineKeyboard();
    staffKeyboard.text(t(lang, 'anyStaff'), 'staff:any').row();
    for (const s of staffList) {
      staffKeyboard.text(s.name, `staff:${s.id}`).row();
    }

    await ctx.reply(t(lang, 'chooseStaff'), { reply_markup: staffKeyboard });

    const staffCtx = await conversation.waitForCallbackQuery(
      ['staff:any', ...staffList.map((s) => `staff:${s.id}`)],
      { otherwise: (c) => c.answerCallbackQuery() },
    );
    await staffCtx.answerCallbackQuery();

    if (staffCtx.callbackQuery.data !== 'staff:any') {
      staffId = staffCtx.callbackQuery.data.replace('staff:', '');
      staffName = staffList.find((s) => s.id === staffId)?.name;
      await ctx.reply(t(lang, 'selected', { label: t(lang, 'labelStaff'), value: staffName ?? '' }), { parse_mode: 'HTML' });
    }
  } else if (staffList.length === 1) {
    staffId = staffList[0].id;
    staffName = staffList[0].name;
  }

  // ── Step 4: Select date ───────────────────────────────────────
  await ctx.reply(t(lang, 'checkingDates'));

  let availableDates: string[];
  try {
    availableDates = await conversation.external(() =>
      getDatesWithSlots(botUsername, serviceId, staffId),
    );
  } catch (err) {
    if (err instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    await ctx.reply(t(lang, 'availabilityLoadError'));
    return;
  }

  if (availableDates.length === 0) {
    await ctx.reply(t(lang, 'noSlots14'));
    return;
  }

  const dateKeyboard = new InlineKeyboard();
  for (const d of availableDates) {
    dateKeyboard.text(formatDateLabel(d), `date:${d}`).row();
  }
  dateKeyboard.text(t(lang, 'cancel'), 'booking_cancel');

  await ctx.reply(t(lang, 'chooseDate'), { reply_markup: dateKeyboard });

  const dateCtx = await conversation.waitForCallbackQuery(
    ['booking_cancel', ...availableDates.map((d) => `date:${d}`)],
    { otherwise: (c) => c.answerCallbackQuery() },
  );
  await dateCtx.answerCallbackQuery();

  if (dateCtx.callbackQuery.data === 'booking_cancel') {
    await ctx.reply(t(lang, 'bookingCancelled'));
    return;
  }

  const selectedDate = dateCtx.callbackQuery.data.replace('date:', '');
  await ctx.reply(t(lang, 'selected', { label: t(lang, 'labelDate'), value: formatDateLabel(selectedDate) }), { parse_mode: 'HTML' });

  // ── Step 5: Select time slot ──────────────────────────────────
  let slots: ApiSlot[];
  try {
    slots = await conversation.external(() =>
      getAvailability(botUsername, serviceId, selectedDate, staffId),
    );
  } catch (err) {
    if (err instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    await ctx.reply(t(lang, 'slotsLoadError'));
    return;
  }

  if (slots.length === 0) {
    await ctx.reply(t(lang, 'noSlots'));
    return;
  }

  const slotKeyboard = new InlineKeyboard();
  for (const slot of slots) {
    slotKeyboard.text(formatSlotTime(slot), `slot:${slot.startTime}`).row();
  }
  slotKeyboard.text(t(lang, 'cancel'), 'booking_cancel');

  await ctx.reply(t(lang, 'chooseTime'), { reply_markup: slotKeyboard });

  const slotData = slots.map((s) => `slot:${s.startTime}`);
  const slotCtx = await conversation.waitForCallbackQuery(
    ['booking_cancel', ...slotData],
    { otherwise: (c) => c.answerCallbackQuery() },
  );
  await slotCtx.answerCallbackQuery();

  if (slotCtx.callbackQuery.data === 'booking_cancel') {
    await ctx.reply(t(lang, 'bookingCancelled'));
    return;
  }

  const startTime = slotCtx.callbackQuery.data.replace('slot:', '');
  const selectedSlot = slots.find((s) => s.startTime === startTime)!;
  await ctx.reply(t(lang, 'selected', { label: t(lang, 'labelTime'), value: formatSlotTime(selectedSlot) }), { parse_mode: 'HTML' });

  // ── Step 6: Collect name ──────────────────────────────────────
  const tgName = ctx.from?.first_name
    ? [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ')
    : null;

  const nameKeyboard = tgName
    ? new InlineKeyboard().text(t(lang, 'useThisName', { name: tgName }), 'use_tg_name_booking')
    : undefined;

  await ctx.reply(t(lang, 'askNameQ'), { reply_markup: nameKeyboard });

  let name: string;
  const nameCtx = await conversation.waitFor(['message:text', 'callback_query:data']);
  if (nameCtx.callbackQuery?.data === 'use_tg_name_booking') {
    name = tgName ?? 'Customer';
    await nameCtx.answerCallbackQuery();
    await nameCtx.reply(t(lang, 'nameSetLabel', { name }), { parse_mode: 'HTML' });
  } else if (nameCtx.message?.text) {
    name = nameCtx.message.text.trim();
  } else {
    await ctx.reply(t(lang, 'enterNameText'));
    return;
  }

  // ── Step 7: Collect phone ─────────────────────────────────────
  await ctx.reply(t(lang, 'askPhoneShort'), {
    reply_markup: {
      keyboard: [[{ text: t(lang, 'shareContact'), request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });

  let phone: string;
  const phoneCtx = await conversation.waitFor(['message:text', 'message:contact']);
  if (phoneCtx.message?.contact) {
    phone = phoneCtx.message.contact.phone_number;
    if (!phone.startsWith('+')) phone = '+' + phone;
    await phoneCtx.reply(t(lang, 'phoneSetLabel', { phone }), {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });
  } else if (phoneCtx.message?.text) {
    phone = phoneCtx.message.text.trim();
    await phoneCtx.reply(t(lang, 'phoneSetLabel', { phone }), {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });
  } else {
    await ctx.reply(t(lang, 'enterPhoneText'), { reply_markup: { remove_keyboard: true } });
    return;
  }

  // ── Step 8: Confirm ───────────────────────────────────────────
  const confirmText = t(lang, 'bookingSummaryFull', {
    service: service.name,
    staffLine: staffName ? t(lang, 'bookingStaffLine', { staff: staffName }) : '',
    date: formatDateLabel(selectedDate),
    time: formatSlotTime(selectedSlot),
    duration: service.durationMinutes,
    price: formatMoney(lang, service.price),
    name,
    phone,
  });

  await ctx.reply(confirmText, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text(t(lang, 'confirmBooking'), 'confirm_booking')
      .row()
      .text(t(lang, 'cancel'), 'booking_cancel'),
  });

  const confirmCtx = await conversation.waitForCallbackQuery(['confirm_booking', 'booking_cancel']);
  await confirmCtx.answerCallbackQuery();

  if (confirmCtx.callbackQuery.data === 'booking_cancel') {
    await ctx.reply(t(lang, 'bookingCancelled'));
    return;
  }

  // ── Step 9: Create booking via API ────────────────────────────
  await ctx.reply(t(lang, 'creatingBooking'));

  let result: Awaited<ReturnType<typeof createAppointment>>;
  let customerId: string;

  try {
    const customer = await conversation.external(() =>
      upsertCustomer({
        botUsername,
        telegramUserId: String(ctx.from!.id),
        telegramUsername: ctx.from?.username,
        name,
        phone,
      }),
    );
    customerId = customer.id;

    result = await conversation.external(() =>
      createAppointment({
        botUsername,
        customerId,
        serviceId,
        staffId,
        startTime,
        paymentType: 'AT_APPOINTMENT',
      }),
    );
  } catch (e: unknown) {
    if (e instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[booking] appointment creation failed:', e);
    await ctx.reply(t(lang, 'bookingCreateError', { msg }));
    return;
  }

  ctx.session.customerId = customerId;

  const { appointment, paymentInstructions, ownerTelegramChatId } = result;

  // ── Step 10: Confirmation message ─────────────────────────────
  if (paymentInstructions) {
    await ctx.reply(
      t(lang, 'bookingConfirmedPayment', {
        amount: formatMoney(lang, paymentInstructions.amount),
        card: paymentInstructions.cardNumber,
        bank: paymentInstructions.cardBank,
      }),
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text(t(lang, 'iHavePaid'), `appt_paid:${appointment.id}`),
      },
    );
  } else {
    await ctx.reply(
      t(lang, 'bookingConfirmedNoPayment', {
        service: appointment.service.name,
        date: formatDateLabel(selectedDate),
        time: selectedSlot.startLabel,
        price: formatMoney(lang, appointment.price),
      }),
      { parse_mode: 'HTML' },
    );
  }

  // ownerTelegramChatId is available for future use (e.g. notify owner)
  void ownerTelegramChatId;
}
