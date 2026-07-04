import { randomBytes } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';
import { sendTelegramMessage } from '../lib/telegram.js';
import { escapeHtml } from '../lib/escapeHtml.js';
import { getBotToken, hasBotToken } from '../lib/getBotToken.js';

const createProjectBody = z.object({
  customerId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  totalPrice: z.number().int().nonnegative(),
  startDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  paymentTerms: z.string().max(500).optional(),
});

const updateProjectBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  totalPrice: z.number().int().nonnegative().optional(),
  startDate: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  paymentTerms: z.string().max(500).nullable().optional(),
  status: z.enum(['PROPOSAL_SENT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED']).optional(),
});

const createMilestoneBody = z.object({
  name: z.string().min(1).max(200),
  dueDate: z.string().datetime().optional(),
  amount: z.number().int().nonnegative(),
});

const updateMilestoneBody = z.object({
  name: z.string().min(1).max(200).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  amount: z.number().int().nonnegative().optional(),
  status: z.enum(['PENDING', 'SUBMITTED_FOR_REVIEW', 'APPROVED', 'PAYMENT_RECEIVED']).optional(),
});

const createInvoiceBody = z.object({
  lineItems: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.number().int().nonnegative(),
    }),
  ).min(1),
  dueDate: z.string().datetime().optional(),
});

export default async function projectRoutes(app: FastifyInstance) {
  // GET /projects
  app.get('/projects', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const query = request.query as Record<string, string>;

    const projects = await prisma.project.findMany({
      where: {
        businessId: business.id,
        deletedAt: null,
        ...(query.status ? { status: query.status as any } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        milestones: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, amount: true, status: true, dueDate: true },
        },
        invoices: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, invoiceNumber: true, total: true, status: true, dueDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(projects);
  });

  // POST /projects
  app.post('/projects', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const parsed = createProjectBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const customer = await prisma.customer.findFirst({
      where: { id: parsed.data.customerId, businessId: business.id, deletedAt: null },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    const { startDate, deadline, ...rest } = parsed.data;
    const project = await prisma.project.create({
      data: {
        ...rest,
        businessId: business.id,
        startDate: startDate ? new Date(startDate) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        milestones: { where: { deletedAt: null } },
        invoices: true,
      },
    });

    return reply.status(201).send(project);
  });

  // POST /projects/:id/proposal-link — issue the shareable proposal link's
  // single-use acceptance token. Generate-if-null so re-copying the link
  // reuses the outstanding token; once an accept consumes it (token nulled),
  // the next issue mints a fresh one. Owner-authenticated and business-bound.
  app.post('/projects/:id/proposal-link', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id } = request.params as { id: string };

    const project = await prisma.project.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
      select: { id: true, acceptToken: true },
    });
    if (!project) return sendError(reply, 404, 'Project not found');

    let token = project.acceptToken;
    if (!token) {
      token = randomBytes(24).toString('hex');
      await prisma.project.update({
        where: { id: project.id },
        data: { acceptToken: token },
      });
    }

    return reply.send({ token });
  });

  // GET /projects/:id
  app.get('/projects/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id } = request.params as { id: string };

    const project = await prisma.project.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, phone: true, telegramUsername: true } },
        milestones: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
        invoices: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) return sendError(reply, 404, 'Project not found');
    return reply.send(project);
  });

  // PATCH /projects/:id
  app.patch('/projects/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id } = request.params as { id: string };

    const project = await prisma.project.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!project) return sendError(reply, 404, 'Project not found');

    const parsed = updateProjectBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { startDate, deadline, ...rest } = parsed.data;
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        milestones: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        invoices: { orderBy: { createdAt: 'asc' } },
      },
    });

    return reply.send(updated);
  });

  // DELETE /projects/:id
  app.delete('/projects/:id', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id } = request.params as { id: string };

    const project = await prisma.project.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!project) return sendError(reply, 404, 'Project not found');

    await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
    return reply.status(204).send();
  });

  // ── Milestones ────────────────────────────────────────────────────

  // POST /projects/:id/milestones
  app.post('/projects/:id/milestones', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id: projectId } = request.params as { id: string };

    const project = await prisma.project.findFirst({
      where: { id: projectId, businessId: business.id, deletedAt: null },
    });
    if (!project) return sendError(reply, 404, 'Project not found');

    const parsed = createMilestoneBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { dueDate, ...rest } = parsed.data;
    const milestone = await prisma.milestone.create({
      data: {
        ...rest,
        projectId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
    });

    return reply.status(201).send(milestone);
  });

  // PATCH /projects/:id/milestones/:milestoneId
  app.patch(
    '/projects/:id/milestones/:milestoneId',
    { preHandler: authenticate },
    async (request, reply) => {
      const business = await getBusinessOrFail(request, reply);
      if (!business) return;

      const { id: projectId, milestoneId } = request.params as {
        id: string;
        milestoneId: string;
      };

      const project = await prisma.project.findFirst({
        where: { id: projectId, businessId: business.id, deletedAt: null },
      });
      if (!project) return sendError(reply, 404, 'Project not found');

      const milestone = await prisma.milestone.findFirst({
        where: { id: milestoneId, projectId, deletedAt: null },
      });
      if (!milestone) return sendError(reply, 404, 'Milestone not found');

      const parsed = updateMilestoneBody.safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

      const { dueDate, ...rest } = parsed.data;
      const updated = await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          ...rest,
          ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        },
      });

      // Notify the client via Telegram when the owner submits a milestone for review
      if (parsed.data.status === 'SUBMITTED_FOR_REVIEW' && hasBotToken(business)) {
        const customer = await prisma.customer.findFirst({
          where: { id: project.customerId, businessId: business.id, deletedAt: null },
          select: { telegramUserId: true },
        });

        if (customer?.telegramUserId) {
          const amount = updated.amount.toLocaleString('uz-UZ').replace(/,/g, ' ');
          const text =
            `<b>${escapeHtml(business.name)}</b> has submitted '<b>${escapeHtml(updated.name)}</b>' for your review.\n\n` +
            `Project: ${escapeHtml(project.name)}\n` +
            `Amount: ${amount} UZS\n\n` +
            `Reply /projects to view and approve.`;

          sendTelegramMessage(getBotToken(business), customer.telegramUserId, text).catch(
            (err: unknown) => console.error('[telegram] milestone review notify failed:', err),
          );
        }
      }

      return reply.send(updated);
    },
  );

  // DELETE /projects/:id/milestones/:milestoneId
  app.delete(
    '/projects/:id/milestones/:milestoneId',
    { preHandler: authenticate },
    async (request, reply) => {
      const business = await getBusinessOrFail(request, reply);
      if (!business) return;

      const { id: projectId, milestoneId } = request.params as {
        id: string;
        milestoneId: string;
      };

      const project = await prisma.project.findFirst({
        where: { id: projectId, businessId: business.id, deletedAt: null },
      });
      if (!project) return sendError(reply, 404, 'Project not found');

      const milestone = await prisma.milestone.findFirst({
        where: { id: milestoneId, projectId, deletedAt: null },
      });
      if (!milestone) return sendError(reply, 404, 'Milestone not found');

      await prisma.milestone.update({
        where: { id: milestoneId },
        data: { deletedAt: new Date() },
      });

      return reply.status(204).send();
    },
  );

  // ── Invoices ──────────────────────────────────────────────────────

  // POST /projects/:id/invoices
  app.post('/projects/:id/invoices', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const { id: projectId } = request.params as { id: string };

    const project = await prisma.project.findFirst({
      where: { id: projectId, businessId: business.id, deletedAt: null },
    });
    if (!project) return sendError(reply, 404, 'Project not found');

    const parsed = createInvoiceBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    // Count existing invoices to generate sequential invoice number
    const invoiceCount = await prisma.invoice.count({ where: { projectId } });
    const invoiceNumber = `INV-${business.id.slice(-6).toUpperCase()}-${String(invoiceCount + 1).padStart(3, '0')}`;

    const total = parsed.data.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const { dueDate, lineItems } = parsed.data;
    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        invoiceNumber,
        lineItems: lineItems as any[],
        total,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
    });

    return reply.status(201).send(invoice);
  });

  // PATCH /projects/:id/invoices/:invoiceId/paid
  app.patch(
    '/projects/:id/invoices/:invoiceId/paid',
    { preHandler: authenticate },
    async (request, reply) => {
      const business = await getBusinessOrFail(request, reply);
      if (!business) return;

      const { id: projectId, invoiceId } = request.params as {
        id: string;
        invoiceId: string;
      };

      const project = await prisma.project.findFirst({
        where: { id: projectId, businessId: business.id, deletedAt: null },
      });
      if (!project) return sendError(reply, 404, 'Project not found');

      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, projectId },
      });
      if (!invoice) return sendError(reply, 404, 'Invoice not found');

      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID' },
      });

      return reply.send(updated);
    },
  );
}
