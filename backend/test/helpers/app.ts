import Fastify, { type FastifyInstance } from 'fastify';

import corsPlugin from '../../src/plugins/cors.js';
import jwtPlugin from '../../src/plugins/jwt.js';
import adminJwtPlugin from '../../src/plugins/adminJwt.js';
import helmetPlugin from '../../src/plugins/helmet.js';
import authRoutes from '../../src/routes/auth.js';
import businessRoutes from '../../src/routes/business.js';
import productRoutes from '../../src/routes/products.js';
import orderRoutes from '../../src/routes/orders.js';
import customerRoutes from '../../src/routes/customers.js';
import botRoutes from '../../src/routes/bot.js';
import analyticsRoutes from '../../src/routes/analytics.js';
import reminderRoutes from '../../src/routes/reminders.js';
import homeRoutes from '../../src/routes/home.js';
import customFieldRoutes from '../../src/routes/custom-fields.js';
import stageRoutes from '../../src/routes/stages.js';
import checkoutQuestionRoutes from '../../src/routes/checkout-questions.js';
import serviceRoutes from '../../src/routes/services.js';
import staffRoutes from '../../src/routes/staff.js';
import appointmentRoutes from '../../src/routes/appointments.js';
import blockedSlotRoutes from '../../src/routes/blocked-slots.js';
import projectRoutes from '../../src/routes/projects.js';
import proposalRoutes from '../../src/routes/proposals.js';
import deviceTokenRoutes from '../../src/routes/device-token.js';
import internalRoutes from '../../src/routes/internal.js';
import adminRoutes from '../../src/routes/admin.js';
import adminDataRoutes from '../../src/routes/adminData.js';
import onboardingRoutes from '../../src/routes/onboarding.js';
import { calendarRoutes } from '../../src/routes/calendar.js';
import { securityHeaders } from '../../src/middleware/security.js';
import { detectMaliciousInput } from '../../src/middleware/inputSanitizer.js';
import { impersonationGuard } from '../../src/middleware/impersonation.js';

/**
 * Builds the real Fastify app exactly as src/index.ts does — same hooks,
 * plugins, routes, and /api/v1 prefix — but without listen()/cron, and with
 * the logger off for quiet tests.
 *
 * The rate-limit plugin is intentionally NOT registered: it is orthogonal to
 * tenant isolation and would otherwise throttle the many app.inject() calls
 * (all share 127.0.0.1) and cause false 429s. Per-route rateLimit configs are
 * simply ignored when the plugin is absent.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: 1048576, trustProxy: true });

  app.addHook('preHandler', securityHeaders);
  app.addHook('preHandler', detectMaliciousInput);
  app.addHook('preHandler', impersonationGuard);

  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(jwtPlugin);
  await app.register(adminJwtPlugin);

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
  await app.register(adminDataRoutes, { prefix: '/api/v1' });
  await app.register(onboardingRoutes, { prefix: '/api/v1' });
  await app.register(calendarRoutes);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.ready();
  return app;
}
