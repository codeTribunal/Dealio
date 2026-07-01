import { randomUUID } from 'crypto';
import { Bot, InlineKeyboard } from 'grammy';
import { MyContext, type CheckoutStep } from '../lib/types.js';
import {
  upsertCustomer,
  createOrder,
  getCatalog,
  notifyPaymentReceived,
  SuspendedError,
  InsufficientStockError,
} from '../lib/api.js';
import { buildOrderSummary } from '../lib/format.js';
import { t, formatMoney, type Lang } from '../lib/i18n.js';
import { getLang } from '../lib/lang.js';
import { needsConsent, showConsentGate } from '../lib/consent.js';

// Manual checkout state machine. Replaces the @grammyjs/conversations-based
// checkout entirely (that plugin caused a chain of Redis state/persistence and
// update-swallow bugs). Catalog/cart handlers and the order-creation backend are
// untouched — only HOW the customer is walked through the steps changed.
//
// Flow: idle → awaiting_name → awaiting_phone → awaiting_delivery
//       → (awaiting_address if DELIVERY) → awaiting_confirm → awaiting_payment? → idle
// Callback steps (use_tg_name, delivery, confirm/cancel, i_have_paid) are their
// own handlers; text steps (typed name, phone, address) go through one
// bot.on('message') handler that switches on session.checkout.step.

// Escape user-provided text for HTML parse_mode (only & < > matter). Applied to
// every user-controlled value rendered with parse_mode 'HTML' (typed name, phone,
// cardholder); amount/reference/card are numeric and safe. The order summary
// escapes its own fields inside buildOrderSummary.
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Transition the step in place and log it. Keeps the other checkout fields. */
function setStep(ctx: MyContext, to: CheckoutStep): void {
  const from = ctx.session.checkout?.step ?? 'idle';
  if (ctx.session.checkout) ctx.session.checkout.step = to;
  else ctx.session.checkout = { step: to };
  console.log(`[${ctx.botUsername}] checkout step: ${from} → ${to}`);
}

/** Terminal reset — clears all checkout fields back to idle, with a log. */
function finishCheckout(ctx: MyContext): void {
  const from = ctx.session.checkout?.step ?? 'idle';
  ctx.session.checkout = { step: 'idle' };
  console.log(`[${ctx.botUsername}] checkout step: ${from} → idle`);
}

// ── Transient prompt cleanup (presentation only) ──────────────────────
// Part B: keep the checkout chat tidy by deleting the bot's OWN data-collection
// prompt ("enter your name/phone", delivery, address) once the customer answers.
// We remember at most ONE prompt id at a time (checkout.lastPromptMsgId) — no
// history, no cross-step editing. These helpers ONLY delete/send a prompt; they
// never touch the step, the order, or any permanent message (summary / payment
// instructions / confirmation are sent with plain ctx.reply and left alone).

/** Delete the last remembered prompt, if any. Any Telegram failure (already
 *  gone, too old, not deletable) is swallowed so the step ALWAYS proceeds. */
async function deleteLastPrompt(ctx: MyContext): Promise<void> {
  const co = ctx.session.checkout;
  const id = co?.lastPromptMsgId;
  if (!co || id == null) return;
  co.lastPromptMsgId = undefined; // forget first — a failed delete must not retry-loop
  const chatId = ctx.chat?.id;
  if (chatId == null) return;
  try {
    await ctx.api.deleteMessage(chatId, id);
  } catch {
    // swallow — cleanup must never strand the customer or block the step
  }
}

/** Delete the previous prompt, send the next one, and remember its id so the
 *  following step can delete it. Presentation-only wrapper around ctx.reply. */
async function sendPrompt(
  ctx: MyContext,
  text: string,
  other?: Parameters<MyContext['reply']>[1],
): Promise<void> {
  await deleteLastPrompt(ctx);
  const sent = await ctx.reply(text, other);
  if (ctx.session.checkout) ctx.session.checkout.lastPromptMsgId = sent.message_id;
}

// ── Prompts ───────────────────────────────────────────────────────────
async function promptPhone(ctx: MyContext, lang: Lang): Promise<void> {
  setStep(ctx, 'awaiting_phone');
  await sendPrompt(ctx, t(lang, 'askPhoneFull'), {
    reply_markup: {
      keyboard: [[{ text: t(lang, 'shareContact'), request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

async function promptDelivery(ctx: MyContext, lang: Lang): Promise<void> {
  setStep(ctx, 'awaiting_delivery');
  await sendPrompt(ctx, t(lang, 'askDelivery'), {
    reply_markup: new InlineKeyboard()
      .text(t(lang, 'pickup'), 'delivery:PICKUP')
      .text(t(lang, 'delivery'), 'delivery:DELIVERY'),
  });
}

async function showConfirm(ctx: MyContext, lang: Lang): Promise<void> {
  const co = ctx.session.checkout;
  if (!co) return;
  setStep(ctx, 'awaiting_confirm');
  const summary = buildOrderSummary(
    ctx.session.cart,
    co.name ?? '',
    co.phone ?? '',
    co.deliveryMethod ?? 'PICKUP',
    lang,
    co.address,
  );
  await ctx.reply(summary, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text(t(lang, 'confirmOrder'), 'confirm_order')
      .row()
      .text(t(lang, 'cancel'), 'cancel_order'),
  });
}

// ── Order creation + payment (logic preserved from the old conversation) ──
async function runOrderCreation(ctx: MyContext): Promise<void> {
  const lang = await getLang(ctx);
  const co = ctx.session.checkout;
  if (!co) return;
  const botUsername = ctx.botUsername;
  const cart = ctx.session.cart;

  // The cart can be mutated by still-live catalog add:/remove: buttons between
  // the confirm summary and this Confirm tap. Never create a zero-item order: if
  // the cart was emptied, end checkout and send the customer back to the catalog.
  // (The backend remains authoritative on price/stock for whatever items remain.)
  if (!cart || cart.length === 0) {
    finishCheckout(ctx);
    await ctx.reply(t(lang, 'cartEmptyCheckout'), {
      reply_markup: new InlineKeyboard().text(t(lang, 'browseCatalog'), 'catalog'),
    });
    return;
  }

  await ctx.reply(t(lang, 'creatingOrder'));

  let result: Awaited<ReturnType<typeof createOrder>>;
  let customerId: string;
  try {
    const customer = await upsertCustomer({
      botUsername,
      telegramUserId: String(ctx.from?.id ?? ''),
      telegramUsername: ctx.from?.username,
      name: co.name ?? 'Customer',
      phone: co.phone ?? '',
    });
    customerId = customer.id;

    result = await createOrder({
      botUsername,
      customerId,
      idempotencyKey: co.idemKey ?? randomUUID(),
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
        variant: i.variant,
      })),
      deliveryMethod: co.deliveryMethod ?? 'PICKUP',
      deliveryAddress: co.address,
    });
  } catch (e: unknown) {
    // On error, stay at awaiting_confirm so the confirm button can retry
    // (idempotency reuses the same key). Never a false success.
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

  // Success — order placed; clear the cart.
  ctx.session.cart = [];
  ctx.session.customerId = customerId;
  const { order } = result;

  // Payment: show card transfer ONLY when the global flag is on AND a card
  // exists. The catalog fetch can fail after the order is created — on ANY
  // failure fall back to the no-payment ending (never a blank card).
  let card: { number: string; holder: string } | null = null;
  // Pickup-address line appended to the confirmation ONLY for PICKUP orders (on
  // DELIVERY the customer gave their own address). Empty when not pickup or no
  // address set. Escaped for HTML — it's owner-entered and may contain < or &.
  let pickupLine = '';
  try {
    const { business } = await getCatalog(botUsername);
    if ((business.cardPaymentsEnabled ?? true) && business.cardNumber) {
      card = {
        number: business.cardNumber.replace(/\D/g, ''), // raw digits, clean paste
        holder: business.cardHolderName ?? '',
      };
    }
    if (co.deliveryMethod === 'PICKUP' && business.address && business.address.trim()) {
      pickupLine =
        '\n\n' + t(lang, 'pickupAddressLine', { address: escapeHtml(business.address.trim()) });
    }
  } catch {
    card = null;
    pickupLine = '';
  }

  if (!card || card.number.length === 0) {
    finishCheckout(ctx);
    await ctx.reply(t(lang, 'orderPlacedNoPayment', { number: order.orderNumber }) + pickupLine, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text(t(lang, 'backToMenu'), 'main_menu'),
    });
    return;
  }

  // Card present → payment instructions + "I have paid".
  ctx.session.checkout = { step: 'awaiting_payment', orderId: order.id };
  console.log(`[${botUsername}] checkout step: awaiting_confirm → awaiting_payment`);
  await ctx.reply(
    t(lang, 'paymentInstructions', {
      amount: formatMoney(lang, order.total),
      card: card.number,
      name: escapeHtml(card.holder),
      reference: String(order.orderNumber),
    }) + pickupLine,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text(t(lang, 'iHavePaid'), 'i_have_paid'),
    },
  );
}

// Start the checkout flow (name → phone → …). Extracted so both the "checkout"
// button and the post-consent resume (commands.ts) can invoke it. Does NOT call
// answerCallbackQuery — the caller does.
export async function startCheckout(ctx: MyContext): Promise<void> {
  const lang = await getLang(ctx);
  const cart = ctx.session.cart;
  if (!cart || cart.length === 0) {
    await ctx.reply(t(lang, 'cartEmptyCheckout'), {
      reply_markup: new InlineKeyboard().text(t(lang, 'browseCatalog'), 'catalog'),
    });
    return;
  }
  // Fresh checkout: ONE idemKey for the whole flow.
  ctx.session.checkout = { step: 'idle', idemKey: randomUUID() };
  setStep(ctx, 'awaiting_name');

  const tgName = ctx.from?.first_name
    ? [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ')
    : null;
  const nameKeyboard = tgName
    ? new InlineKeyboard().text(t(lang, 'useThisName', { name: tgName }), 'use_tg_name')
    : undefined;
  await sendPrompt(ctx, t(lang, 'askNameQ'), { reply_markup: nameKeyboard });
}

// ── Registration ──────────────────────────────────────────────────────
export function registerCheckoutHandlers(bot: Bot<MyContext>): void {
  // Start checkout (from the catalog/cart "checkout" buttons). GATED behind
  // first-contact consent — no name/phone/address is collected without it.
  bot.callbackQuery('checkout', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (await needsConsent(ctx)) {
      await showConsentGate(ctx, 'checkout');
      return;
    }
    await startCheckout(ctx);
  });

  // Name via the "use my Telegram name" button.
  bot.callbackQuery('use_tg_name', async (ctx) => {
    await ctx.answerCallbackQuery();
    const co = ctx.session.checkout;
    if (co?.step !== 'awaiting_name') return;
    const lang = await getLang(ctx);
    const tgName = ctx.from?.first_name
      ? [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ')
      : 'Customer';
    co.name = tgName;
    await ctx.reply(t(lang, 'nameSetLabel', { name: escapeHtml(tgName) }), { parse_mode: 'HTML' });
    await promptPhone(ctx, lang);
  });

  // Delivery method.
  bot.callbackQuery(/^delivery:(PICKUP|DELIVERY)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const co = ctx.session.checkout;
    if (co?.step !== 'awaiting_delivery') return;
    const lang = await getLang(ctx);
    const method = ctx.match[1] === 'DELIVERY' ? 'DELIVERY' : 'PICKUP';
    co.deliveryMethod = method;
    if (method === 'DELIVERY') {
      setStep(ctx, 'awaiting_address');
      await sendPrompt(ctx, t(lang, 'askAddress'));
    } else {
      // Moving to the permanent confirm summary — clean the delivery prompt first.
      await deleteLastPrompt(ctx);
      await showConfirm(ctx, lang);
    }
  });

  // Confirm → create the order.
  bot.callbackQuery('confirm_order', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.session.checkout?.step !== 'awaiting_confirm') return;
    await runOrderCreation(ctx);
  });

  // Cancel → keep the cart, end checkout.
  bot.callbackQuery('cancel_order', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (ctx.session.checkout?.step !== 'awaiting_confirm') return;
    const lang = await getLang(ctx);
    finishCheckout(ctx);
    await ctx.reply(t(lang, 'orderCancelledSaved'), {
      reply_markup: new InlineKeyboard().text(t(lang, 'viewCart'), 'cart'),
    });
  });

  // "I have paid" → require a payment screenshot before notifying the owner.
  // Move to awaiting_payment_proof and prompt; the proof handler (in
  // bot.on('message')) does the actual upload + notify once a valid image
  // arrives. setStep mutates step in place, so orderId is preserved.
  bot.callbackQuery('i_have_paid', async (ctx) => {
    await ctx.answerCallbackQuery();
    const co = ctx.session.checkout;
    if (co?.step !== 'awaiting_payment' || !co.orderId) return;
    const lang = await getLang(ctx);
    setStep(ctx, 'awaiting_payment_proof');
    await ctx.reply(t(lang, 'askPaymentProof'));
  });

  // Text/contact steps — a single message handler switching on the step. When
  // not in checkout it passes through (next) so other handlers / the inbox-save
  // run. Registered before the inbox-save catch-all, so checkout input is never
  // saved to the inbox.
  bot.on('message', async (ctx, next) => {
    const co = ctx.session.checkout;
    if (!co || co.step === 'idle') {
      await next();
      return;
    }
    // Commands are reset to idle by the pre-conversations middleware, so they
    // shouldn't arrive here as checkout input — pass through defensively.
    if (ctx.message.text?.startsWith('/')) {
      await next();
      return;
    }

    const lang = await getLang(ctx);
    switch (co.step) {
      case 'awaiting_name': {
        const name = ctx.message.text?.trim();
        if (!name) {
          await sendPrompt(ctx, t(lang, 'enterNameText')); // garbage → reprompt, no hang
          return;
        }
        co.name = name;
        await promptPhone(ctx, lang);
        return;
      }
      case 'awaiting_phone': {
        // Accept a typed number OR a shared contact; anything else reprompts.
        const contact = ctx.message.contact;
        const text = ctx.message.text?.trim();
        let phone: string;
        if (contact?.phone_number) {
          phone = contact.phone_number.startsWith('+')
            ? contact.phone_number
            : '+' + contact.phone_number;
        } else if (text && text.length > 0) {
          phone = text;
        } else {
          await sendPrompt(ctx, t(lang, 'enterPhoneText'), {
            reply_markup: {
              keyboard: [[{ text: t(lang, 'shareContact'), request_contact: true }]],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          });
          return;
        }
        console.log(
          `[${ctx.botUsername}] checkout phone-step: received ${contact ? 'contact' : 'text'}`,
        );
        co.phone = phone;
        await ctx.reply(t(lang, 'phoneSetLabel', { phone: escapeHtml(phone) }), {
          parse_mode: 'HTML',
          reply_markup: { remove_keyboard: true },
        });
        await promptDelivery(ctx, lang);
        return;
      }
      case 'awaiting_address': {
        const addr = ctx.message.text?.trim();
        if (!addr) {
          await sendPrompt(ctx, t(lang, 'askAddress')); // require non-empty → reprompt
          return;
        }
        co.address = addr;
        // Moving to the permanent confirm summary — clean the address prompt first.
        await deleteLastPrompt(ctx);
        await showConfirm(ctx, lang);
        return;
      }
      case 'awaiting_payment_proof': {
        if (!co.orderId) {
          finishCheckout(ctx);
          return;
        }
        // Accept a photo (largest size) OR an image document (jpeg/png). Anything
        // else → reprompt, no hang.
        const photos = ctx.message.photo;
        const doc = ctx.message.document;
        // Take the largest PhotoSize's file_id, or an image document's file_id.
        let fileId: string;
        if (photos && photos.length > 0) {
          fileId = photos[photos.length - 1].file_id; // largest PhotoSize
        } else if (doc && (doc.mime_type === 'image/jpeg' || doc.mime_type === 'image/png')) {
          fileId = doc.file_id;
        } else {
          await ctx.reply(t(lang, 'paymentProofNotImage')); // wrong type → reprompt
          return;
        }
        try {
          // Send ONLY the file_id — no download, no upload. The backend stores it
          // and marks PAYMENT_RECEIVED; the image is proxied on demand via getFile.
          await notifyPaymentReceived(ctx.botUsername, co.orderId, fileId);
          finishCheckout(ctx);
          await ctx.reply(t(lang, 'paymentThanks'), {
            reply_markup: new InlineKeyboard().text(t(lang, 'backToMenu'), 'main_menu'),
          });
        } catch (e) {
          // Backend-call failure: stay at awaiting_payment_proof so the customer
          // can re-send — never a false confirmation, never strand.
          console.error('[checkout] payment-received (proof) failed:', e);
          await ctx.reply(t(lang, 'paymentProofFailed'));
        }
        return;
      }
      // awaiting_delivery / awaiting_confirm / awaiting_payment expect a button
      // tap — consume stray text (so it's not saved to the inbox); no hang. The
      // relevant inline buttons remain live on the prior message.
      default:
        return;
    }
  });
}
