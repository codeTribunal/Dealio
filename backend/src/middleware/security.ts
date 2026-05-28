import { FastifyRequest, FastifyReply } from 'fastify';

export async function securityHeaders(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}
