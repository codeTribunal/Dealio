import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';

const orderInclude = {
  customer: { select: { id: true, name: true, telegramUsername: true } },
  items: {
    include: { product: { select: { id: true, name: true } } },
  },
} as const;

export default async function homeRoutes(app: FastifyInstance) {
  app.get('/home', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      overdueReminders,
      dormantRaw,
      todayOrders,
      pendingPayments,
      newCustomers,
      todayAppointments,
      recentCancellations,
      todayProjects,
      recentMilestones,
    ] = await Promise.all([
      // Reminders due today or overdue, not done
      prisma.reminder.findMany({
        where: {
          businessId: business.id,
          done: false,
          dueDate: { lte: todayEnd },
        },
        include: {
          customer: { select: { id: true, name: true, telegramUsername: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),

      // Customers not interacted in 30+ days with at least one order (top 5 most dormant)
      prisma.customer.findMany({
        where: {
          businessId: business.id,
          deletedAt: null,
          lastInteractionAt: { lt: thirtyDaysAgo },
          orders: { some: { deletedAt: null } },
        },
        select: {
          id: true,
          name: true,
          telegramUsername: true,
          lastInteractionAt: true,
          // Exclude soft-deleted orders from the count (relation _count is not
          // reached by the soft-delete extension, so filter explicitly).
          _count: { select: { orders: { where: { deletedAt: null } } } },
        },
        orderBy: { lastInteractionAt: 'asc' },
        take: 5,
      }),

      // All orders created today
      prisma.order.findMany({
        where: {
          businessId: business.id,
          deletedAt: null,
          createdAt: { gte: todayStart },
        },
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
      }),

      // Orders where customer reported payment, waiting for owner to confirm
      prisma.order.findMany({
        where: {
          businessId: business.id,
          deletedAt: null,
          paymentStatus: 'PAYMENT_RECEIVED',
          orderStatus: { not: 'CANCELLED' },
        },
        include: {
          customer: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),

      // New customers today
      prisma.customer.findMany({
        where: {
          businessId: business.id,
          deletedAt: null,
          createdAt: { gte: todayStart },
        },
        select: {
          id: true,
          name: true,
          telegramUsername: true,
          createdAt: true,
        },
      }),

      // Today's appointments (not cancelled)
      prisma.appointment.findMany({
        where: {
          businessId: business.id,
          startTime: { gte: todayStart, lt: todayEnd },
          status: { not: 'CANCELLED' },
        },
        include: {
          customer: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 10,
      }),

      // Recent cancellations (last 24 hours)
      prisma.appointment.findMany({
        where: {
          businessId: business.id,
          status: 'CANCELLED',
          updatedAt: { gte: twentyFourHoursAgo },
        },
        include: {
          customer: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Projects created in last 24 hours
      prisma.project.findMany({
        where: {
          businessId: business.id,
          createdAt: { gte: twentyFourHoursAgo },
        },
        include: {
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Milestones approved in last 24 hours
      prisma.milestone.findMany({
        where: {
          project: { businessId: business.id },
          status: 'APPROVED',
          updatedAt: { gte: twentyFourHoursAgo },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              customer: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const dormantCustomers = dormantRaw.map((c) => ({
      id: c.id,
      name: c.name,
      telegramUsername: c.telegramUsername,
      daysSince: Math.floor(
        (now.getTime() - c.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
      orderCount: c._count.orders,
    }));

    return reply.send({
      overdueReminders,
      dormantCustomers,
      todayOrders,
      pendingPayments: pendingPayments.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        total: o.total,
        customer: o.customer,
      })),
      newCustomers,
      todayAppointments: todayAppointments.map((a) => ({
        id: a.id,
        customerName: a.customer.name,
        serviceName: a.service.name,
        startTime: a.startTime,
        status: a.status,
      })),
      recentCancellations: recentCancellations.map((a) => ({
        id: a.id,
        customerName: a.customer.name,
        serviceName: a.service.name,
        startTime: a.startTime,
        status: a.status,
      })),
      todayProjects: todayProjects.map((p) => ({
        id: p.id,
        name: p.name,
        customerName: p.customer.name,
        createdAt: p.createdAt,
      })),
      recentMilestones: recentMilestones.map((m) => ({
        id: m.id,
        milestoneName: m.name,
        projectName: m.project.name,
        customerName: m.project.customer.name,
        projectId: m.project.id,
        updatedAt: m.updatedAt,
      })),
    });
  });
}
