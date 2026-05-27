import Fastify from 'fastify';
import corsPlugin from './plugins/cors.js';
import jwtPlugin from './plugins/jwt.js';
import rateLimitPlugin from './plugins/rateLimit.js';
import helmetPlugin from './plugins/helmet.js';
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import customerRoutes from './routes/customers.js';
import botRoutes from './routes/bot.js';
import analyticsRoutes from './routes/analytics.js';
import reminderRoutes from './routes/reminders.js';
import homeRoutes from './routes/home.js';
import customFieldRoutes from './routes/custom-fields.js';
import stageRoutes from './routes/stages.js';
import checkoutQuestionRoutes from './routes/checkout-questions.js';
import serviceRoutes from './routes/services.js';
import staffRoutes from './routes/staff.js';
import appointmentRoutes from './routes/appointments.js';
import projectRoutes from './routes/projects.js';
import proposalRoutes from './routes/proposals.js';
import deviceTokenRoutes from './routes/device-token.js';
import internalRoutes from './routes/internal.js';
import { prisma } from './lib/prisma.js';

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

async function bootstrap() {
  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(jwtPlugin);
  await app.register(rateLimitPlugin);

  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(businessRoutes, { prefix: '/api/v1' });
  await app.register(productRoutes, { prefix: '/api/v1' });
  await app.register(orderRoutes, { prefix: '/api/v1' });
  await app.register(customerRoutes, { prefix: '/api/v1' });
  await app.register(botRoutes, { prefix: '/api/v1' });
  await app.register(analyticsRoutes, { prefix: '/api/v1' });
  await app.register(reminderRoutes, { prefix: '/api/v1' });
  await app.register(homeRoutes, { prefix: '/api/v1' });
  await app.register(customFieldRoutes, { prefix: '/api/v1' });
  await app.register(stageRoutes, { prefix: '/api/v1' });
  await app.register(checkoutQuestionRoutes, { prefix: '/api/v1' });
  await app.register(serviceRoutes, { prefix: '/api/v1' });
  await app.register(staffRoutes, { prefix: '/api/v1' });
  await app.register(appointmentRoutes, { prefix: '/api/v1' });
  await app.register(projectRoutes, { prefix: '/api/v1' });
  await app.register(proposalRoutes, { prefix: '/api/v1' });
  await app.register(deviceTokenRoutes, { prefix: '/api/v1' });
  await app.register(internalRoutes, { prefix: '/api/v1' });

  app.get('/health', async () => ({ status: 'ok' }));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`Server running on port ${port}`);

  // Wake the DB connection immediately so the first real request isn't slow
  await prisma.$connect();
  app.log.info('Database connection established');
}

bootstrap().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await app.close();
  await prisma.$disconnect();
});
