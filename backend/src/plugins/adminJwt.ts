import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance } from 'fastify';
import { requireSecret } from '../lib/validateEnv.js';

export default fp(async function adminJwtPlugin(fastify: FastifyInstance) {
  fastify.register(jwt, {
    // No fallback: requireSecret throws if ADMIN_JWT_SECRET is missing/placeholder.
    secret: requireSecret('ADMIN_JWT_SECRET'),
    namespace: 'admin',
    jwtVerify: 'adminVerify',
    jwtSign: 'adminSign',
  });
});
