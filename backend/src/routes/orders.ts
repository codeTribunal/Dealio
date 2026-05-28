import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';
import { allocateOrderNumber } from '../services/orderNumber.js';
import { checkOrderLimit } from '../middleware/checkLimits.js';

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  variant: z.record(z.any()).optional(),
});

const createOrderBody = z.object({
  customerId: z.string(),
  items: z.array(orderItemSchema).min(1),
  deliveryMethod: z.enum(['PICKUP', 'DELIVERY']),
  deliveryAddress: z.string().optional(),
  deliveryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

const updateStatusBody = z.object({
  status: z.enum(['NEW', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']),
  note: z.string().optional(),
});

const orderInclude = {
  customer: { select: { id: true, name: true, phone: true, telegramUsername: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, photos: true } },
    },
  },
} as const;

export default async function orderRoutes(app: FastifyInstance) {
  app.get('/orders', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const query = request.query as Record<string, string>;
    const where: Record<string, unknown> = { businessId: business.id, deletedAt: null };

    if (query.status) {
      if (query.status === 'PAYMENT_PENDING') {
        where.paymentStatus = 'PENDING';
      } else {
        where.orderStatus = query.status;
      }
    }
    if (query.customerId) where.customerId = query.customerId;
    if (query.date) {
      const day = new Date(query.date);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      where.createdAt = { gte: day, lt: next };
    }
    if (query.search) {
      const searchNum = parseInt(query.search, 10);
      const orConditions: unknown[] = [
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
      if (!isNaN(searchNum)) {
        orConditions.push({ orderNumber: searchNum });
      }
      where.OR = orConditions;
    }

    const orders = await prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(orders);
  });

  app.post('/orders', { preHandler: [authenticate, checkOrderLimit()] }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = createOrderBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { customerId, items, deliveryMethod, deliveryAddress, deliveryDate, notes, internalNotes } = parsed.data;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: business.id, deletedAt: null },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, businessId: business.id, deletedAt: null },
    });
    if (products.length !== productIds.length) {
      return sendError(reply, 400, 'One or more products not found');
    }

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const orderNumber = await allocateOrderNumber(business.id);

    const order = await prisma.order.create({
      data: {
        businessId: business.id,
        customerId,
        orderNumber,
        total,
        deliveryMethod,
        deliveryAddress,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        notes,
        internalNotes,
        timeline: [{ status: 'NEW', at: new Date().toISOString(), by: 'owner' }],
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            variant: i.variant,
          })),
        },
      },
      include: orderInclude,
    });
    return reply.status(201).send(order);
  });

  app.get('/orders/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const order = await prisma.order.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
      include: orderInclude,
    });
    if (!order) return sendError(reply, 404, 'Order not found');
    return reply.send(order);
  });

  app.patch('/orders/:id/status', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.order.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Order not found');

    const parsed = updateStatusBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const timelineEntry = {
      status: parsed.data.status,
      at: new Date().toISOString(),
      by: 'owner',
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
    };

    const updated = await prisma.order.update({
      where: { id },
      data: {
        orderStatus: parsed.data.status,
        timeline: { push: timelineEntry },
      },
      include: orderInclude,
    });
    return reply.send(updated);
  });

  app.patch('/orders/:id/payment', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.order.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Order not found');

    if (existing.paymentStatus === 'CONFIRMED') {
      return sendError(reply, 409, 'Payment already confirmed');
    }

    const timelineEntry = {
      status: 'PAYMENT_CONFIRMED',
      at: new Date().toISOString(),
      by: 'owner',
    };

    const updated = await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: 'CONFIRMED',
        timeline: { push: timelineEntry },
      },
      include: orderInclude,
    });
    return reply.send(updated);
  });
}
