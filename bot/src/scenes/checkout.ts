import { InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { MyContext } from '../lib/types.js';
import { upsertCustomer, createOrder, getCheckoutQuestions, SuspendedError } from '../lib/api.js';
import { buildOrderSummary } from '../lib/format.js';
import { t, formatMoney, type Lang } from '../lib/i18n.js';

export type MyConversation = Conversation<MyContext>;

export async function checkoutConversation(conversation: MyConversation, ctx: MyContext) {
  // Capture at conversation entry — available in all conversation.external() closures below
  const botUsername = ctx.botUsername;
  const cart = ctx.session.cart;
  const lang: Lang = ctx.session.lang ?? 'UZBEK';

  if (cart.length === 0) {
    await ctx.reply(t(lang, 'cartEmptyCheckout'), {
      reply_markup: new InlineKeyboard().text(t(lang, 'browseCatalog'), 'catalog'),
    });
    return;
  }

  // ── Step 1: Name ──────────────────────────────────────────────
  const tgName = ctx.from?.first_name
    ? [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ')
    : null;

  const nameKeyboard = tgName
    ? new InlineKeyboard().text(t(lang, 'useThisName', { name: tgName }), 'use_tg_name')
    : undefined;

  await ctx.reply(t(lang, 'askNameQ'), { reply_markup: nameKeyboard });

  let name: string;
  const nameCtx = await conversation.waitFor(['message:text', 'callback_query:data']);
  if (nameCtx.callbackQuery?.data === 'use_tg_name') {
    name = tgName ?? 'Customer';
    await nameCtx.answerCallbackQuery();
    await nameCtx.reply(t(lang, 'nameSetLabel', { name }), { parse_mode: 'HTML' });
  } else if (nameCtx.message?.text) {
    name = nameCtx.message.text.trim();
  } else {
    await ctx.reply(t(lang, 'enterNameText'));
    return;
  }

  // ── Step 2: Phone ─────────────────────────────────────────────
  await ctx.reply(t(lang, 'askPhoneFull'), {
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
    await phoneCtx.reply(t(lang, 'phoneSetLabel', { phone }), { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
  } else if (phoneCtx.message?.text) {
    phone = phoneCtx.message.text.trim();
    await phoneCtx.reply(t(lang, 'phoneSetLabel', { phone }), { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
  } else {
    await ctx.reply(t(lang, 'enterPhoneText'), { reply_markup: { remove_keyboard: true } });
    return;
  }

  // ── Step 3: Delivery method ───────────────────────────────────
  await ctx.reply(t(lang, 'askDelivery'), {
    reply_markup: new InlineKeyboard()
      .text(t(lang, 'pickup'), 'delivery:PICKUP')
      .text(t(lang, 'delivery'), 'delivery:DELIVERY'),
  });

  const deliveryCtx = await conversation.waitForCallbackQuery(['delivery:PICKUP', 'delivery:DELIVERY']);
  await deliveryCtx.answerCallbackQuery();
  const deliveryMethod = deliveryCtx.callbackQuery.data === 'delivery:PICKUP' ? 'PICKUP' : 'DELIVERY';

  // ── Step 4: Address (if delivery) ─────────────────────────────
  let deliveryAddress: string | undefined;
  if (deliveryMethod === 'DELIVERY') {
    await ctx.reply(t(lang, 'askAddress'));
    const addressCtx = await conversation.waitFor('message:text');
    deliveryAddress = addressCtx.message?.text?.trim();
  }

  // ── Step 4b: Custom checkout questions ────────────────────────
  const customAnswers: Record<string, string> = {};
  const questions = await conversation.external(() => getCheckoutQuestions(botUsername));

  for (const q of questions) {
    await ctx.reply(q.required ? `${q.question} *` : q.question);
    const ansCtx = await conversation.waitFor('message:text');
    const answer = ansCtx.message?.text?.trim() ?? '';
    if (q.required && answer.length === 0) {
      await ctx.reply(t(lang, 'fieldRequired'));
      const retryCtx = await conversation.waitFor('message:text');
      customAnswers[q.id] = retryCtx.message?.text?.trim() ?? '';
    } else {
      customAnswers[q.id] = answer;
    }
  }

  // ── Step 5: Confirm order ─────────────────────────────────────
  const summary = buildOrderSummary(cart, name, phone, deliveryMethod, lang, deliveryAddress);

  await ctx.reply(summary, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text(t(lang, 'confirmOrder'), 'confirm_order')
      .row()
      .text(t(lang, 'cancel'), 'cancel_order'),
  });

  const confirmCtx = await conversation.waitForCallbackQuery(['confirm_order', 'cancel_order']);
  await confirmCtx.answerCallbackQuery();

  if (confirmCtx.callbackQuery.data === 'cancel_order') {
    await ctx.reply(t(lang, 'orderCancelledSaved'), {
      reply_markup: new InlineKeyboard().text(t(lang, 'viewCart'), 'cart'),
    });
    return;
  }

  // ── Step 6: Create order via API ──────────────────────────────
  await ctx.reply(t(lang, 'creatingOrder'));

  let result: Awaited<ReturnType<typeof createOrder>>;
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
      createOrder({
        botUsername,
        customerId,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
          variant: i.variant,
        })),
        deliveryMethod,
        deliveryAddress,
        customAnswers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
      }),
    );
  } catch (e: unknown) {
    if (e instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[checkout] order creation failed:', e);
    await ctx.reply(t(lang, 'orderCreateError', { msg }));
    return;
  }

  ctx.session.cart = [];
  ctx.session.customerId = customerId;

  const { order, paymentInstructions } = result;

  // ── Step 7: Payment instructions ─────────────────────────────
  if (!paymentInstructions) {
    await ctx.reply(
      t(lang, 'orderPlacedNoPayment', { number: order.orderNumber }),
      { parse_mode: 'HTML' },
    );
    return;
  }

  const { cardNumber, cardBank, amount, orderNumber } = paymentInstructions;

  await ctx.reply(
    t(lang, 'orderPlacedPayment', {
      number: orderNumber,
      amount: formatMoney(lang, amount),
      card: cardNumber,
      bank: cardBank,
    }),
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text(t(lang, 'iHavePaid'), `paid:${order.id}`),
    },
  );
}
