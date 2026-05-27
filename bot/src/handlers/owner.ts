import { InlineKeyboard } from 'grammy';
import { MyContext } from '../lib/types.js';
import { notifyPaymentReceived, confirmPayment } from '../lib/api.js';
import { getBotUsername } from '../lib/botContext.js';
import { formatUZS } from '../lib/format.js';

export function registerOwnerHandlers(bot: import('grammy').Bot<MyContext>) {
  // Customer taps "I have paid"
  bot.callbackQuery(/^paid:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery('Processing...');

    const orderId = ctx.match[1];

    let result: Awaited<ReturnType<typeof notifyPaymentReceived>>;
    try {
      result = await notifyPaymentReceived(getBotUsername(), orderId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (msg === 'Payment already confirmed') {
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply('✅ Payment already confirmed. Your order is being processed.');
      } else {
        await ctx.reply('Something went wrong. Please try again or contact us.');
      }
      return;
    }

    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.reply('✅ Thank you! We have received your payment notification.\n\nThe store owner will confirm it shortly.');

    const { notification } = result;
    if (notification.ownerTelegramChatId) {
      try {
        await bot.api.sendMessage(
          notification.ownerTelegramChatId,
          `💰 <b>${notification.customerName}</b> has paid for order <b>#${notification.orderNumber}</b>\n\n` +
            `Amount: <b>${formatUZS(notification.total)}</b>\n\n` +
            `Tap below to confirm:`,
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text('✅ Mark as paid', `mark_paid:${notification.orderId}`),
          },
        );
      } catch {
        // Owner Telegram notification failed silently — payment was still recorded
      }
    }
  });

  // Owner taps "Mark as paid" from Telegram notification
  bot.callbackQuery(/^mark_paid:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery('Confirming...');

    const orderId = ctx.match[1];

    let result: Awaited<ReturnType<typeof confirmPayment>>;
    try {
      result = await confirmPayment(getBotUsername(), orderId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (msg === 'Payment already confirmed') {
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
        await ctx.reply('Already confirmed.');
      } else {
        await ctx.reply('Could not confirm payment. Try again or use the app.');
      }
      return;
    }

    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.reply(`✅ Payment confirmed for order. Customer has been notified.`);

    if (result.customerTelegramUserId) {
      try {
        await bot.api.sendMessage(
          result.customerTelegramUserId,
          `✅ <b>Payment confirmed!</b>\n\nYour order is now being prepared. We'll let you know when it's ready.`,
          { parse_mode: 'HTML' },
        );
      } catch {
        // Customer notification failed silently
      }
    }
  });

  // Owner registration — links their Telegram chat ID to their business
  bot.command('register_owner', async (ctx) => {
    const secret = ctx.match?.trim();
    if (!secret || secret !== process.env.BOT_MANAGER_SECRET) {
      await ctx.reply('Invalid secret. Use: /register_owner <your_bot_manager_secret>');
      return;
    }

    const chatId = String(ctx.from?.id ?? '');
    if (!chatId) {
      await ctx.reply('Could not get your chat ID.');
      return;
    }

    try {
      const axios = await import('axios');
      await axios.default.patch(
        `${process.env.BACKEND_URL ?? 'http://localhost:3000'}/api/v1/bot/set-owner-chat`,
        { botUsername: getBotUsername(), ownerTelegramChatId: chatId },
        { headers: { 'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '' } },
      );
      await ctx.reply(
        `✅ Your Telegram is now linked to your business.\n\nYou will receive payment notifications here.`,
      );
    } catch {
      await ctx.reply(
        `Your chat ID is <code>${chatId}</code>\n\nPaste this into your business settings in the app.`,
        { parse_mode: 'HTML' },
      );
    }
  });
}
