import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

/** Name of the httpOnly session cookie set by POST /admin/auth/login. */
export const ADMIN_SESSION_COOKIE = 'admin_session';

const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF guard for the cookie-authenticated admin panel: every /admin/* request
 * with a method other than GET/HEAD/OPTIONS must carry
 * `x-requested-with: dealio-admin`. A browser will not attach this custom
 * header cross-site without passing our CORS preflight, so a forged
 * cross-origin request riding the admin_session cookie is rejected before any
 * handler runs. Registered as a global onRequest hook in index.ts so it also
 * covers the public login route (login CSRF).
 */
export async function adminCsrfGuard(request: FastifyRequest, reply: FastifyReply) {
  if (!request.url.startsWith('/api/v1/admin/')) return;
  if (CSRF_SAFE_METHODS.has(request.method)) return;
  if (request.headers['x-requested-with'] !== 'dealio-admin') {
    return reply.status(403).send({ error: 'CSRF_HEADER_REQUIRED' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Token transport: the httpOnly admin_session cookie first (the panel's
    // primary channel), falling back to Authorization: Bearer (scripts, REST
    // clients). Both verify against the same admin JWT namespace — the
    // verification logic itself is unchanged.
    //
    // adminVerify() returns the decoded payload directly.
    // @fastify/jwt with namespace still stores the payload in request.user,
    // so we rely on the return value to avoid collision with the owner JWT.
    const cookieToken = request.cookies?.[ADMIN_SESSION_COOKIE];
    const payload = cookieToken
      ? ((
          request.server.jwt as unknown as {
            admin: { verify(token: string): unknown };
          }
        ).admin.verify(cookieToken) as { adminUserId: string; role: string })
      : ((await request.adminVerify()) as { adminUserId: string; role: string });

    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.adminUserId },
      select: { id: true, role: true, name: true, email: true },
    });

    if (!admin) {
      return reply.status(401).send({ error: 'Admin not found' });
    }

    request.adminUser = admin;
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAdmin(request, reply);
  if (request.adminUser?.role !== 'SUPER_ADMIN') {
    return reply.status(403).send({ error: 'Forbidden — Super Admin access required' });
  }
}
