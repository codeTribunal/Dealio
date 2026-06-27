import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';

const patchReminderBody = z.object({
  done: z.boolean(),
});

export default async function reminderRoutes(app: FastifyInstance) {
  // List all pending reminders for the business
  app.get('/reminders', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const query = request.query as Record<string, string>;
    const showDone = query.done === 'true';

    const reminders = await prisma.reminder.findMany({
      where: {
        businessId: business.id,
        ...(showDone ? {} : { done: false }),
      },
      include: {
        customer: { select: { id: true, name: true, telegramUsername: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
    return reply.send(reminders);
  });

  // Mark reminder done / not done
  app.patch('/reminders/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const reminder = await prisma.reminder.findFirst({
      where: { id, businessId: business.id },
    });
    if (!reminder) return sendError(reply, 404, 'Reminder not found');

    const parsed = patchReminderBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const updated = await prisma.reminder.update({
      where: { id },
      data: { done: parsed.data.done },
    });
    return reply.send(updated);
  });
}
