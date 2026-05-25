import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';

const createProductBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().int().positive(),
  photos: z.array(z.string().url()).default([]),
  stockQty: z.number().int().nonnegative().optional(),
  unlimited: z.boolean().default(false),
  variants: z.record(z.any()).optional(),
  prepTime: z.string().max(100).optional(),
});

const updateProductBody = createProductBody.partial();

export default async function productRoutes(app: FastifyInstance) {
  app.get('/products', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const products = await prisma.product.findMany({
      where: { businessId: business.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(products);
  });

  app.post('/products', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = createProductBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const product = await prisma.product.create({
      data: { ...parsed.data, businessId: business.id },
    });
    return reply.status(201).send(product);
  });

  app.get('/products/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const product = await prisma.product.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!product) return sendError(reply, 404, 'Product not found');
    return reply.send(product);
  });

  app.patch('/products/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.product.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Product not found');

    const parsed = updateProductBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const updated = await prisma.product.update({ where: { id }, data: parsed.data });
    return reply.send(updated);
  });

  app.delete('/products/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.product.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Product not found');

    await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
    return reply.status(204).send();
  });

  app.patch('/products/:id/toggle', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { id } = request.params as { id: string };
    const existing = await prisma.product.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!existing) return sendError(reply, 404, 'Product not found');

    const updated = await prisma.product.update({
      where: { id },
      data: { active: !existing.active },
    });
    return reply.send({ id: updated.id, active: updated.active });
  });
}
