import { InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { MyContext, ApiService, ApiSlot } from '../lib/types.js';
import {
  upsertCustomer,
  getServices,
  getAvailability,
  createAppointment,
  SuspendedError,
  SlotUnavailableError,
} from '../lib/api.js';
import { formatDateWeekdayTZ, toTashkentDateStr, escapeHtml } from '../lib/format.js';
import { t, formatMoney, type Lang } from '../lib/i18n.js';

export type MyConversation = Conversation<MyContext>;

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return formatDateWeekdayTZ(d);
}

// The engine returns startLabel/endLabel as correct Tashkent wall-clock "HH:MM".
// Display them directly — no local/UTC re-conversion that would re-introduce a shift.
function formatSlotTime(slot: ApiSlot): string {
  return `${slot.startLabel} – ${slot.endLabel}`;
}

// Returns next 14 days as YYYY-MM-DD strings (Tashkent local) that have ≥1 slot.
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

// ── Reusable selection steps ───────────────────────────────────────────────
// These are called both on the initial pass and during the 409 retry path, so
// the slot/date UI lives in one place. Each replies its own localized error and
// returns a sentinel kind so the caller can abort cleanly without crashing.

type SlotResult =
  | { kind: 'slot'; slot: ApiSlot }
  | { kind: 'cancel' }
  | { kind: 'empty' }
  | { kind: 'error' };

type DateSlotResult =
  | { kind: 'picked'; date: string; slot: ApiSlot }
  | { kind: 'cancel' }
  | { kind: 'noAvailability' }
  | { kind: 'error' };

// Step: show the time slots for a given date and wait for a choice.
async function selectTimeSlot(
  conversation: MyConversation,
  ctx: MyContext,
  lang: Lang,
  botUsername: string,
  serviceId: string,
  selectedDate: string,
  staffId: string | undefined,
): Promise<SlotResult> {
  let slots: ApiSlot[];
  try {
    slots = await conversation.external(() =>
      getAvailability(botUsername, serviceId, selectedDate, staffId),
    );
  } catch (err) {
    if (err instanceof SuspendedError) await ctx.reply(t(lang, 'suspended'));
    else await ctx.reply(t(lang, 'slotsLoadError'));
    return { kind: 'error' };
  }

  if (slots.length === 0) return { kind: 'empty' };

  const slotKeyboard = new InlineKeyboard();
  for (const slot of slots) {
    slotKeyboard.text(formatSlotTime(slot), `slot:${slot.startTime}`).row();
  }
  slotKeyboard.text(t(lang, 'cancel'), 'booking_cancel');

  await ctx.reply(t(lang, 'chooseTime'), { reply_markup: slotKeyboard });

  const slotData = slots.map((s) => `slot:${s.startTime}`);
  const slotCtx = await conversation.waitForCallbackQuery(['booking_cancel', ...slotData], {
    otherwise: (c) => c.answerCallbackQuery(),
  });
  await slotCtx.answerCallbackQuery();

  if (slotCtx.callbackQuery.data === 'booking_cancel') return { kind: 'cancel' };

  const startTime = slotCtx.callbackQuery.data.replace('slot:', '');
  const slot = slots.find((s) => s.startTime === startTime)!;
  await ctx.reply(t(lang, 'selected', { label: t(lang, 'labelTime'), value: formatSlotTime(slot) }), {
    parse_mode: 'HTML',
  });
  return { kind: 'slot', slot };
}

// Step: scan the next 14 days, let the customer pick a date, then a slot.
// Loops back to date selection if a picked date turns out to have no slots.
async function pickDateAndSlot(
  conversation: MyConversation,
  ctx: MyContext,
  lang: Lang,
  botUsername: string,
  serviceId: string,
  staffId: string | undefined,
): Promise<DateSlotResult> {
  while (true) {
    await ctx.reply(t(lang, 'checkingDates'));

    let availableDates: string[];
    try {
      availableDates = await conversation.external(() =>
        getDatesWithSlots(botUsername, serviceId, staffId),
      );
    } catch (err) {
      if (err instanceof SuspendedError) await ctx.reply(t(lang, 'suspended'));
      else await ctx.reply(t(lang, 'availabilityLoadError'));
      return { kind: 'error' };
    }

    if (availableDates.length === 0) return { kind: 'noAvailability' };

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

    if (dateCtx.callbackQuery.data === 'booking_cancel') return { kind: 'cancel' };

    const selectedDate = dateCtx.callbackQuery.data.replace('date:', '');
    await ctx.reply(
      t(lang, 'selected', { label: t(lang, 'labelDate'), value: formatDateLabel(selectedDate) }),
      { parse_mode: 'HTML' },
    );

    const slotRes = await selectTimeSlot(conversation, ctx, lang, botUsername, serviceId, selectedDate, staffId);
    if (slotRes.kind === 'error') return { kind: 'error' };
    if (slotRes.kind === 'cancel') return { kind: 'cancel' };
    if (slotRes.kind === 'empty') {
      // Filled up between listing and selection — pick another date.
      await ctx.reply(t(lang, 'noSlots'));
      continue;
    }
    return { kind: 'picked', date: selectedDate, slot: slotRes.slot };
  }
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

  await ctx.reply(t(lang, 'selected', { label: t(lang, 'labelService'), value: escapeHtml(service.name) }), { parse_mode: 'HTML' });

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
      await ctx.reply(t(lang, 'selected', { label: t(lang, 'labelStaff'), value: escapeHtml(staffName ?? '') }), { parse_mode: 'HTML' });
    }
  } else if (staffList.length === 1) {
    staffId = staffList[0].id;
    staffName = staffList[0].name;
  }

  // ── Step 4 + 5: Select date and time slot ─────────────────────
  const picked = await pickDateAndSlot(conversation, ctx, lang, botUsername, serviceId, staffId);
  if (picked.kind === 'error') return; // localized message already sent
  if (picked.kind === 'cancel') {
    await ctx.reply(t(lang, 'bookingCancelled'));
    return;
  }
  if (picked.kind === 'noAvailability') {
    await ctx.reply(t(lang, 'noSlots14'));
    return;
  }
  let selectedDate = picked.date;
  let selectedSlot = picked.slot;

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
    await nameCtx.reply(t(lang, 'nameSetLabel', { name: escapeHtml(name) }), { parse_mode: 'HTML' });
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
    await phoneCtx.reply(t(lang, 'phoneSetLabel', { phone: escapeHtml(phone) }), {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });
  } else if (phoneCtx.message?.text) {
    phone = phoneCtx.message.text.trim();
    await phoneCtx.reply(t(lang, 'phoneSetLabel', { phone: escapeHtml(phone) }), {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });
  } else {
    await ctx.reply(t(lang, 'enterPhoneText'), { reply_markup: { remove_keyboard: true } });
    return;
  }

  // ── Step 8: Confirm ───────────────────────────────────────────
  const confirmText = t(lang, 'bookingSummaryFull', {
    service: escapeHtml(service.name),
    staffLine: staffName ? t(lang, 'bookingStaffLine', { staff: escapeHtml(staffName) }) : '',
    date: formatDateLabel(selectedDate),
    time: formatSlotTime(selectedSlot),
    duration: service.durationMinutes,
    price: formatMoney(lang, service.price),
    name: escapeHtml(name),
    phone: escapeHtml(phone),
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

  // ── Step 9a: Upsert customer (once) ───────────────────────────
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
  } catch (e: unknown) {
    if (e instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[booking] customer upsert failed:', e);
    await ctx.reply(t(lang, 'bookingCreateError', { msg }));
    return;
  }
  ctx.session.customerId = customerId;

  // ── Step 9b: Create booking, retrying on a 409 SLOT_UNAVAILABLE ──
  // If the chosen slot was taken between selection and confirm, send the
  // customer back to slot selection (same date, re-fetched). If that date is
  // now empty, fall back to date selection; if the whole window is empty, stop.
  let result: Awaited<ReturnType<typeof createAppointment>>;
  while (true) {
    await ctx.reply(t(lang, 'creatingBooking'));

    try {
      result = await conversation.external(() =>
        createAppointment({
          botUsername,
          customerId,
          serviceId,
          staffId,
          startTime: selectedSlot.startTime,
          paymentType: 'AT_APPOINTMENT',
        }),
      );
      break; // success
    } catch (e: unknown) {
      if (e instanceof SuspendedError) {
        await ctx.reply(t(lang, 'suspended'));
        return;
      }

      if (e instanceof SlotUnavailableError) {
        await ctx.reply(t(lang, 'slotJustTaken'));

        // Back to slot selection for the SAME date (re-fetch live availability).
        const slotRes = await selectTimeSlot(
          conversation, ctx, lang, botUsername, serviceId, selectedDate, staffId,
        );
        if (slotRes.kind === 'error') return; // message already sent
        if (slotRes.kind === 'cancel') {
          await ctx.reply(t(lang, 'bookingCancelled'));
          return;
        }
        if (slotRes.kind === 'empty') {
          // That day filled up entirely — go back to date selection.
          await ctx.reply(t(lang, 'noSlots'));
          const again = await pickDateAndSlot(conversation, ctx, lang, botUsername, serviceId, staffId);
          if (again.kind === 'error') return;
          if (again.kind === 'cancel') {
            await ctx.reply(t(lang, 'bookingCancelled'));
            return;
          }
          if (again.kind === 'noAvailability') {
            await ctx.reply(t(lang, 'noSlots14'));
            return;
          }
          selectedDate = again.date;
          selectedSlot = again.slot;
        } else {
          selectedSlot = slotRes.slot;
        }
        continue; // retry create with the newly chosen slot
      }

      const msg = e instanceof Error ? e.message : String(e);
      console.error('[booking] appointment creation failed:', e);
      await ctx.reply(t(lang, 'bookingCreateError', { msg }));
      return;
    }
  }

  const { appointment, ownerTelegramChatId, businessAddress } = result;

  // ── Step 10: Confirmation message ─────────────────────────────
  // No in-bot payment: the owner follows up about payment directly.
  // Append the business location when set (escaped — owner-entered free text).
  const addressLine =
    businessAddress && businessAddress.trim()
      ? '\n\n' + t(lang, 'appointmentAddressLine', { address: escapeHtml(businessAddress.trim()) })
      : '';
  await ctx.reply(
    t(lang, 'bookingConfirmedNoPayment', {
      service: escapeHtml(appointment.service.name),
      date: formatDateLabel(selectedDate),
      time: selectedSlot.startLabel,
      price: formatMoney(lang, appointment.price),
    }) + addressLine,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text(t(lang, 'backToMenu'), 'main_menu'),
    },
  );

  // ownerTelegramChatId is available for future use (e.g. notify owner)
  void ownerTelegramChatId;
}
