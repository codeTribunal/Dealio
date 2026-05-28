import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';
import { getBotToken, hasBotToken } from '../lib/getBotToken.js';

const createCustomerBody = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(50).optional(),
  telegramUsername: z.string().max(100).optional(),
});

const updateNotesBody = z.object({
  notes: z.string().max(2000),
});

const updateCustomerBody = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).optional().nullable(),
  birthday: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  customFields: z.record(z.string()).optional().nullable(),
});

const addTagBody = z.object({
  label: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366F1'),
});

const addReminderBody = z.object({
  note: z.string().min(1).max(500),
  dueDate: z.string().datetime(),
});

const sendMessageBody = z.object({
  text: z.string().min(1).max(4096),
});

const customerInclude = {
  tags: true,
  reminders: {
    where: { done: false },
    orderBy: { dueDate: 'asc' as const },
  },
} as const;

export default async function customerRoutes(app: FastifyInstance) {
  // ── List customers ──────────────────────────────────────────────
  app.get('/customers', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { search, page: pageParam, limit: limitParam } = request.query as {
      search?: string;
      page?: string;
      limit?: string;
    };
    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? '30', 10) || 30));

    const where = {
      businessId: business.id,
      deletedAt: null,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { telegramUsername: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        select: {
          id: true,
          name: true,
          telegramUsername: true,
          phone: true,
          createdAt: true,
          lastInteractionAt: true,
          _count: {
            select: { orders: true },
          },
          orders: {
            where: {
              deletedAt: null,
              paymentStatus: 'CONFIRMED',
            },
            select: { total: true },
          },
        },
        orderBy: { lastInteractionAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.customer.count({ where }),
    ]);

    const mapped = customers.map(c => ({
      id: c.id,
      name: c.name,
      telegramUsername: c.telegramUsername,
      phone: c.phone,
      createdAt: c.createdAt,
      lastInteractionAt: c.lastInteractionAt,
      totalOrders: c._count.orders,
      totalSpent: c.orders.reduce((sum, o) => sum + o.total, 0),
    }));

    return reply.send({ customers: mapped, total });
  });

  // ── Create customer ─────────────────────────────────────────────
  app.post('/customers', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = createCustomerBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const customer = await prisma.customer.create({
      data: { ...parsed.data, businessId: business.id },
    });
    return reply.status(201).send(customer);
  });

  // ── Customer detail ─────────────────────────────────────────────
  app.get('/customers/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const params = request.params as { id: string };

    try {
      const customer = await prisma.customer.findFirst({
        where: { id: params.id, businessId: business.id },
        select: {
          id: true, businessId: true, telegramUserId: true,
          telegramUsername: true, name: true, phone: true,
          birthday: true, notes: true, currentStageId: true,
          languagePreference: true, createdAt: true,
          lastInteractionAt: true,
        },
      });

      if (!customer) return sendError(reply, 404, 'Customer not found');
      console.log('[customer] found:', customer.id);

      console.log('[customer] starting parallel queries');
      const queryPromise = Promise.all([
        prisma.order.findMany({ where: { customerId: customer.id, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, orderNumber: true, total: true, orderStatus: true, paymentStatus: true, createdAt: true, items: { select: { quantity: true, price: true, product: { select: { name: true } } } } } }),
        prisma.appointment.findMany({ where: { customerId: customer.id }, orderBy: { startTime: 'desc' }, take: 20, select: { id: true, startTime: true, endTime: true, status: true, price: true, service: { select: { name: true } } } }),
        prisma.project.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, name: true, totalPrice: true, status: true, deadline: true, createdAt: true } }),
        prisma.customerFieldValue.findMany({ where: { customerId: customer.id }, include: { field: { select: { id: true, name: true, fieldType: true } } } }),
        prisma.customerTag.findMany({ where: { customerId: customer.id } }),
        prisma.reminder.findMany({ where: { customerId: customer.id, done: false }, orderBy: { dueDate: 'asc' }, take: 10 }),
      ]);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('QUERY_TIMEOUT')), 15000)
      );

      const [orders, appointments, projects, customFieldValues, tags, reminders] =
        await Promise.race([queryPromise, timeoutPromise]) as any;
      console.log('[customer] parallel queries done');

      const totalSpent = orders
        .filter((o: { paymentStatus: string }) => o.paymentStatus === 'CONFIRMED')
        .reduce((sum: number, o: { total: number }) => sum + o.total, 0);
      const totalOrders = orders.length;

      console.log('[customer] sending response');
      return reply.send({
        ...customer,
        totalOrders,
        totalSpent,
        orders,
        appointments,
        projects,
        customFieldValues,
        tags,
        reminders,
      });
    } catch (error) {
      console.error('[customer] error:', error);
      if ((error as Error).message === 'QUERY_TIMEOUT') {
        return reply.status(504).send({ error: 'Request timed out. Please try again.' });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // ── Update customer profile ─────────────────────────────────────
  app.patch('/customers/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.customer.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Customer not found');

    const parsed = updateCustomerBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
    if (parsed.data.birthday !== undefined)
      data.birthday = parsed.data.birthday ? new Date(parsed.data.birthday) : null;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.customFields !== undefined) data.customFields = parsed.data.customFields;

    const updated = await prisma.customer.update({
      where: { id },
      data,
      include: customerInclude,
    });
    return reply.send(updated);
  });

  // ── Legacy notes endpoint (kept for backwards compat) ──────────
  app.patch('/customers/:id/notes', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.customer.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Customer not found');

    const parsed = updateNotesBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const updated = await prisma.customer.update({
      where: { id },
      data: { notes: parsed.data.notes },
      select: { id: true, notes: true },
    });
    return reply.send(updated);
  });

  // ── Add tag ────────────────────────────────────────────────────
  app.post('/customers/:id/tags', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const customer = await prisma.customer.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    const parsed = addTagBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const tag = await prisma.customerTag.create({
      data: {
        customerId: id,
        businessId: business.id,
        label: parsed.data.label,
        color: parsed.data.color,
      },
    });
    return reply.status(201).send(tag);
  });

  // ── Remove tag ─────────────────────────────────────────────────
  app.delete('/customers/:id/tags/:tagId', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id, tagId } = request.params as { id: string; tagId: string };
    const tag = await prisma.customerTag.findFirst({
      where: { id: tagId, customerId: id, businessId: business.id },
    });
    if (!tag) return sendError(reply, 404, 'Tag not found');

    await prisma.customerTag.delete({ where: { id: tagId } });
    return reply.status(204).send();
  });

  // ── Add reminder ───────────────────────────────────────────────
  app.post('/customers/:id/reminders', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const customer = await prisma.customer.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    const parsed = addReminderBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const reminder = await prisma.reminder.create({
      data: {
        customerId: id,
        businessId: business.id,
        note: parsed.data.note,
        dueDate: new Date(parsed.data.dueDate),
      },
    });
    return reply.status(201).send(reminder);
  });

  // ── Send Telegram message ──────────────────────────────────────
  app.post('/customers/:id/message', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const customer = await prisma.customer.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');
    if (!customer.telegramUserId) {
      return sendError(reply, 400, 'Customer has no Telegram account');
    }
    if (!hasBotToken(business)) {
      return sendError(reply, 400, 'Bot not configured for this business');
    }

    const parsed = sendMessageBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const token = getBotToken(business);

    // Send via Telegram Bot API
    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: customer.telegramUserId,
          text: parsed.data.text,
        }),
      },
    );
    const tgData = await tgRes.json() as { ok: boolean; description?: string };
    if (!tgData.ok) {
      return sendError(reply, 502, `Telegram error: ${tgData.description ?? 'unknown'}`);
    }

    await prisma.customer.update({
      where: { id },
      data: { lastInteractionAt: new Date() },
    });

    return reply.send({ ok: true });
  });
}
