import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendError } from '../lib/errors.js';
import { allocateOrderNumber } from '../services/orderNumber.js';
import { sendTelegramMessage } from '../lib/telegram.js';
import { sendPushToAll } from '../lib/push.js';
import { getBotToken, hasBotToken } from '../lib/getBotToken.js';

function verifyBotSecret(request: FastifyRequest, reply: FastifyReply): boolean {
  const secret = request.headers['x-bot-secret'];
  if (!secret || secret !== process.env.BOT_MANAGER_SECRET) {
    sendError(reply, 401, 'Unauthorized');
    return false;
  }
  return true;
}

// All bot routes identify a business by its botUsername (the @handle, not the token)
async function findBusinessByUsername(botUsername: string, reply: FastifyReply) {
  const business = await prisma.business.findUnique({ where: { botUsername } });
  if (!business) {
    sendError(reply, 404, 'Business not found');
    return null;
  }
  return business;
}

const upsertCustomerBody = z.object({
  botUsername: z.string(),
  telegramUserId: z.string(),
  telegramUsername: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().optional(),
  languagePreference: z.enum(['UZBEK', 'RUSSIAN']).optional(),
});

const createBotOrderBody = z.object({
  botUsername: z.string(),
  customerId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().int().nonnegative(),
      variant: z.record(z.any()).optional(),
    }),
  ).min(1),
  deliveryMethod: z.enum(['PICKUP', 'DELIVERY']),
  deliveryAddress: z.string().optional(),
  deliveryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  customAnswers: z.record(z.string()).optional(),
});

const paymentReceivedBody = z.object({
  botUsername: z.string(),
  orderId: z.string(),
});

const confirmPaymentBody = z.object({
  botUsername: z.string(),
  orderId: z.string(),
});

export default async function botRoutes(app: FastifyInstance) {
  // GET /bot/checkout-questions/:botUsername
  app.get('/bot/checkout-questions/:botUsername', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botUsername } = request.params as { botUsername: string };
    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const questions = await prisma.checkoutQuestion.findMany({
      where: { businessId: business.id, deletedAt: null },
      orderBy: { order: 'asc' },
      select: { id: true, question: true, required: true, order: true },
    });
    return reply.send(questions);
  });

  // GET /bot/catalog/:botUsername
  app.get('/bot/catalog/:botUsername', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botUsername } = request.params as { botUsername: string };
    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const products = await prisma.product.findMany({
      where: { businessId: business.id, active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        photos: true,
        variants: true,
        prepTime: true,
        stockQty: true,
        unlimited: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return reply.send({
      business: { name: business.name, language: business.language, mode: business.mode },
      products,
    });
  });

  // POST /bot/customers
  app.post('/bot/customers', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = upsertCustomerBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botUsername, telegramUserId, telegramUsername, name, phone, languagePreference } = parsed.data;

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const customer = await prisma.customer.upsert({
      where: { businessId_telegramUserId: { businessId: business.id, telegramUserId } },
      create: {
        businessId: business.id,
        telegramUserId,
        telegramUsername,
        name,
        phone,
        languagePreference: languagePreference ?? business.language,
      },
      update: {
        telegramUsername,
        name,
        ...(phone ? { phone } : {}),
        lastInteractionAt: new Date(),
      },
    });
    return reply.send(customer);
  });

  // POST /bot/orders
  app.post('/bot/orders', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = createBotOrderBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botUsername, customerId, items, deliveryMethod, deliveryAddress, deliveryDate, notes, customAnswers } = parsed.data;

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, businessId: business.id, deletedAt: null },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, businessId: business.id, active: true, deletedAt: null },
    });
    if (products.length !== productIds.length) {
      return sendError(reply, 400, 'One or more products not found or unavailable');
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
        customAnswers: customAnswers ?? undefined,
        timeline: [{ status: 'NEW', at: new Date().toISOString(), by: 'bot' }],
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            variant: i.variant,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        customer: { select: { id: true, name: true, telegramUserId: true } },
      },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { lastInteractionAt: new Date() },
    });

    const firstItemName = order.items[0]?.product.name ?? 'items';
    sendPushToAll(
      business.id,
      `New order #${orderNumber}`,
      `${order.customer.name} ordered ${firstItemName}`,
      { type: 'order', orderId: order.id },
    ).catch((err: unknown) => console.error('[push] new order notify failed:', err));

    return reply.status(201).send({
      order,
      paymentInstructions: business.cardNumber
        ? {
            cardNumber: business.cardNumber,
            cardBank: business.cardBank,
            amount: total,
            orderNumber,
            reference: `#${orderNumber}`,
          }
        : null,
    });
  });

  // POST /bot/payment-received
  app.post('/bot/payment-received', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = paymentReceivedBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botUsername, orderId } = parsed.data;

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId: business.id, deletedAt: null },
      include: { customer: { select: { name: true } } },
    });
    if (!order) return sendError(reply, 404, 'Order not found');

    if (order.paymentStatus === 'CONFIRMED') {
      return sendError(reply, 409, 'Payment already confirmed');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAYMENT_RECEIVED',
        timeline: {
          push: { status: 'PAYMENT_RECEIVED', at: new Date().toISOString(), by: 'customer' },
        },
      },
    });

    sendPushToAll(
      business.id,
      'Payment notification',
      `${order.customer.name} says they paid for order #${order.orderNumber}`,
      { type: 'order', orderId: order.id },
    ).catch((err: unknown) => console.error('[push] payment-received notify failed:', err));

    return reply.send({
      order: { id: updated.id, orderNumber: updated.orderNumber, paymentStatus: updated.paymentStatus },
      notification: {
        ownerTelegramChatId: business.ownerTelegramChatId,
        message: `${order.customer.name} has paid for order #${order.orderNumber}. Total: ${order.total} UZS.`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        customerName: order.customer.name,
      },
    });
  });

  // POST /bot/set-owner-chat
  app.post('/bot/set-owner-chat', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botUsername: z.string(),
      ownerTelegramChatId: z.string(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const business = await findBusinessByUsername(parsed.data.botUsername, reply);
    if (!business) return;

    await prisma.business.update({
      where: { id: business.id },
      data: { ownerTelegramChatId: parsed.data.ownerTelegramChatId },
    });
    return reply.send({ ok: true });
  });

  // GET /bot/customer-orders/:botUsername/:telegramUserId
  app.get('/bot/customer-orders/:botUsername/:telegramUserId', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botUsername, telegramUserId } = request.params as { botUsername: string; telegramUserId: string };

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const customer = await prisma.customer.findFirst({
      where: { businessId: business.id, telegramUserId, deletedAt: null },
    });
    if (!customer) return reply.send([]);

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id, businessId: business.id, deletedAt: null },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        orderStatus: true,
        paymentStatus: true,
        deliveryMethod: true,
        createdAt: true,
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return reply.send(orders);
  });

  // GET /bot/services/:botUsername
  app.get('/bot/services/:botUsername', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botUsername } = request.params as { botUsername: string };
    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const services = await prisma.service.findMany({
      where: { businessId: business.id, active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        price: true,
        staffServices: {
          include: { staff: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send({
      business: {
        name: business.name,
        language: business.language,
        cardNumber: business.cardNumber,
        cardBank: business.cardBank,
      },
      services,
    });
  });

  // GET /bot/availability/:botUsername
  app.get('/bot/availability/:botUsername', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botUsername } = request.params as { botUsername: string };
    const query = request.query as Record<string, string>;

    if (!query.serviceId || !query.date) {
      return sendError(reply, 400, 'serviceId and date are required');
    }

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const service = await prisma.service.findFirst({
      where: { id: query.serviceId, businessId: business.id, active: true, deletedAt: null },
    });
    if (!service) return sendError(reply, 404, 'Service not found');

    let staff = null;
    if (query.staffId) {
      staff = await prisma.staff.findFirst({
        where: { id: query.staffId, businessId: business.id, deletedAt: null },
      });
      if (!staff) return sendError(reply, 404, 'Staff member not found');
    }

    const { computeAvailableSlots } = await import('../services/availability.js');
    const slots = await computeAvailableSlots({ business, service, staff, dateStr: query.date });
    return reply.send(slots);
  });

  // POST /bot/appointments
  app.post('/bot/appointments', async (request, reply) => {
    console.log('[bot/appointments] request received, body:', JSON.stringify(request.body));

    if (!verifyBotSecret(request, reply)) {
      console.log('[bot/appointments] rejected: invalid bot secret');
      return;
    }

    const parsed = z.object({
      botUsername: z.string(),
      customerId: z.string(),
      serviceId: z.string(),
      staffId: z.string().optional(),
      startTime: z.string().datetime(),
      notes: z.string().optional(),
      paymentType: z.enum(['AT_APPOINTMENT', 'IN_ADVANCE']).optional(),
    }).safeParse(request.body);
    if (!parsed.success) {
      console.log('[bot/appointments] validation error:', parsed.error.issues[0].message);
      return sendError(reply, 400, parsed.error.issues[0].message);
    }

    const { botUsername, customerId, serviceId, staffId, startTime, notes, paymentType } = parsed.data;
    console.log('[bot/appointments] looking up business for botUsername:', botUsername);

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) {
      console.log('[bot/appointments] business not found');
      return;
    }
    console.log('[bot/appointments] business found:', business.id);

    const [customer, service] = await Promise.all([
      prisma.customer.findFirst({ where: { id: customerId, businessId: business.id, deletedAt: null } }),
      prisma.service.findFirst({ where: { id: serviceId, businessId: business.id, active: true, deletedAt: null } }),
    ]);
    if (!customer) return sendError(reply, 404, 'Customer not found');
    if (!service) return sendError(reply, 404, 'Service not found');

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);

    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
        customerId,
        serviceId,
        staffId: staffId ?? null,
        startTime: start,
        endTime: end,
        price: service.price,
        notes: notes ?? null,
        paymentType: paymentType ?? 'AT_APPOINTMENT',
      },
      include: {
        customer: { select: { id: true, name: true, telegramUserId: true } },
        service: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { lastInteractionAt: new Date() },
    });

    const dateStr = start.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
    sendPushToAll(
      business.id,
      'New appointment',
      `${appointment.customer.name} booked ${appointment.service.name} on ${dateStr}`,
      { type: 'appointment', appointmentId: appointment.id },
    ).catch((err: unknown) => console.error('[push] new appointment notify failed:', err));

    console.log('[bot/appointments] done, sending 201');

    return reply.status(201).send({
      appointment,
      paymentInstructions:
        paymentType === 'IN_ADVANCE' && business.cardNumber
          ? { cardNumber: business.cardNumber, cardBank: business.cardBank, amount: service.price }
          : null,
      ownerTelegramChatId: business.ownerTelegramChatId,
    });
  });

  // POST /bot/cancel-appointment
  app.post('/bot/cancel-appointment', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botUsername: z.string(),
      appointmentId: z.string(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botUsername, appointmentId } = parsed.data;

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId: business.id, deletedAt: null },
      include: {
        customer: { select: { name: true, telegramUserId: true } },
        service: { select: { name: true } },
      },
    });
    if (!appointment) return sendError(reply, 404, 'Appointment not found');
    if (appointment.status === 'CANCELLED') return sendError(reply, 409, 'Already cancelled');

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    });

    sendPushToAll(
      business.id,
      'Appointment cancelled',
      `${appointment.customer.name} cancelled their ${appointment.service.name} appointment`,
      { type: 'appointment', appointmentId },
    ).catch((err: unknown) => console.error('[push] cancel-appointment notify failed:', err));

    return reply.send({
      appointment: { id: updated.id, status: updated.status },
      ownerTelegramChatId: business.ownerTelegramChatId,
      customerName: appointment.customer.name,
      serviceName: appointment.service.name,
      startTime: appointment.startTime,
    });
  });

  // GET /bot/customer-appointments/:botUsername/:telegramUserId
  app.get('/bot/customer-appointments/:botUsername/:telegramUserId', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botUsername, telegramUserId } = request.params as { botUsername: string; telegramUserId: string };

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const customer = await prisma.customer.findFirst({
      where: { businessId: business.id, telegramUserId, deletedAt: null },
    });
    if (!customer) return reply.send([]);

    const appointments = await prisma.appointment.findMany({
      where: {
        customerId: customer.id,
        businessId: business.id,
        startTime: { gte: new Date() },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        deletedAt: null,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        price: true,
        status: true,
        paymentStatus: true,
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
    });
    return reply.send(appointments);
  });

  // GET /bot/due-reminders
  app.get('/bot/due-reminders', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const query = request.query as Record<string, string>;
    if (!query.botUsername || !query.from || !query.to) {
      return sendError(reply, 400, 'botUsername, from, and to are required');
    }

    const business = await findBusinessByUsername(query.botUsername, reply);
    if (!business) return;

    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: business.id,
        startTime: { gte: new Date(query.from), lte: new Date(query.to) },
        status: { in: ['REQUESTED', 'CONFIRMED'] },
        reminderSent: false,
        deletedAt: null,
      },
      include: {
        customer: { select: { id: true, name: true, telegramUserId: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    });

    const result = appointments.map((a) => ({
      ...a,
      business: {
        name: business.name,
        ownerTelegramChatId: business.ownerTelegramChatId,
      },
    }));

    return reply.send(result);
  });

  // POST /bot/mark-reminder-sent
  app.post('/bot/mark-reminder-sent', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botUsername: z.string(),
      appointmentId: z.string(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const business = await findBusinessByUsername(parsed.data.botUsername, reply);
    if (!business) return;

    await prisma.appointment.update({
      where: { id: parsed.data.appointmentId },
      data: { reminderSent: true },
    });
    return reply.send({ ok: true });
  });

  // GET /bot/projects/:botUsername/:telegramUserId
  app.get('/bot/projects/:botUsername/:telegramUserId', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botUsername, telegramUserId } = request.params as { botUsername: string; telegramUserId: string };

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const customer = await prisma.customer.findFirst({
      where: { businessId: business.id, telegramUserId, deletedAt: null },
    });
    if (!customer) return reply.send([]);

    const projects = await prisma.project.findMany({
      where: {
        customerId: customer.id,
        businessId: business.id,
        deletedAt: null,
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        milestones: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, dueDate: true, amount: true, status: true },
        },
        invoices: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, invoiceNumber: true, total: true, dueDate: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return reply.send({ business: { name: business.name, language: business.language }, projects });
  });

  // POST /bot/milestone-review
  app.post('/bot/milestone-review', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botUsername: z.string(),
      milestoneId: z.string(),
      approved: z.boolean(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botUsername, milestoneId, approved } = parsed.data;

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, deletedAt: null, project: { businessId: business.id, deletedAt: null } },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            customer: { select: { name: true } },
          },
        },
      },
    });
    if (!milestone) return sendError(reply, 404, 'Milestone not found');

    if (milestone.status !== 'SUBMITTED_FOR_REVIEW') {
      return sendError(reply, 409, 'Milestone is not awaiting review');
    }

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: approved ? 'APPROVED' : 'PENDING' },
    });

    if (approved) {
      const customerName = milestone.project.customer.name;
      const amount = updated.amount.toLocaleString('uz-UZ').replace(/,/g, ' ');

      if (hasBotToken(business) && business.ownerTelegramChatId) {
        const text =
          `✅ <b>${customerName}</b> has approved '<b>${updated.name}</b>'.\n\n` +
          `Project: ${milestone.project.name}\n` +
          `Amount: ${amount} UZS\n\n` +
          `You can now mark payment as received in the app.`;
        sendTelegramMessage(getBotToken(business), business.ownerTelegramChatId, text).catch(
          (err: unknown) => console.error('[telegram] milestone approval notify failed:', err),
        );
      }

      sendPushToAll(
        business.id,
        'Milestone approved',
        `${customerName} approved ${updated.name} — ${amount} UZS`,
        { type: 'project', projectId: milestone.project.id },
      ).catch((err: unknown) => console.error('[push] milestone approval notify failed:', err));
    }

    return reply.send({
      milestone: { id: updated.id, name: updated.name, status: updated.status },
      ownerTelegramChatId: business.ownerTelegramChatId,
      projectName: milestone.project.name,
      approved,
    });
  });

  // POST /bot/accept-proposal
  app.post('/bot/accept-proposal', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botUsername: z.string(),
      projectId: z.string(),
      telegramUserId: z.string(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botUsername, projectId, telegramUserId } = parsed.data;

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const project = await prisma.project.findFirst({
      where: { id: projectId, businessId: business.id, deletedAt: null },
      include: { customer: { select: { name: true, telegramUserId: true } } },
    });
    if (!project) return sendError(reply, 404, 'Project not found');

    if (project.customer.telegramUserId !== telegramUserId) {
      return sendError(reply, 403, 'Forbidden');
    }
    if (project.status !== 'PROPOSAL_SENT') {
      return sendError(reply, 409, 'Proposal already accepted or project is not in proposal stage');
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { status: 'IN_PROGRESS' },
    });

    const customerName = project.customer.name;

    sendPushToAll(
      business.id,
      'Proposal accepted',
      `${customerName} accepted the ${project.name} proposal`,
      { type: 'project', projectId: project.id },
    ).catch((err: unknown) => console.error('[push] accept-proposal notify failed:', err));

    if (hasBotToken(business) && business.ownerTelegramChatId) {
      const text =
        `✅ <b>${customerName}</b> accepted the proposal for <b>${project.name}</b>.\n\n` +
        `The project is now in progress.`;
      sendTelegramMessage(getBotToken(business), business.ownerTelegramChatId, text).catch(
        (err: unknown) => console.error('[telegram] accept-proposal notify failed:', err),
      );
    }

    return reply.send({
      project: { id: updated.id, name: updated.name, status: updated.status },
    });
  });

  // POST /bot/message
  app.post('/bot/message', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botUsername: z.string(),
      telegramUserId: z.string(),
      text: z.string().min(1).max(4096),
      telegramMessageId: z.string().optional(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botUsername, telegramUserId, text } = parsed.data;

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const customer = await prisma.customer.findFirst({
      where: { businessId: business.id, telegramUserId, deletedAt: null },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastInteractionAt: new Date() },
    });

    if (hasBotToken(business) && business.ownerTelegramChatId) {
      sendTelegramMessage(
        getBotToken(business),
        business.ownerTelegramChatId,
        `💬 ${customer.name}: ${text}`,
      ).catch((err: unknown) => console.error('[telegram] message forward failed:', err));
    }

    return reply.send({ ok: true });
  });

  // POST /bot/confirm-payment
  app.post('/bot/confirm-payment', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = confirmPaymentBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botUsername, orderId } = parsed.data;

    const business = await findBusinessByUsername(botUsername, reply);
    if (!business) return;

    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId: business.id, deletedAt: null },
      include: { customer: { select: { telegramUserId: true, name: true } } },
    });
    if (!order) return sendError(reply, 404, 'Order not found');

    if (order.paymentStatus === 'CONFIRMED') {
      return sendError(reply, 409, 'Payment already confirmed');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'CONFIRMED',
        timeline: {
          push: { status: 'PAYMENT_CONFIRMED', at: new Date().toISOString(), by: 'owner_telegram' },
        },
      },
    });

    return reply.send({
      order: { id: updated.id, orderNumber: updated.orderNumber, paymentStatus: updated.paymentStatus },
      customerTelegramUserId: order.customer.telegramUserId,
      customerName: order.customer.name,
    });
  });
}
