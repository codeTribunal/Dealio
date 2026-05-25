import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendError } from '../lib/errors.js';
import { allocateOrderNumber } from '../services/orderNumber.js';
import { sendTelegramMessage } from '../lib/telegram.js';
import { sendPushToAll } from '../lib/push.js';

function verifyBotSecret(request: FastifyRequest, reply: FastifyReply): boolean {
  const secret = request.headers['x-bot-secret'];
  if (!secret || secret !== process.env.BOT_MANAGER_SECRET) {
    sendError(reply, 401, 'Unauthorized');
    return false;
  }
  return true;
}

const upsertCustomerBody = z.object({
  botToken: z.string(),
  telegramUserId: z.string(),
  telegramUsername: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().optional(),
  languagePreference: z.enum(['UZBEK', 'RUSSIAN']).optional(),
});

const createBotOrderBody = z.object({
  botToken: z.string(),
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
  botToken: z.string(),
  orderId: z.string(),
});

const confirmPaymentBody = z.object({
  botToken: z.string(),
  orderId: z.string(),
});

export default async function botRoutes(app: FastifyInstance) {
  // GET /bot/checkout-questions/:botToken — get active questions for checkout flow
  app.get('/bot/checkout-questions/:botToken', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botToken } = request.params as { botToken: string };
    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

    const questions = await prisma.checkoutQuestion.findMany({
      where: { businessId: business.id, deletedAt: null },
      orderBy: { order: 'asc' },
      select: { id: true, question: true, required: true, order: true },
    });
    return reply.send(questions);
  });

  // GET /bot/catalog/:botToken — public, called by bot to show products
  app.get('/bot/catalog/:botToken', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botToken } = request.params as { botToken: string };
    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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
    return reply.send({ business: { name: business.name, language: business.language, mode: business.mode }, products });
  });

  // POST /bot/customers — upsert customer by Telegram user ID
  app.post('/bot/customers', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = upsertCustomerBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, telegramUserId, telegramUsername, name, phone, languagePreference } = parsed.data;

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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

  // POST /bot/orders — create order from bot checkout
  app.post('/bot/orders', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = createBotOrderBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, customerId, items, deliveryMethod, deliveryAddress, deliveryDate, notes, customAnswers } = parsed.data;

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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

    // Update lastInteractionAt
    await prisma.customer.update({
      where: { id: customerId },
      data: { lastInteractionAt: new Date() },
    });

    // Notify business owner
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

  // POST /bot/payment-received — customer tapped "I have paid"
  app.post('/bot/payment-received', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = paymentReceivedBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, orderId } = parsed.data;

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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

    // Notify business owner via push
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

  // POST /bot/set-owner-chat — link the owner's Telegram chat ID to their business
  app.post('/bot/set-owner-chat', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botToken: z.string(),
      ownerTelegramChatId: z.string(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const business = await prisma.business.findUnique({ where: { botToken: parsed.data.botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

    await prisma.business.update({
      where: { id: business.id },
      data: { ownerTelegramChatId: parsed.data.ownerTelegramChatId },
    });
    return reply.send({ ok: true });
  });

  // GET /bot/customer-orders/:botToken/:telegramUserId — list a customer's orders
  app.get('/bot/customer-orders/:botToken/:telegramUserId', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botToken, telegramUserId } = request.params as { botToken: string; telegramUserId: string };

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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

  // GET /bot/services/:botToken — list active services for booking
  app.get('/bot/services/:botToken', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botToken } = request.params as { botToken: string };
    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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
      business: { name: business.name, language: business.language, cardNumber: business.cardNumber, cardBank: business.cardBank },
      services,
    });
  });

  // GET /bot/availability/:botToken — get available slots
  app.get('/bot/availability/:botToken', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botToken } = request.params as { botToken: string };
    const query = request.query as Record<string, string>;

    if (!query.serviceId || !query.date) {
      return sendError(reply, 400, 'serviceId and date are required');
    }

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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

  // POST /bot/appointments — create appointment from bot
  app.post('/bot/appointments', async (request, reply) => {
    console.log('[bot/appointments] request received, body:', JSON.stringify(request.body));

    if (!verifyBotSecret(request, reply)) {
      console.log('[bot/appointments] rejected: invalid bot secret');
      return;
    }

    const parsed = z.object({
      botToken: z.string(),
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

    const { botToken, customerId, serviceId, staffId, startTime, notes, paymentType } = parsed.data;
    console.log('[bot/appointments] looking up business for botToken:', botToken.slice(0, 8) + '...');

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) {
      console.log('[bot/appointments] business not found');
      return sendError(reply, 404, 'Business not found');
    }
    console.log('[bot/appointments] business found:', business.id, '— fetching customer and service');

    const [customer, service] = await Promise.all([
      prisma.customer.findFirst({ where: { id: customerId, businessId: business.id, deletedAt: null } }),
      prisma.service.findFirst({ where: { id: serviceId, businessId: business.id, active: true, deletedAt: null } }),
    ]);
    if (!customer) {
      console.log('[bot/appointments] customer not found:', customerId);
      return sendError(reply, 404, 'Customer not found');
    }
    if (!service) {
      console.log('[bot/appointments] service not found:', serviceId);
      return sendError(reply, 404, 'Service not found');
    }
    console.log('[bot/appointments] customer:', customer.id, 'service:', service.id, '— creating appointment');

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
    console.log('[bot/appointments] appointment created:', appointment.id, '— updating customer lastInteractionAt');

    await prisma.customer.update({
      where: { id: customerId },
      data: { lastInteractionAt: new Date() },
    });

    // Notify business owner
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
          ? {
              cardNumber: business.cardNumber,
              cardBank: business.cardBank,
              amount: service.price,
            }
          : null,
      ownerTelegramChatId: business.ownerTelegramChatId,
    });
  });

  // POST /bot/cancel-appointment — customer replied CANCEL to reminder
  app.post('/bot/cancel-appointment', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botToken: z.string(),
      appointmentId: z.string(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, appointmentId } = parsed.data;

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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

    // Notify business owner
    sendPushToAll(
      business.id,
      'Appointment cancelled',
      `${appointment.customer.name} cancelled their ${appointment.service.name} appointment`,
      { type: 'appointment', appointmentId: appointmentId },
    ).catch((err: unknown) => console.error('[push] cancel-appointment notify failed:', err));

    return reply.send({
      appointment: { id: updated.id, status: updated.status },
      ownerTelegramChatId: business.ownerTelegramChatId,
      customerName: appointment.customer.name,
      serviceName: appointment.service.name,
      startTime: appointment.startTime,
    });
  });

  // GET /bot/customer-appointments/:botToken/:telegramUserId — list upcoming appointments
  app.get('/bot/customer-appointments/:botToken/:telegramUserId', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botToken, telegramUserId } = request.params as { botToken: string; telegramUserId: string };

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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

  // GET /bot/due-reminders — appointments needing reminder in the next window
  app.get('/bot/due-reminders', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const query = request.query as Record<string, string>;
    if (!query.botToken || !query.from || !query.to) {
      return sendError(reply, 400, 'botToken, from, and to are required');
    }

    const business = await prisma.business.findUnique({ where: { botToken: query.botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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

    // Attach business info needed for the reminder message
    const result = appointments.map((a) => ({
      ...a,
      business: {
        name: business.name,
        ownerTelegramChatId: business.ownerTelegramChatId,
      },
    }));

    return reply.send(result);
  });

  // POST /bot/mark-reminder-sent — mark a reminder as sent
  app.post('/bot/mark-reminder-sent', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botToken: z.string(),
      appointmentId: z.string(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const business = await prisma.business.findUnique({ where: { botToken: parsed.data.botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

    await prisma.appointment.update({
      where: { id: parsed.data.appointmentId },
      data: { reminderSent: true },
    });
    return reply.send({ ok: true });
  });

  // GET /bot/projects/:botToken/:telegramUserId — get client's active projects
  app.get('/bot/projects/:botToken/:telegramUserId', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const { botToken, telegramUserId } = request.params as { botToken: string; telegramUserId: string };

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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

  // POST /bot/milestone-review — client approves a milestone from the bot
  app.post('/bot/milestone-review', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botToken: z.string(),
      milestoneId: z.string(),
      approved: z.boolean(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, milestoneId, approved } = parsed.data;

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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

      if (business.botToken && business.ownerTelegramChatId) {
        const text =
          `✅ <b>${customerName}</b> has approved '<b>${updated.name}</b>'.\n\n` +
          `Project: ${milestone.project.name}\n` +
          `Amount: ${amount} UZS\n\n` +
          `You can now mark payment as received in the app.`;
        sendTelegramMessage(business.botToken, business.ownerTelegramChatId, text).catch(
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

  // POST /bot/accept-proposal — client accepts a project proposal from the bot
  app.post('/bot/accept-proposal', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botToken: z.string(),
      projectId: z.string(),
      telegramUserId: z.string(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, projectId, telegramUserId } = parsed.data;

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

    const project = await prisma.project.findFirst({
      where: { id: projectId, businessId: business.id, deletedAt: null },
      include: { customer: { select: { name: true, telegramUserId: true } } },
    });
    if (!project) return sendError(reply, 404, 'Project not found');

    // Verify the caller is the project's customer
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

    // Notify owner via push and Telegram
    const customerName = project.customer.name;

    sendPushToAll(
      business.id,
      'Proposal accepted',
      `${customerName} accepted the ${project.name} proposal`,
      { type: 'project', projectId: project.id },
    ).catch((err: unknown) => console.error('[push] accept-proposal notify failed:', err));

    if (business.botToken && business.ownerTelegramChatId) {
      const text =
        `✅ <b>${customerName}</b> accepted the proposal for <b>${project.name}</b>.\n\n` +
        `The project is now in progress.`;
      sendTelegramMessage(business.botToken, business.ownerTelegramChatId, text).catch(
        (err: unknown) => console.error('[telegram] accept-proposal notify failed:', err),
      );
    }

    return reply.send({
      project: { id: updated.id, name: updated.name, status: updated.status },
    });
  });

  // POST /bot/message — customer sent a free-text message via the bot
  // Forward to owner via Telegram only — no database write
  app.post('/bot/message', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = z.object({
      botToken: z.string(),
      telegramUserId: z.string(),
      text: z.string().min(1).max(4096),
      telegramMessageId: z.string().optional(),
    }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, telegramUserId, text } = parsed.data;

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

    const customer = await prisma.customer.findFirst({
      where: { businessId: business.id, telegramUserId, deletedAt: null },
    });
    if (!customer) return sendError(reply, 404, 'Customer not found');

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastInteractionAt: new Date() },
    });

    // Forward to owner via Telegram — no database write
    if (business.botToken && business.ownerTelegramChatId) {
      sendTelegramMessage(
        business.botToken,
        business.ownerTelegramChatId,
        `💬 ${customer.name}: ${text}`,
      ).catch((err: unknown) => console.error('[telegram] message forward failed:', err));
    }

    return reply.send({ ok: true });
  });

  // POST /bot/confirm-payment — owner tapped "Mark as paid" in Telegram
  app.post('/bot/confirm-payment', async (request, reply) => {
    if (!verifyBotSecret(request, reply)) return;

    const parsed = confirmPaymentBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, orderId } = parsed.data;

    const business = await prisma.business.findUnique({ where: { botToken } });
    if (!business) return sendError(reply, 404, 'Business not found');

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
