import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

export default fp(async function (app: FastifyInstance) {
  await app.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3001',
        'http://localhost:3000',
        process.env.OWNER_APP_URL,
        process.env.ADMIN_APP_URL,
      ].filter(Boolean) as string[];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Bot-Secret'],
    // Expose the full rate-limit set so browser (web) clients can read backoff
    // timing on a 429. Retry-After + X-RateLimit-Reset are already sent by
    // @fastify/rate-limit's defaults but are invisible to fetch/XHR unless listed.
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],
    maxAge: 86400,
  });
});
