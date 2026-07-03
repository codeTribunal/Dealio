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

  // POST /proposals/:projectId/accept — client accepts proposal.
  //
  // The public page cannot verify Telegram identity (unlike the bot's
  // /bot/accept-proposal, which binds to customer.telegramUserId), so
  // possession of the single-use acceptance token issued with the share link
  // IS the authorization. Token mismatch, unknown id, wrong status, and
  // soft-deleted rows all return the SAME 404 — no oracle distinguishing
  // "wrong token" from "no such proposal". The token is nulled in the same
  // update that flips the status, so a captured link cannot be replayed.
  app.post(
    '/proposals/:projectId/accept',
    { config: { rateLimit: { max: 10, timeWindow: 3600000 } } },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };

      const parsed = z.object({ t: z.string().min(1) }).safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

      // Single atomic transition: WHERE carries the whole authorization
      // (token + status + not-deleted); count 0 means uniform 404.
      const accepted = await prisma.project.updateMany({
        where: {
          id: projectId,
          acceptToken: parsed.data.t,
          status: 'PROPOSAL_SENT',
          deletedAt: null,
        },
        data: { status: 'IN_PROGRESS', acceptToken: null },
      });
      if (accepted.count === 0) return sendError(reply, 404, 'Proposal not found');

      const project = await prisma.project.findFirst({
        where: { id: projectId },
        select: { id: true, name: true, status: true },
      });

      return reply.send({ project });
    },
  );

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
