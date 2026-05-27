import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import { FastifyInstance } from 'fastify';

export default fp(async function (app: FastifyInstance) {
  await app.register(helmet, {
    contentSecurityPolicy: false, // Next.js handles CSP on the client side
  });
});
