import { prisma } from './prisma.js';
import { FastifyReply, FastifyRequest } from 'fastify';
import { sendError } from './errors.js';

/**
 * Resolve the authenticated owner's business, or send an error and return null.
 *
 * This is the single chokepoint every owner route funnels through, so tenancy
 * AND suspension are enforced here:
 *   - 404 if the user has no business yet (onboarding incomplete).
 *   - 403 ACCOUNT_SUSPENDED if the business is suspended — UNLESS this request
 *     is an admin impersonation session (a normal owner JWT additionally
 *     carrying `isImpersonation: true`, minted by the admin impersonate route).
 *     Support staff must keep READ access to a suspended account to help/debug;
 *     destructive impersonation writes are already fenced off by
 *     impersonationGuard (middleware/impersonation.ts).
 *
 * Callers use:
 *   const business = await getBusinessOrFail(request, reply);
 *   if (!business) return;
 * so a null return halts the handler after the response has been sent.
 */
export async function getBusinessOrFail(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { userId, isImpersonation } = request.user as {
    userId: string;
    isImpersonation?: boolean;
  };

  const business = await prisma.business.findUnique({ where: { ownerId: userId } });
  if (!business) {
    sendError(reply, 404, 'Business not found. Complete onboarding first.');
    return null;
  }

  // Suspended businesses are blocked on the owner API. Admin impersonation is
  // exempt so support can still view (read) the suspended account.
  if (business.suspendedAt && isImpersonation !== true) {
    reply.status(403).send({
      error: 'ACCOUNT_SUSPENDED',
      reason: business.suspendedReason || 'Your account has been suspended.',
    });
    return null;
  }

  return business;
}
