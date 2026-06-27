import { randomUUID } from 'crypto';
import { InlineKeyboard } from 'grammy';
import { type Conversation } from '@grammyjs/conversations';
import { MyContext } from '../lib/types.js';
import { upsertCustomer, createOrder, getCheckoutQuestions, getCatalog, notifyPaymentReceived, SuspendedError, InsufficientStockError } from '../lib/api.js';
import { buildOrderSummary } from '../lib/format.js';
import { t, formatMoney, type Lang } from '../lib/i18n.js';
import { showWelcomeMenu } from '../handlers/commands.js';

export type MyConversation = Conversation<MyContext>;

// Escape user-provided text for HTML parse_mode (only & < > matter). Applied to
// the cardholder name; amount/reference/card are numeric and safe.
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

  // Idempotency key — generated ONCE per checkout and persisted in the session,
  // so a retry after a lost/timed-out order response reuses it and the backend
  // returns the original order instead of creating a duplicate. external() keeps
  // the value stable across conversation replays. Cleared on success (below) and
  // whenever the cart changes (catalog handlers).
  if (!ctx.session.orderIdemKey) {
    ctx.session.orderIdemKey = await conversation.external(() => randomUUID());
  }
  const idempotencyKey = ctx.session.orderIdemKey;

  // BUG 2 fix: a command typed mid-checkout (e.g. /start) must ABORT the flow
  // and restart, not be captured as the current answer (which trapped the
  // customer). Returns true when it handled an escape (restarted from the
  // welcome menu); callers then `return` to end the conversation. Wrapped in
  // external() because it fetches the catalog and sends the menu.
  async function commandEscape(c: MyContext): Promise<boolean> {
    const text = c.message?.text;
    if (!text || !text.startsWith('/')) return false;
    await conversation.external(() => showWelcomeMenu(c, lang));
    return true;
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
  if (await commandEscape(nameCtx)) return;
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

  // BUG 1 fix: accept a TYPED number OR a SHARED contact. Wait for ANY message
  // (not just text) so a contact share resolves the step instead of hanging; a
  // command escapes; anything else (sticker, photo, empty) REPROMPTS — never a
  // silent hang. No E.164 normalizer exists in the stack, so we accept the
  // number cleanly (contacts get a leading '+').
  let phone: string;
  for (;;) {
    const phoneCtx = await conversation.waitFor('message');
    // Step log (may reprint on conversation replay — that's expected): proves the
    // wait fired and what it received, so a freeze here is never invisible.
    console.log(
      `[${botUsername}] checkout phone-step: wait resolved — ${
        phoneCtx.message?.contact ? 'contact' : phoneCtx.message?.text ? 'text' : 'other'
      }`,
    );
    if (await commandEscape(phoneCtx)) return;

    const contact = phoneCtx.message?.contact;
    const text = phoneCtx.message?.text?.trim();
    if (contact?.phone_number) {
      phone = contact.phone_number.startsWith('+')
        ? contact.phone_number
        : '+' + contact.phone_number;
    } else if (text && text.length > 0) {
      phone = text;
    } else {
      // Non-text/non-contact (sticker, photo, …) — reprompt, re-offering the
      // share-contact button (one_time_keyboard may have hidden it).
      await phoneCtx.reply(t(lang, 'enterPhoneText'), {
        reply_markup: {
          keyboard: [[{ text: t(lang, 'shareContact'), request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      continue;
    }
    await phoneCtx.reply(t(lang, 'phoneSetLabel', { phone }), {
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });
    console.log(
      `[${botUsername}] checkout phone-step: accepted phone, advancing to delivery`,
    );
    break;
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
    if (await commandEscape(addressCtx)) return;
    deliveryAddress = addressCtx.message?.text?.trim();
  }

  // ── Step 4b: Custom checkout questions ────────────────────────
  const customAnswers: Record<string, string> = {};
  const questions = await conversation.external(() => getCheckoutQuestions(botUsername));

  for (const q of questions) {
    await ctx.reply(q.required ? `${q.question} *` : q.question);
    const ansCtx = await conversation.waitFor('message:text');
    if (await commandEscape(ansCtx)) return;
    const answer = ansCtx.message?.text?.trim() ?? '';
    if (q.required && answer.length === 0) {
      await ctx.reply(t(lang, 'fieldRequired'));
      const retryCtx = await conversation.waitFor('message:text');
      if (await commandEscape(retryCtx)) return;
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
        idempotencyKey,
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
    if (e instanceof InsufficientStockError) {
      await ctx.reply(t(lang, 'orderOutOfStock', { product: e.productName ?? '' }), {
        reply_markup: new InlineKeyboard().text(t(lang, 'viewCart'), 'cart'),
      });
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[checkout] order creation failed:', e);
    await ctx.reply(t(lang, 'orderCreateError', { msg }));
    return;
  }

  ctx.session.cart = [];
  ctx.session.customerId = customerId;
  // Order placed — drop the key so the next checkout starts a fresh one.
  ctx.session.orderIdemKey = undefined;

  const { order } = result;

  // ── Step 7: Payment ──────────────────────────────────────────
  // Show card-transfer instructions ONLY when the global flag is on AND the
  // business has a card. The business is fetched via the catalog endpoint, which
  // can fail after the order is already created — on ANY failure we fall back to
  // the no-payment ending and never show a blank card.
  let card: { number: string; holder: string } | null = null;
  try {
    const { business } = await conversation.external(() => getCatalog(botUsername));
    if ((business.cardPaymentsEnabled ?? true) && business.cardNumber) {
      card = {
        // Raw digits only — the tap-to-copy value must paste clean into bank apps.
        number: business.cardNumber.replace(/\D/g, ''),
        holder: business.cardHolderName ?? '',
      };
    }
  } catch {
    card = null;
  }

  if (!card || card.number.length === 0) {
    // Flag off, no card, or a fetch failure → unchanged no-payment ending.
    await ctx.reply(
      t(lang, 'orderPlacedNoPayment', { number: order.orderNumber }),
      { parse_mode: 'HTML' },
    );
    return;
  }

  // Card present → cardholder name + tap-to-copy raw-digit card span + amount +
  // order number, with an "I have paid" inline button.
  await ctx.reply(
    t(lang, 'paymentInstructions', {
      amount: formatMoney(lang, order.total),
      card: card.number,
      name: escapeHtml(card.holder),
      reference: String(order.orderNumber),
    }),
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text(t(lang, 'iHavePaid'), 'i_have_paid'),
    },
  );

  // "I have paid" handled INSIDE the conversation (state rides the session).
  // Retry loop: a failed notify shows a customer-facing error and keeps the
  // original button live (no false success); success confirms and ends.
  while (true) {
    const paidCtx = await conversation.waitForCallbackQuery('i_have_paid');
    await paidCtx.answerCallbackQuery();
    try {
      await conversation.external(() => notifyPaymentReceived(botUsername, order.id));
      await ctx.reply(t(lang, 'paymentThanks'));
      return;
    } catch (e) {
      console.error('[checkout] payment-received failed:', e);
      await ctx.reply(t(lang, 'paymentError'));
    }
  }
}
