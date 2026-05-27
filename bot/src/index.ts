import 'dotenv/config';
import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { MyContext, SessionData } from './lib/types.js';
import { setBotUsername, getBotUsername } from './lib/botContext.js';
import { registerCatalogHandlers } from './scenes/catalog.js';
import { checkoutConversation } from './scenes/checkout.js';
import { bookingConversation } from './scenes/booking.js';
import { registerCommandHandlers } from './handlers/commands.js';
import { registerOwnerHandlers } from './handlers/owner.js';
import { registerProjectHandlers } from './scenes/project.js';
import { runReminderJob } from './jobs/reminders.js';
import { saveCustomerMessage } from './lib/api.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

const bot = new Bot<MyContext>(BOT_TOKEN);

// ── Middleware setup (order matters) ─────────────────────────────
bot.use(
  session<SessionData, MyContext>({
    initial: (): SessionData => ({ cart: [] }),
  }),
);

bot.use(conversations());
bot.use(createConversation(checkoutConversation));
bot.use(createConversation(bookingConversation));

// ── Route handlers ───────────────────────────────────────────────
registerCommandHandlers(bot);
registerCatalogHandlers(bot);
registerOwnerHandlers(bot);
registerProjectHandlers(bot);

// Enter checkout conversation when "checkout" callback fires
bot.callbackQuery('checkout', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('checkoutConversation');
});

// Free-text message catch-all — save to inbox and notify owner
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;

  const telegramUserId = String(ctx.from?.id ?? '');
  if (!telegramUserId) return;

  try {
    const result = await saveCustomerMessage({
      botUsername: getBotUsername(),
      telegramUserId,
      text,
      telegramMessageId: String(ctx.message.message_id),
    });

    if (result.ownerNotification) {
      const { chatId, customerName, text: msgText } = result.ownerNotification;
      await ctx.api.sendMessage(
        chatId,
        `💬 <b>${customerName}:</b> ${msgText}`,
        { parse_mode: 'HTML' },
      );
    }
  } catch (err) {
    console.error('[bot] message save failed:', err);
  }
});

// ── Error handler ────────────────────────────────────────────────
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});

// ── Start ────────────────────────────────────────────────────────
async function main() {
  console.log('Starting bot (long polling)...');

  // Fetch bot info so we have the username before any handlers run
  await bot.init();
  setBotUsername(bot.botInfo.username);
  console.log(`Bot username resolved: @${bot.botInfo.username}`);

  // Start reminder cron job — runs every hour
  runReminderJob(bot);

  await bot.start({
    onStart: (info) => console.log(`Bot @${info.username} is running`),
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
