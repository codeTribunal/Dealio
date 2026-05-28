import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance } from 'fastify';

export default fp(async function adminJwtPlugin(fastify: FastifyInstance) {
  fastify.register(jwt, {
    secret: process.env.ADMIN_JWT_SECRET ?? 'admin-dev-secret-change-me',
    namespace: 'admin',
    jwtVerify: 'adminVerify',
    jwtSign: 'adminSign',
  });
});
