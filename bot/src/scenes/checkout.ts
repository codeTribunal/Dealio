import { InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { MyContext } from '../lib/types.js';
import { upsertCustomer, createOrder, getCheckoutQuestions } from '../lib/api.js';
import { getBotUsername } from '../lib/botContext.js';
import { formatUZS, buildOrderSummary } from '../lib/format.js';

export type MyConversation = Conversation<MyContext>;

export async function checkoutConversation(conversation: MyConversation, ctx: MyContext) {
  const cart = ctx.session.cart;

  if (cart.length === 0) {
    await ctx.reply('Your cart is empty. Browse the catalog first!', {
      reply_markup: new InlineKeyboard().text('🛍 Browse catalog', 'catalog'),
    });
    return;
  }

  // ── Step 1: Name ──────────────────────────────────────────────
  const tgName = ctx.from?.first_name
    ? [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ')
    : null;

  const nameKeyboard = tgName
    ? new InlineKeyboard().text(`Use: ${tgName}`, 'use_tg_name')
    : undefined;

  await ctx.reply('What is your name?', { reply_markup: nameKeyboard });

  let name: string;
  const nameCtx = await conversation.waitFor(['message:text', 'callback_query:data']);
  if (nameCtx.callbackQuery?.data === 'use_tg_name') {
    name = tgName ?? 'Customer';
    await nameCtx.answerCallbackQuery();
    await nameCtx.reply(`Name: <b>${name}</b>`, { parse_mode: 'HTML' });
  } else if (nameCtx.message?.text) {
    name = nameCtx.message.text.trim();
  } else {
    await ctx.reply('Please enter your name as text.');
    return;
  }

  // ── Step 2: Phone ─────────────────────────────────────────────
  await ctx.reply('Your phone number? (e.g. +998901234567)\n\nOr tap the button below:', {
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
    await phoneCtx.reply(`Phone: <b>${phone}</b>`, { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
  } else if (phoneCtx.message?.text) {
    phone = phoneCtx.message.text.trim();
    await phoneCtx.reply(`Phone: <b>${phone}</b>`, { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
  } else {
    await ctx.reply('Please enter your phone number.', { reply_markup: { remove_keyboard: true } });
    return;
  }

  // ── Step 3: Delivery method ───────────────────────────────────
  await ctx.reply('How would you like to receive your order?', {
    reply_markup: new InlineKeyboard()
      .text('🏪 Pickup', 'delivery:PICKUP')
      .text('🚚 Delivery', 'delivery:DELIVERY'),
  });

  const deliveryCtx = await conversation.waitForCallbackQuery(['delivery:PICKUP', 'delivery:DELIVERY']);
  await deliveryCtx.answerCallbackQuery();
  const deliveryMethod = deliveryCtx.callbackQuery.data === 'delivery:PICKUP' ? 'PICKUP' : 'DELIVERY';

  // ── Step 4: Address (if delivery) ─────────────────────────────
  let deliveryAddress: string | undefined;
  if (deliveryMethod === 'DELIVERY') {
    await ctx.reply('Please enter your delivery address:');
    const addressCtx = await conversation.waitFor('message:text');
    deliveryAddress = addressCtx.message?.text?.trim();
  }

  // ── Step 4b: Custom checkout questions ────────────────────────
  const customAnswers: Record<string, string> = {};
  const questions = await conversation.external(() => getCheckoutQuestions(getBotUsername()));

  for (const q of questions) {
    await ctx.reply(q.required ? `${q.question} *` : q.question);
    const ansCtx = await conversation.waitFor('message:text');
    const answer = ansCtx.message?.text?.trim() ?? '';
    if (q.required && answer.length === 0) {
      await ctx.reply('This field is required. Please provide an answer.');
      const retryCtx = await conversation.waitFor('message:text');
      customAnswers[q.id] = retryCtx.message?.text?.trim() ?? '';
    } else {
      customAnswers[q.id] = answer;
    }
  }

  // ── Step 5: Confirm order ─────────────────────────────────────
  const summary = buildOrderSummary(cart, name, phone, deliveryMethod, deliveryAddress);

  await ctx.reply(summary, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('✅ Confirm order', 'confirm_order')
      .row()
      .text('❌ Cancel', 'cancel_order'),
  });

  const confirmCtx = await conversation.waitForCallbackQuery(['confirm_order', 'cancel_order']);
  await confirmCtx.answerCallbackQuery();

  if (confirmCtx.callbackQuery.data === 'cancel_order') {
    await ctx.reply('Order cancelled. Your cart is still saved.', {
      reply_markup: new InlineKeyboard().text('🛒 View cart', 'cart'),
    });
    return;
  }

  // ── Step 6: Create order via API ──────────────────────────────
  await ctx.reply('⏳ Creating your order...');

  let result: Awaited<ReturnType<typeof createOrder>>;
  let customerId: string;

  try {
    const customer = await conversation.external(() =>
      upsertCustomer({
        botUsername: getBotUsername(),
        telegramUserId: String(ctx.from!.id),
        telegramUsername: ctx.from?.username,
        name,
        phone,
      }),
    );
    customerId = customer.id;

    result = await conversation.external(() =>
      createOrder({
        botUsername: getBotUsername(),
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
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[checkout] order creation failed:', e);
    await ctx.reply(`Something went wrong creating your order: ${msg}`);
    return;
  }

  ctx.session.cart = [];
  ctx.session.customerId = customerId;

  const { order, paymentInstructions } = result;

  // ── Step 7: Payment instructions ─────────────────────────────
  if (!paymentInstructions) {
    await ctx.reply(
      `✅ <b>Order #${order.orderNumber} placed!</b>\n\nWe will contact you to confirm payment.`,
      { parse_mode: 'HTML' },
    );
    return;
  }

  const { cardNumber, cardBank, amount, orderNumber } = paymentInstructions;

  await ctx.reply(
    `✅ <b>Order #${orderNumber} placed!</b>\n\n` +
      `Please transfer <b>${formatUZS(amount)}</b> to:\n\n` +
      `<code>${cardNumber}</code>\n` +
      `Bank: <b>${cardBank}</b>\n\n` +
      `⚠️ Write <b>#${orderNumber}</b> in the payment comment.\n\n` +
      `After transferring, tap the button below:`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('✅ I have paid', `paid:${order.id}`),
    },
  );
}
