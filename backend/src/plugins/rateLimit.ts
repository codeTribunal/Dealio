import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';

export default fp(async function (app: FastifyInstance) {
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: 60000,
    // Key on request.ip (plugin default). With trustProxy:1 in the Fastify
    // constructor, request.ip is the real client IP (rightmost XFF entry,
    // appended by Railway) — not the client-supplied, spoofable XFF header.
    errorResponseBuilder: (_request, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      };
    },
  });
});
