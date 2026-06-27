import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance } from 'fastify';
import { requireSecret } from '../lib/validateEnv.js';

export default fp(async function (app: FastifyInstance) {
  await app.register(jwt, {
    // No fallback: requireSecret throws if JWT_SECRET is missing/placeholder.
    secret: requireSecret('JWT_SECRET'),
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
    },
  });
});
