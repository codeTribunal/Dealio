import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    // adminVerify() returns the decoded payload directly.
    // @fastify/jwt with namespace still stores the payload in request.user,
    // so we rely on the return value to avoid collision with the owner JWT.
    const payload = (await request.adminVerify()) as { adminUserId: string; role: string };

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
