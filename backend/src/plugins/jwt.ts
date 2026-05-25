import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance } from 'fastify';

export default fp(async function (app: FastifyInstance) {
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
    },
  });
});
