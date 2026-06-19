import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendError } from '../lib/errors.js';

export default async function proposalRoutes(app: FastifyInstance) {
  // GET /proposals/:projectId — public, no auth required
  app.get('/proposals/:projectId', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        business: {
          select: { name: true, description: true, language: true },
        },
        customer: {
          select: { name: true },
        },
        milestones: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, dueDate: true, amount: true, status: true },
        },
      },
    });

    if (!project) return sendError(reply, 404, 'Proposal not found');

    return reply.send({
      id: project.id,
      name: project.name,
      description: project.description,
      totalPrice: project.totalPrice,
      startDate: project.startDate,
      deadline: project.deadline,
      paymentTerms: project.paymentTerms ?? null,
      status: project.status,
      business: project.business,
      client: project.customer,
      milestones: project.milestones,
      createdAt: project.createdAt,
    });
  });

  // POST /proposals/:projectId/accept — client accepts proposal
  app.post('/proposals/:projectId/accept', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    const parsed = z
      .object({ clientName: z.string().min(1).optional() })
      .safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) return sendError(reply, 404, 'Proposal not found');

    if (project.status !== 'PROPOSAL_SENT') {
      return sendError(reply, 409, 'Proposal is no longer pending acceptance');
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { status: 'IN_PROGRESS' },
      include: {
        business: { select: { name: true, ownerTelegramChatId: true } },
        customer: { select: { id: true, name: true, telegramUserId: true } },
      },
    });

    return reply.send({
      project: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
      },
      ownerTelegramChatId: updated.business.ownerTelegramChatId,
      customerName: updated.customer.name,
    });
  });

  // GET /invoices/:invoiceId — public, no auth required
  app.get('/invoices/:invoiceId', async (request, reply) => {
    const { invoiceId } = request.params as { invoiceId: string };

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId },
      include: {
        project: {
          include: {
            business: { select: { name: true } },
            customer: { select: { name: true } },
          },
        },
      },
    });

    if (!invoice) return sendError(reply, 404, 'Invoice not found');

    return reply.send({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      lineItems: invoice.lineItems,
      total: invoice.total,
      dueDate: invoice.dueDate,
      status: invoice.status,
      createdAt: invoice.createdAt,
      project: {
        id: invoice.project.id,
        name: invoice.project.name,
      },
      business: invoice.project.business,
      client: invoice.project.customer,
    });
  });
}
