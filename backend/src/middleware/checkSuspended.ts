import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

/**
 * Prehandler that blocks access for suspended businesses.
 * Must be used AFTER the authenticate middleware so request.user is set.
 *
 * Usage:
 *   app.get('/some-route', { preHandler: [authenticate, checkSuspended] }, handler)
 */
export async function checkSuspended(request: FastifyRequest, reply: FastifyReply) {
  const business = await prisma.business.findUnique({
    where: { ownerId: request.user.userId },
    select: { suspendedAt: true, suspendedReason: true },
  });

  if (business?.suspendedAt) {
    return reply.status(403).send({
      error: 'ACCOUNT_SUSPENDED',
      reason: business.suspendedReason ?? 'Your account has been suspended.',
    });
  }
}
