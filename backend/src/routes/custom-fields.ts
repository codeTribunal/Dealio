import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';

const createFieldBody = z.object({
  name: z.string().min(1).max(100),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'YESNO']).default('TEXT'),
  order: z.number().int().min(0).default(0),
});

const setFieldValuesBody = z.object({
  values: z.record(z.string().max(1000)),
});

export default async function customFieldRoutes(app: FastifyInstance) {
  // ── List field definitions for this business ───────────────────
  app.get('/custom-fields', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const fields = await prisma.businessCustomField.findMany({
      where: { businessId: business.id, deletedAt: null },
      orderBy: { order: 'asc' },
    });
    return reply.send(fields);
  });

  // ── Create a new field definition ─────────────────────────────
  app.post('/custom-fields', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const parsed = createFieldBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const field = await prisma.businessCustomField.create({
      data: {
        businessId: business.id,
        name: parsed.data.name,
        fieldType: parsed.data.fieldType,
        order: parsed.data.order,
      },
    });
    return reply.status(201).send(field);
  });

  // ── Delete a field definition (soft delete) ────────────────────
  app.delete('/custom-fields/:fieldId', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { fieldId } = request.params as { fieldId: string };
    const field = await prisma.businessCustomField.findFirst({
      where: { id: fieldId, businessId: business.id, deletedAt: null },
    });
    if (!field) return sendError(reply, 404, 'Field not found');

    await prisma.businessCustomField.update({
      where: { id: fieldId },
      data: { deletedAt: new Date() },
    });
    return reply.status(204).send();
  });

  // ── Set field values for a customer ───────────────────────────
  app.patch('/customers/:customerId/fields', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const { customerId } = request.params as { customerId: string };
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: business.id, deletedAt: null },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    const parsed = setFieldValuesBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    // Verify all fields belong to this business
    const fieldIds = Object.keys(parsed.data.values);
    if (fieldIds.length > 0) {
      const fields = await prisma.businessCustomField.findMany({
        where: { id: { in: fieldIds }, businessId: business.id, deletedAt: null },
      });
      if (fields.length !== fieldIds.length) {
        return sendError(reply, 400, 'One or more field IDs are invalid');
      }
    }

    // Upsert each value
    await Promise.all(
      Object.entries(parsed.data.values).map(([fieldId, value]) =>
        prisma.customerFieldValue.upsert({
          where: { customerId_fieldId: { customerId, fieldId } },
          create: { customerId, fieldId, value },
          update: { value },
        }),
      ),
    );

    const updated = await prisma.customerFieldValue.findMany({
      where: { customerId },
      include: { field: true },
    });
    return reply.send(updated);
  });
}
