import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { PLAN_LIMITS, planLimitError } from '../lib/planLimits.js';

async function getBusiness(userId: string) {
  return prisma.business.findUnique({
    where: { ownerId: userId },
    select: { id: true, plan: true },
  });
}

function currentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function checkCustomerLimit() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const business = await getBusiness(request.user.userId);
    if (!business) return;

    const plan = business.plan ?? 'FREE';
    const limits = PLAN_LIMITS[plan];
    if (limits.customers === Infinity) return;

    const count = await prisma.customer.count({
      where: { businessId: business.id, deletedAt: null },
    });

    if (count >= limits.customers) {
      const result = { allowed: false, limit: limits.customers, current: count };
      return reply.status(402).send(planLimitError('customers', result, plan));
    }
  };
}

export function checkOrderLimit() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const business = await getBusiness(request.user.userId);
    if (!business) return;

    const plan = business.plan ?? 'FREE';
    const limits = PLAN_LIMITS[plan];
    if (limits.ordersPerMonth === Infinity) return;

    const count = await prisma.order.count({
      where: { businessId: business.id, createdAt: { gte: currentMonthStart() } },
    });

    if (count >= limits.ordersPerMonth) {
      const result = { allowed: false, limit: limits.ordersPerMonth, current: count };
      return reply.status(402).send(planLimitError('ordersPerMonth', result, plan));
    }
  };
}

export function checkAppointmentLimit() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const business = await getBusiness(request.user.userId);
    if (!business) return;

    const plan = business.plan ?? 'FREE';
    const limits = PLAN_LIMITS[plan];
    if (limits.appointmentsPerMonth === Infinity) return;

    const count = await prisma.appointment.count({
      where: { businessId: business.id, createdAt: { gte: currentMonthStart() } },
    });

    if (count >= limits.appointmentsPerMonth) {
      const result = { allowed: false, limit: limits.appointmentsPerMonth, current: count };
      return reply.status(402).send(planLimitError('appointmentsPerMonth', result, plan));
    }
  };
}
