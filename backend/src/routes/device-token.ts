import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';

export default async function deviceTokenRoutes(app: FastifyInstance) {
  app.post('/device-token', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const parsed = z.object({ token: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    await prisma.deviceToken.upsert({
      where: { businessId_token: { businessId: business.id, token: parsed.data.token } },
      create: { businessId: business.id, token: parsed.data.token },
      update: { updatedAt: new Date() },
    });

    return reply.status(204).send();
  });
}
