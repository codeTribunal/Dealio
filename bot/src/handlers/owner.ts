import { InlineKeyboard } from 'grammy';
import { MyContext } from '../lib/types.js';
import { confirmPayment, SuspendedError, SUSPENSION_MESSAGE } from '../lib/api.js';
import { t, resolveLang } from '../lib/i18n.js';

export function registerOwnerHandlers(bot: import('grammy').Bot<MyContext>) {
  // Owner taps "Mark as paid" from Telegram notification
  bot.callbackQuery(/^mark_paid:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery('Confirming...');

    const orderId = ctx.match[1];

    let result: Awaited<ReturnType<typeof confirmPayment>>;
    try {
      result = await confirmPayment(ctx.botUsername, orderId);
    } catch (err: unknown) {
      if (err instanceof SuspendedError) {
        await ctx.reply(SUSPENSION_MESSAGE);
        return;
      }
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
      const customerLang = resolveLang(
        result.customerLanguagePreference,
        result.businessLanguage,
      );
      try {
        await bot.api.sendMessage(
          result.customerTelegramUserId,
          t(customerLang, 'paymentConfirmedCustomer'),
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
        { botUsername: ctx.botUsername, ownerTelegramChatId: chatId },
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
