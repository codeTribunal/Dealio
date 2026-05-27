import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendError } from '../lib/errors.js';
import { getBotToken } from '../lib/getBotToken.js';

function verifyBotManagerSecret(request: FastifyRequest, reply: FastifyReply): boolean {
  const secret = request.headers['x-bot-secret'];
  if (!secret || secret !== process.env.BOT_MANAGER_SECRET) {
    sendError(reply, 401, 'Unauthorized');
    return false;
  }
  return true;
}

const getTokenBody = z.object({
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
   * GET /internal/businesses
   * Returns all active (non-suspended) businesses that have a bot configured.
   * Used by the bot manager at startup to know which bots to start.
   */
  app.get('/internal/businesses', async (request, reply) => {
    if (!verifyBotManagerSecret(request, reply)) return;

    const businesses = await prisma.business.findMany({
      where: {
        botTokenEncrypted: { not: null },
        suspendedAt: null,
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
