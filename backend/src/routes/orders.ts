import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, prismaUnscoped } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { getBotToken, hasBotToken } from '../lib/getBotToken.js';
import { sendError } from '../lib/errors.js';
import { allocateOrderNumber } from '../services/orderNumber.js';
import { checkOrderLimit } from '../middleware/checkLimits.js';
import { softDelete, restore } from '../services/softDelete.js';

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
  customer: { select: { id: true, name: true, phone: true, telegramUsername: true, deletedAt: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, photos: true } },
    },
  },
} as const;

export default async function orderRoutes(app: FastifyInstance) {
  app.get('/orders', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const query = request.query as Record<string, string>;
    const includeDeleted = query.includeDeleted === 'true';
    const db = includeDeleted ? (prismaUnscoped as unknown as typeof prisma) : prisma;
    const where: Record<string, unknown> = { businessId: business.id };
    // Orphan filter ("leave & filter"): in the default view, hide orders whose
    // customer is soft-deleted (the order's own deletedAt is hidden by the
    // extension). "Show deleted" drops both filters via prismaUnscoped.
    if (!includeDeleted) where.customer = { deletedAt: null };

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

    const orders = await db.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(
      orders.map(({ paymentProofFileId, ...o }) => ({
        ...o,
        deleted: o.deletedAt != null,
        // Boolean only — the raw Telegram file_id is never exposed; the image is
        // fetched via the authenticated GET /orders/:id/payment-proof proxy.
        hasPaymentProof: paymentProofFileId != null,
      })),
    );
  });

  app.post('/orders', { preHandler: [authenticate, checkOrderLimit()] }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
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
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const order = await prisma.order.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
      include: orderInclude,
    });
    if (!order) return sendError(reply, 404, 'Order not found');
    // Strip the raw file_id; surface only the boolean (image via the proxy below).
    const { paymentProofFileId, ...rest } = order;
    return reply.send({ ...rest, hasPaymentProof: paymentProofFileId != null });
  });

  // GET /orders/:id/payment-proof — stream the customer's payment screenshot.
  // The proof is a Telegram file_id (stored by /bot/payment-received); we resolve
  // it on demand with THIS business's own bot token (getFile URLs are ~1h and
  // regenerated each view) and stream the bytes so the token never leaves the
  // server. Tenant-scoped via getBusinessOrFail. 404 = no order/no proof;
  // 502 = getFile/download failed (file_id is permanent, so a retry works).
  app.get('/orders/:id/payment-proof', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const order = await prisma.order.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
      select: { paymentProofFileId: true },
    });
    if (!order) return sendError(reply, 404, 'Order not found');
    if (!order.paymentProofFileId) return sendError(reply, 404, 'No payment proof');
    if (!hasBotToken(business)) return sendError(reply, 502, 'Bot not configured');

    const token = getBotToken(business);
    try {
      const gfRes = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(order.paymentProofFileId)}`,
      );
      const gf = (await gfRes.json()) as { ok: boolean; result?: { file_path?: string } };
      if (!gfRes.ok || !gf.ok || !gf.result?.file_path) {
        throw new Error('getFile failed');
      }
      const fileRes = await fetch(
        `https://api.telegram.org/file/bot${token}/${gf.result.file_path}`,
      );
      if (!fileRes.ok) throw new Error(`file download ${fileRes.status}`);
      const bytes = Buffer.from(await fileRes.arrayBuffer());
      reply.header('Content-Type', fileRes.headers.get('content-type') ?? 'image/jpeg');
      reply.header('Cache-Control', 'private, max-age=60');
      return reply.send(bytes);
    } catch (e) {
      console.error('[orders/payment-proof] getFile/download failed:', e);
      return sendError(reply, 502, 'Payment proof unavailable');
    }
  });

  app.patch('/orders/:id/status', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
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
    const business = await getBusinessOrFail(request, reply);
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

  // ── Soft-delete order (recoverable) ─────────────────────────────
  app.delete('/orders/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const { deleted } = await softDelete('order', id, business.id);
    if (!deleted) return sendError(reply, 404, 'Order not found');
    return reply.send({ id, deleted: true });
  });

  // ── Restore a soft-deleted order ────────────────────────────────
  app.post('/orders/:id/restore', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const { restored } = await restore('order', id, business.id);
    if (!restored) return sendError(reply, 404, 'Order not found');
    return reply.send({ id, restored: true });
  });
}
