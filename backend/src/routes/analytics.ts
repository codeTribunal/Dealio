import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';

export default async function analyticsRoutes(app: FastifyInstance) {
  app.get('/analytics', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    // Start of the calendar month 5 months back → 6 months incl. the current one.
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Revenue + completion span BOTH completed appointments (SERVICES) and paid
    // orders (PRODUCTS). A business can run either or both modes, so we ALWAYS sum
    // both — never mode-gated. An order counts once its payment is CONFIRMED (the
    // "delivered + paid" terminal state; orderStatus is fulfilment, paymentStatus
    // is realised revenue). Orders bucket by createdAt, appointments by startTime;
    // both use the same naive month boundaries (the timezone caveat applies to
    // both equally and is out of scope for this fix).
    const base = { businessId: business.id, deletedAt: null };

    const [
      thisMonthApptRev,
      lastMonthApptRev,
      completedApptsThisMonth,
      appointmentsThisMonth,
      topCustomerApptRows,
      pendingResult,
      thisMonthOrderRev,
      lastMonthOrderRev,
      completedOrdersThisMonth,
      topCustomerOrderRows,
      trendAppts,
      trendOrders,
    ] = await Promise.all([
      // Appointment revenue this month — completed appointments, by start time.
      prisma.appointment.aggregate({
        where: { ...base, status: 'COMPLETED', startTime: { gte: thisMonthStart } },
        _sum: { price: true },
      }),

      // Appointment revenue last month.
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

      // Customers by completed-appointment spend in the last 90 days (ranked
      // after merging with order spend below — no DB-side take, else a top
      // combined customer could be missed).
      prisma.appointment.groupBy({
        by: ['customerId'],
        where: { ...base, status: 'COMPLETED', startTime: { gte: ninetyDaysAgo } },
        _sum: { price: true },
        _count: { id: true },
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

      // Order revenue this month — paid (CONFIRMED) orders, by createdAt.
      prisma.order.aggregate({
        where: { ...base, paymentStatus: 'CONFIRMED', createdAt: { gte: thisMonthStart } },
        _sum: { total: true },
      }),

      // Order revenue last month.
      prisma.order.aggregate({
        where: {
          ...base,
          paymentStatus: 'CONFIRMED',
          createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
        _sum: { total: true },
      }),

      // Completed (paid) orders this month.
      prisma.order.count({
        where: { ...base, paymentStatus: 'CONFIRMED', createdAt: { gte: thisMonthStart } },
      }),

      // Customers by paid-order spend in the last 90 days.
      prisma.order.groupBy({
        by: ['customerId'],
        where: { ...base, paymentStatus: 'CONFIRMED', createdAt: { gte: ninetyDaysAgo } },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Trend inputs — last 6 months of realised revenue for the sparkline.
      // Completed appointments (by startTime) + paid orders (by createdAt),
      // bucketed by calendar month in JS below. Minimal fields selected.
      prisma.appointment.findMany({
        where: { ...base, status: 'COMPLETED', startTime: { gte: trendStart } },
        select: { price: true, startTime: true },
      }),
      prisma.order.findMany({
        where: { ...base, paymentStatus: 'CONFIRMED', createdAt: { gte: trendStart } },
        select: { total: true, createdAt: true },
      }),
    ]);

    // Build 6 monthly buckets (oldest → current). revenueTrend[5] is this month
    // and equals revenueThisMonth. Mode-agnostic: sums appointments + orders,
    // exactly like revenueThisMonth (never double-counted — disjoint rows).
    const revenueTrend = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        revenue: 0,
      };
    });
    const monthIndex = (dt: Date) =>
      (dt.getFullYear() - trendStart.getFullYear()) * 12 +
      (dt.getMonth() - trendStart.getMonth());
    for (const a of trendAppts) {
      const k = monthIndex(a.startTime);
      if (k >= 0 && k < 6) revenueTrend[k].revenue += a.price;
    }
    for (const o of trendOrders) {
      const k = monthIndex(o.createdAt);
      if (k >= 0 && k < 6) revenueTrend[k].revenue += o.total;
    }

    // Merge per-customer spend across appointments (price) and orders (total),
    // rank by combined spend, take top 3. appointmentCount stays the appointment
    // count (its name); order spend still contributes to the ranking + total.
    const spend = new Map<string, { totalSpent: number; appointmentCount: number }>();
    for (const row of topCustomerApptRows) {
      const e = spend.get(row.customerId) ?? { totalSpent: 0, appointmentCount: 0 };
      e.totalSpent += row._sum.price ?? 0;
      e.appointmentCount += row._count.id;
      spend.set(row.customerId, e);
    }
    for (const row of topCustomerOrderRows) {
      const e = spend.get(row.customerId) ?? { totalSpent: 0, appointmentCount: 0 };
      e.totalSpent += row._sum.total ?? 0;
      spend.set(row.customerId, e);
    }
    const top3 = [...spend.entries()]
      .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
      .slice(0, 3);

    // Resolve customer names for the top customers.
    const topCustomers = await Promise.all(
      top3.map(async ([customerId, agg]) => {
        const customer = await prisma.customer.findFirst({
          where: { id: customerId, businessId: business.id },
          select: { id: true, name: true },
        });
        return {
          id: customerId,
          name: customer?.name ?? 'Unknown',
          totalSpent: agg.totalSpent,
          appointmentCount: agg.appointmentCount,
        };
      }),
    );

    return reply.send({
      // Revenue + completion = appointments + paid orders (never double-counted:
      // appointments and orders are disjoint rows).
      revenueThisMonth: (thisMonthApptRev._sum.price ?? 0) + (thisMonthOrderRev._sum.total ?? 0),
      revenueLastMonth: (lastMonthApptRev._sum.price ?? 0) + (lastMonthOrderRev._sum.total ?? 0),
      completedThisMonth: completedApptsThisMonth + completedOrdersThisMonth,
      appointmentsThisMonth,
      pendingPaymentsTotal: pendingResult._sum.price ?? 0,
      topCustomers,
      revenueTrend,
    });
  });
}
