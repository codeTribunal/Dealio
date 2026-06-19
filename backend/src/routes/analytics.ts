import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';

export default async function analyticsRoutes(app: FastifyInstance) {
  app.get('/analytics', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request.user.userId, reply);
    if (!business) return;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Analytics are appointment-based (the product/order model is dormant).
    const base = { businessId: business.id, deletedAt: null };

    const [
      thisMonthRev,
      lastMonthRev,
      completedThisMonth,
      appointmentsThisMonth,
      topCustomerRows,
      pendingResult,
    ] = await Promise.all([
      // Revenue this month — completed appointments, by start time.
      prisma.appointment.aggregate({
        where: { ...base, status: 'COMPLETED', startTime: { gte: thisMonthStart } },
        _sum: { price: true },
      }),

      // Revenue last month.
      prisma.appointment.aggregate({
        where: {
          ...base,
          status: 'COMPLETED',
          startTime: { gte: lastMonthStart, lt: thisMonthStart },
        },
        _sum: { price: true },
      }),

      // Completed appointments this month.
      prisma.appointment.count({
        where: { ...base, status: 'COMPLETED', startTime: { gte: thisMonthStart } },
      }),

      // Booked (non-cancelled / non-no-show) appointments this month.
      prisma.appointment.count({
        where: {
          ...base,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          startTime: { gte: thisMonthStart },
        },
      }),

      // Top 3 customers by completed-appointment spend in the last 90 days.
      prisma.appointment.groupBy({
        by: ['customerId'],
        where: { ...base, status: 'COMPLETED', startTime: { gte: ninetyDaysAgo } },
        _sum: { price: true },
        _count: { id: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 3,
      }),

      // Pending payments — appointments awaiting payment.
      prisma.appointment.aggregate({
        where: {
          ...base,
          paymentStatus: 'PENDING',
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        _sum: { price: true },
      }),
    ]);

    // Resolve customer names for the top customers.
    const topCustomers = await Promise.all(
      topCustomerRows.map(async (row) => {
        const customer = await prisma.customer.findFirst({
          where: { id: row.customerId, businessId: business.id },
          select: { id: true, name: true },
        });
        return {
          id: row.customerId,
          name: customer?.name ?? 'Unknown',
          totalSpent: row._sum.price ?? 0,
          appointmentCount: row._count.id,
        };
      }),
    );

    return reply.send({
      revenueThisMonth: thisMonthRev._sum.price ?? 0,
      revenueLastMonth: lastMonthRev._sum.price ?? 0,
      completedThisMonth,
      appointmentsThisMonth,
      pendingPaymentsTotal: pendingResult._sum.price ?? 0,
      topCustomers,
    });
  });
}
