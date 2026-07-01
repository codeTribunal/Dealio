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
 * Model: DENY-BY-DEFAULT (allow-list). An impersonation session is read-only.
 * Every state-changing method (POST/PATCH/PUT/DELETE) is blocked unless its
 * { method, route } is on IMPERSONATION_WRITE_ALLOWLIST (currently empty), so a
 * newly-added destructive/write route is blocked automatically with no suffix
 * pattern to maintain. Only GET/HEAD/OPTIONS pass. The bot payment routes use
 * the shared bot secret (never an owner token), so an impersonation flag can
 * never reach them regardless.
 */
// Non-mutating HTTP methods — always safe during impersonation.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Explicit allow-list of state-changing routes an impersonation session MAY
// perform (deny-by-default: anything not listed is blocked). Empty = strictly
// read-only. To permit a specific write, add { method, url } where url is the
// Fastify route pattern (e.g. '/orders/:id/status').
const IMPERSONATION_WRITE_ALLOWLIST: ReadonlyArray<{ method: string; url: string }> = [];

export function isImpersonationBlocked(method: string, routeUrl: string): boolean {
  const m = method.toUpperCase();
  if (SAFE_METHODS.has(m)) return false;
  // Deny-by-default: every mutating method is blocked unless explicitly allowed.
  return !IMPERSONATION_WRITE_ALLOWLIST.some(
    (e) => e.method === m && e.url === routeUrl,
  );
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
