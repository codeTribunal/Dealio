import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

export default fp(async function (app: FastifyInstance) {
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
});
