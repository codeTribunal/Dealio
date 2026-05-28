import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { encryptBotToken } from '../lib/crypto.js';
import { sendError } from '../lib/errors.js';

const BOT_TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]{35,}$/;

const verifyTokenBody = z.object({
  token: z.string().regex(BOT_TOKEN_REGEX, 'Invalid bot token format'),
});

const completeBody = z.object({
  businessName: z.string().min(1).max(100),
  mode: z.array(z.enum(['PRODUCTS', 'SERVICES', 'FREELANCE'])).min(1),
  language: z.enum(['UZBEK', 'RUSSIAN', 'ENGLISH']),
  botToken: z.string().regex(BOT_TOKEN_REGEX, 'Invalid bot token format'),
  cardNumber: z.string().optional(),
  cardBank: z.enum(['UZCARD', 'HUMO']).optional(),
});

interface TelegramBotInfo {
  ok: boolean;
  username?: string;
  firstName?: string;
}

async function callTelegramGetMe(token: string): Promise<TelegramBotInfo> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as {
      ok: boolean;
      result?: { username: string; first_name: string };
    };
    if (!data.ok) return { ok: false };
    return {
      ok: true,
      username: data.result?.username,
      firstName: data.result?.first_name,
    };
  } catch {
    return { ok: false };
  }
}

export default async function onboardingRoutes(app: FastifyInstance) {
  /**
   * POST /onboarding/verify-bot-token
   * Public — no auth required.
   * Validates token format, calls Telegram getMe, checks uniqueness.
   */
  app.post('/onboarding/verify-bot-token', async (request, reply) => {
    const parsed = verifyTokenBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0].message);
    }
    const { token } = parsed.data;

    const tg = await callTelegramGetMe(token);
    if (!tg.ok) {
      return sendError(reply, 400, 'Invalid bot token. Check and try again.');
    }

    const existing = await prisma.business.findUnique({
      where: { botUsername: tg.username },
    });
    if (existing) {
      return sendError(reply, 409, 'This bot is already registered to another business.');
    }

    return reply.send({
      valid: true,
      botUsername: tg.username,
      botName: tg.firstName,
    });
  });

  /**
   * POST /onboarding/complete
   * Requires JWT auth. Creates the business and fires off the bot manager.
   */
  app.post(
    '/onboarding/complete',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const parsed = completeBody.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, parsed.error.issues[0].message);
      }
      const { businessName, mode, language, botToken, cardNumber, cardBank } = parsed.data;

      const existingBusiness = await prisma.business.findUnique({
        where: { ownerId: request.user.userId },
      });
      if (existingBusiness) {
        return sendError(reply, 409, 'You already have a registered business.');
      }

      const tg = await callTelegramGetMe(botToken);
      if (!tg.ok) {
        return sendError(reply, 400, 'Invalid bot token. Check and try again.');
      }

      const botUsernameTaken = await prisma.business.findUnique({
        where: { botUsername: tg.username },
      });
      if (botUsernameTaken) {
        return sendError(reply, 409, 'This bot is already registered to another business.');
      }

      const encrypted = encryptBotToken(botToken);

      const business = await prisma.business.create({
        data: {
          name: businessName,
          mode: mode,
          language: language,
          botTokenEncrypted: encrypted.encrypted,
          botTokenIv: encrypted.iv,
          botTokenTag: encrypted.tag,
          botUsername: tg.username,
          cardNumber: cardNumber ?? null,
          cardBank: cardBank ?? null,
          ownerId: request.user.userId,
          plan: 'FREE',
        },
      });

      // Fire-and-forget: tell the bot manager service to hot-start this bot.
      // Do not await — failure here must not fail onboarding.
      const botServiceUrl = process.env.BOT_SERVICE_URL ?? 'http://localhost:3002';
      fetch(`${botServiceUrl}/internal/start-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '',
        },
        body: JSON.stringify({ businessId: business.id }),
      }).catch((err: unknown) => {
        app.log.error({ err }, '[onboarding] bot-manager notification failed');
      });

      return reply.send({
        business: {
          id: business.id,
          name: business.name,
          botUsername: business.botUsername,
          botLink: `https://t.me/${business.botUsername}`,
        },
      });
    },
  );
}
