import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Impersonation guardrail.
 *
 * `POST /admin/businesses/:id/impersonate` mints a normal *owner* JWT that
 * additionally carries `isImpersonation: true`. Until now nothing read that
 * flag, so an impersonating admin had the owner's full read+write powers. This
 * guard enforces it: support staff may view and help, but may not destroy data
 * or move money while wearing an owner's identity.
 *
 * Deny-list (conservative — read-only and routine writes stay allowed):
 *  - every DELETE on an owner route (all current owner deletes are soft, but
 *    the destructive intent is identical),
 *  - any PATCH whose route ends in `/payment`, which covers:
 *      · PATCH /orders/:id/payment        — confirm a customer order payment
 *      · PATCH /appointments/:id/payment  — confirm an appointment payment
 *
 * The bot payment-confirm route (POST /bot/confirm-payment) is authenticated by
 * the shared bot secret, never an owner token, so an impersonation flag can
 * never reach it — it needs no entry here.
 */
export function isImpersonationBlocked(method: string, routeUrl: string): boolean {
  if (method === 'DELETE') return true;
  if (method === 'PATCH' && routeUrl.endsWith('/payment')) return true;
  return false;
}

/**
 * App-level preHandler. Runs for every request; it self-verifies the bearer
 * token as an OWNER token, so it stays inert for public routes, admin routes
 * (different secret/namespace → verify throws → ignored), and non-impersonation
 * owner tokens. Authentication itself is still left to each route's own
 * preHandler — this guard only adds a deny on top.
 */
export async function impersonationGuard(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return;

  let isImpersonation = false;
  try {
    const payload = await request.jwtVerify<{ isImpersonation?: boolean }>();
    isImpersonation = payload?.isImpersonation === true;
  } catch {
    // Not a valid owner token (e.g. an admin token, or expired/garbage). This
    // guard does nothing; the route's own auth decides whether to reject.
    return;
  }

  if (!isImpersonation) return;

  const routeUrl = request.routeOptions?.url ?? request.url;
  if (isImpersonationBlocked(request.method, routeUrl)) {
    return reply.status(403).send({
      error: 'IMPERSONATION_READONLY',
      message: 'This action is disabled in impersonation mode.',
    });
  }
}
