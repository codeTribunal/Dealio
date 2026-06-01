import Fastify from 'fastify';
import corsPlugin from './plugins/cors.js';
import jwtPlugin from './plugins/jwt.js';
import adminJwtPlugin from './plugins/adminJwt.js';
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
import blockedSlotRoutes from './routes/blocked-slots.js';
import projectRoutes from './routes/projects.js';
import proposalRoutes from './routes/proposals.js';
import deviceTokenRoutes from './routes/device-token.js';
import internalRoutes from './routes/internal.js';
import adminRoutes from './routes/admin.js';
import onboardingRoutes from './routes/onboarding.js';
import { calendarRoutes } from './routes/calendar.js';
import { securityHeaders } from './middleware/security.js';
import { detectMaliciousInput } from './middleware/inputSanitizer.js';
import { prisma } from './lib/prisma.js';
import { runOwnerReminders } from './jobs/ownerReminders.js';

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  bodyLimit: 1048576, // 1 MB max request body
  trustProxy: true,   // trust Railway's proxy for real IP
});

// Register hooks on the root instance BEFORE any plugin registration so they
// fire for every route regardless of plugin scope.
app.addHook('preHandler', securityHeaders);
app.addHook('preHandler', detectMaliciousInput);

async function bootstrap() {
  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(jwtPlugin);
  await app.register(adminJwtPlugin);
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
  await app.register(blockedSlotRoutes, { prefix: '/api/v1' });
  await app.register(projectRoutes, { prefix: '/api/v1' });
  await app.register(proposalRoutes, { prefix: '/api/v1' });
  await app.register(deviceTokenRoutes, { prefix: '/api/v1' });
  await app.register(internalRoutes, { prefix: '/api/v1' });
  await app.register(adminRoutes, { prefix: '/api/v1' });
  await app.register(onboardingRoutes, { prefix: '/api/v1' });

  // Calendar ICS feed — registered at root (no /api/v1 prefix) so the
  // subscription URL stays short: https://api.uzbekcrm.uz/calendar/:token.ics
  await app.register(calendarRoutes);

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`Server running on port ${port}`);

  // Wake the DB connection immediately so the first real request isn't slow
  await prisma.$connect();
  app.log.info('Database connection established');

  // Owner reminder job — checks every 15 minutes for upcoming appointments,
  // order deliveries, and project/milestone deadlines and notifies owners via
  // Telegram + push. Runs once on startup, then on an interval. Separate from
  // the bot service's customer-facing reminder job.
  const REMINDER_INTERVAL_MS = 15 * 60_000;
  runOwnerReminders().catch((err) => console.error('[reminders] Initial run failed:', err));
  setInterval(() => {
    runOwnerReminders().catch((err) => console.error('[reminders] Interval run failed:', err));
  }, REMINDER_INTERVAL_MS);
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
