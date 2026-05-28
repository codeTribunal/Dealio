import { timingSafeEqual } from 'crypto';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendError } from '../lib/errors.js';
import { getBotToken } from '../lib/getBotToken.js';

function verifyBotManagerSecret(request: FastifyRequest, reply: FastifyReply): boolean {
  const secret = request.headers['x-bot-secret'];
  const provided = Buffer.from(typeof secret === 'string' ? secret : '', 'utf8');
  const expected = Buffer.from(process.env.BOT_MANAGER_SECRET ?? '', 'utf8');
  if (provided.length === 0 || provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    sendError(reply, 401, 'Unauthorized');
    return false;
  }
  return true;
}

const getTokenBody = z.object({
  businessId: z.string(),
});

const startBotBody = z.object({
  businessId: z.string(),
});

export default async function internalRoutes(app: FastifyInstance) {
  /**
   * POST /internal/get-bot-token
   * Internal only — called by the bot manager at startup to get the decrypted
   * token for a given business. Requires BOT_MANAGER_SECRET header.
   * Never exposed publicly.
   */
  app.post('/internal/get-bot-token', async (request, reply) => {
    if (!verifyBotManagerSecret(request, reply)) return;

    const parsed = getTokenBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { businessId } = parsed.data;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        botTokenEncrypted: true,
        botTokenIv: true,
        botTokenTag: true,
        botUsername: true,
        suspendedAt: true,
      },
    });

    if (!business) return sendError(reply, 404, 'Business not found');

    let token: string;
    try {
      token = getBotToken(business);
    } catch {
      return sendError(reply, 404, 'Bot token not configured for this business');
    }

    return reply.send({ token, botUsername: business.botUsername });
  });

  /**
   * POST /internal/start-bot
   * Forwards a start request to the running bot manager service so it can hot-load
   * a bot instance for the given business without a restart. Requires the secret.
   */
  app.post('/internal/start-bot', async (request, reply) => {
    if (!verifyBotManagerSecret(request, reply)) return;

    const parsed = startBotBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { businessId } = parsed.data;

    try {
      const botServiceUrl = process.env.BOT_SERVICE_URL ?? 'http://localhost:3002';

      const res = await fetch(`${botServiceUrl}/internal/start-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '',
        },
        body: JSON.stringify({ businessId }),
        signal: AbortSignal.timeout(10_000), // 10 second timeout
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('[internal] Bot service error:', data);
        return reply.status(502).send({ error: 'Bot service unavailable' });
      }

      return reply.send(data);
    } catch (err) {
      // Do not fail onboarding if the bot service is down — log and report a
      // soft success so the caller can proceed; the bot starts on next restart.
      console.error('[internal] Failed to reach bot service:', err);
      return reply.send({
        success: true,
        warning: 'Bot service unreachable — bot will start on next restart',
      });
    }
  });

  /**
   * GET /internal/businesses
   * Returns ALL businesses that have a bot configured, including suspended ones.
   * Suspended bots must still run so they can reply with the suspension message
   * when a customer interacts (the suspension check lives in the bot handlers).
   * Used by the bot manager at startup to know which bots to start.
   */
  app.get('/internal/businesses', async (request, reply) => {
    if (!verifyBotManagerSecret(request, reply)) return;

    const businesses = await prisma.business.findMany({
      where: {
        botTokenEncrypted: { not: null },
        botUsername: { not: null },
      },
      select: {
        id: true,
        name: true,
        botUsername: true,
      },
    });

    return reply.send(businesses);
  });
}
