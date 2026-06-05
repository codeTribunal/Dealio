import 'dotenv/config';
import axios from 'axios';
import express, { type Request, type Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { MyContext, SessionData } from './lib/types.js';
import { registerCatalogHandlers } from './scenes/catalog.js';
import { checkoutConversation } from './scenes/checkout.js';
import { bookingConversation } from './scenes/booking.js';
import { registerCommandHandlers } from './handlers/commands.js';
import { registerOwnerHandlers } from './handlers/owner.js';
import { registerProjectHandlers } from './scenes/project.js';
import { runReminderJob } from './jobs/reminders.js';
import { saveCustomerMessage, SuspendedError, SUSPENSION_MESSAGE } from './lib/api.js';
import { createPlatformBot } from './platform/bot.js';

interface BusinessRecord {
  id: string;
  name: string;
  botUsername: string | null;
}

const backendClient = axios.create({
  baseURL: process.env.BACKEND_URL ?? 'http://localhost:3000',
  headers: {
    'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

// Map of businessId → running Bot instance
const activeBots = new Map<string, Bot<MyContext>>();

// The central platform (owner-auth) bot — separate from the per-business bots.
let platformBot: ReturnType<typeof createPlatformBot> | null = null;

/**
 * Start the central PLATFORM bot for owner authentication, if PLATFORM_BOT_TOKEN
 * is configured. It is independent of (and additive to) the per-business bots —
 * it is never added to activeBots and only handles enrollment.
 */
async function startPlatformBot(): Promise<void> {
  const token = process.env.PLATFORM_BOT_TOKEN;
  if (!token) {
    console.log('[platform-bot] PLATFORM_BOT_TOKEN not set — owner-auth bot disabled');
    return;
  }

  try {
    const bot = createPlatformBot(token);
    platformBot = bot;
    await bot.init();
    bot
      .start({
        drop_pending_updates: false,
        onStart: (info) => console.log(`[platform-bot] live @${info.username}`),
      })
      .catch((err) => {
        console.error('[platform-bot] crashed:', err);
        platformBot = null;
        setTimeout(() => {
          console.log('[platform-bot] retrying...');
          startPlatformBot().catch(console.error);
        }, 30_000);
      });
  } catch (err) {
    console.error('[platform-bot] failed to start:', err);
    platformBot = null;
  }
}

/**
 * Register all handlers on a bot instance.
 * businessId and botUsername are injected into ctx via middleware so every
 * handler can identify which business it's serving.
 */
function registerHandlers(
  bot: Bot<MyContext>,
  businessId: string,
  botUsername: string,
): void {
  // Inject business identity into every ctx before any other middleware
  bot.use(async (ctx, next) => {
    ctx.businessId = businessId;
    ctx.botUsername = botUsername;
    await next();
  });

  bot.use(
    session<SessionData, MyContext>({
      initial: (): SessionData => ({ cart: [] }),
    }),
  );

  bot.use(conversations());
  bot.use(createConversation(checkoutConversation));
  bot.use(createConversation(bookingConversation));

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
        botUsername,
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
      if (err instanceof SuspendedError) {
        await ctx.reply(SUSPENSION_MESSAGE).catch(() => {});
        return;
      }
      console.error('[bot] message save failed:', err);
    }
  });

  bot.catch(async (err) => {
    const ctx = err.ctx;
    // A suspended business still has a running bot — reply with a notice
    // instead of logging a stack trace for every customer interaction.
    if (err.error instanceof SuspendedError) {
      await ctx.reply(SUSPENSION_MESSAGE).catch(() => {});
      return;
    }
    console.error(
      `[${botUsername}] Error while handling update ${ctx.update.update_id}:`,
      err.error,
    );
  });
}

/**
 * Get the decrypted token and username for a business from the backend.
 */
async function fetchBotInfo(
  businessId: string,
): Promise<{ token: string; botUsername: string | null }> {
  const res = await backendClient.post('/api/v1/internal/get-bot-token', { businessId });
  return {
    token: res.data.token as string,
    botUsername: (res.data.botUsername ?? null) as string | null,
  };
}

/**
 * Start a bot instance for a business and store it in activeBots.
 * On crash, the bot is removed from the map and retried after 30s.
 */
async function startBotForBusiness(
  businessId: string,
  botUsername: string,
  token: string,
): Promise<void> {
  if (activeBots.has(businessId)) {
    console.log(`[bot-manager] Bot already running for ${businessId} (@${botUsername})`);
    return;
  }

  try {
    const bot = new Bot<MyContext>(token);
    registerHandlers(bot, businessId, botUsername);

    // Store before starting so concurrent start requests are deduped.
    activeBots.set(businessId, bot);

    // init + register the reminder job (and its CANCEL handler) before start,
    // since grammy disallows installing handlers once polling has begun.
    await bot.init();
    runReminderJob(bot, botUsername);

    console.log(`[bot-manager] Starting bot for business ${businessId} (@${botUsername})`);

    // Start long polling in the background — runs until the bot is stopped.
    bot
      .start({
        drop_pending_updates: false,
        onStart: (botInfo) => {
          console.log(
            `[bot-manager] Bot @${botInfo.username} live for business ${businessId}`,
          );
        },
      })
      .catch((err) => {
        console.error(`[bot-manager] Bot crashed for ${businessId}:`, err);
        activeBots.delete(businessId);

        // Retry after 30 seconds
        setTimeout(() => {
          console.log(`[bot-manager] Retrying bot for ${businessId}...`);
          startBotForBusiness(businessId, botUsername, token).catch(console.error);
        }, 30_000);
      });
  } catch (err) {
    console.error(`[bot-manager] Failed to start bot for ${businessId}:`, err);
    activeBots.delete(businessId);
    throw err;
  }
}

// ── HTTP manager server ───────────────────────────────────────────────────

function verifyBotSecret(req: Request): boolean {
  const secret = req.headers['x-bot-secret'];
  const provided = Buffer.from(typeof secret === 'string' ? secret : '', 'utf8');
  const expected = Buffer.from(process.env.BOT_MANAGER_SECRET ?? '', 'utf8');
  return (
    provided.length > 0 &&
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

function startManagerServer(): void {
  const botManagerApp = express();
  botManagerApp.use(express.json());

  // POST /internal/start-bot — start a bot for a newly onboarded business
  botManagerApp.post('/internal/start-bot', async (req: Request, res: Response) => {
    if (!verifyBotSecret(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const businessId = (req.body as { businessId?: string })?.businessId;
    if (!businessId) {
      res.status(400).json({ error: 'businessId required' });
      return;
    }

    if (activeBots.has(businessId)) {
      res.json({ success: true, message: 'Bot already running' });
      return;
    }

    try {
      const info = await fetchBotInfo(businessId);
      if (!info.token) {
        res.status(500).json({ error: 'Could not get token' });
        return;
      }
      if (!info.botUsername) {
        res.status(500).json({ error: 'Could not get bot username' });
        return;
      }

      await startBotForBusiness(businessId, info.botUsername, info.token);
      res.json({ success: true, message: 'Bot started' });
    } catch (err) {
      console.error(`[bot-manager] start-bot failed for ${businessId}:`, err);
      res.status(500).json({ error: 'Could not start bot' });
    }
  });

  // POST /internal/stop-bot — stop a running bot
  botManagerApp.post('/internal/stop-bot', async (req: Request, res: Response) => {
    if (!verifyBotSecret(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const businessId = (req.body as { businessId?: string })?.businessId;
    if (!businessId) {
      res.status(400).json({ error: 'businessId required' });
      return;
    }

    if (!activeBots.has(businessId)) {
      res.json({ success: true, message: 'Bot not running' });
      return;
    }

    const bot = activeBots.get(businessId)!;
    try {
      await bot.stop();
    } catch (err) {
      console.error(`[bot-manager] Error stopping bot for ${businessId}:`, err);
    }
    activeBots.delete(businessId);
    res.json({ success: true });
  });

  // GET /internal/status — list running bots
  botManagerApp.get('/internal/status', (req: Request, res: Response) => {
    if (!verifyBotSecret(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json({
      running: activeBots.size,
      businesses: Array.from(activeBots.keys()),
    });
  });

  const port = Number(process.env.BOT_MANAGER_PORT) || 3002;
  botManagerApp.listen(port, () =>
    console.log(`Bot manager HTTP server on port ${port}`),
  );
}

async function main(): Promise<void> {
  // 1. Start the HTTP server first so it can receive commands even if the
  //    initial bot loading is slow or the backend is briefly unavailable.
  startManagerServer();

  // 1b. Start the central platform (owner-auth) bot, independent of the
  //     per-business bots so an empty business list doesn't keep it offline.
  await startPlatformBot();

  // 2. Fetch all active businesses from the backend.
  console.log('[bot-manager] Loading active businesses...');
  let businesses: BusinessRecord[];
  try {
    const res = await backendClient.get('/api/v1/internal/businesses');
    businesses = res.data as BusinessRecord[];
  } catch (err) {
    console.error('[bot-manager] Failed to load businesses from backend:', err);
    // Do not exit — the HTTP server is up and can still receive start-bot calls.
    return;
  }

  const withBot = businesses.filter((b) => b.botUsername);
  console.log(`[bot-manager] Found ${withBot.length} business(es) to start`);

  // 3. Start every bot concurrently. allSettled so one failure doesn't block
  //    the others.
  await Promise.allSettled(
    withBot.map(async (b) => {
      const info = await fetchBotInfo(b.id);
      await startBotForBusiness(b.id, b.botUsername!, info.token);
    }),
  );

  // 4. Summary
  console.log(`[bot-manager] Started ${activeBots.size}/${withBot.length} bots`);
}

// ── Graceful shutdown ───────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log('[bot-manager] Shutting down gracefully...');

  if (platformBot) {
    try {
      await platformBot.stop();
      console.log('[platform-bot] Stopped');
    } catch (err) {
      console.error('[platform-bot] Error stopping:', err);
    }
  }

  const stopPromises = Array.from(activeBots.entries()).map(
    async ([businessId, bot]) => {
      try {
        await bot.stop();
        console.log(`[bot-manager] Stopped bot for ${businessId}`);
      } catch (err) {
        console.error(`[bot-manager] Error stopping bot for ${businessId}:`, err);
      }
    },
  );

  await Promise.allSettled(stopPromises);
  console.log('[bot-manager] All bots stopped');
  process.exit(0);
}

process.on('SIGTERM', () => {
  shutdown().catch(() => process.exit(1));
});

process.on('SIGINT', () => {
  shutdown().catch(() => process.exit(1));
});

main().catch((err) => {
  console.error('[bot-manager] Fatal error:', err);
  process.exit(1);
});
