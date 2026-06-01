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

    const baseWhere = { businessId: business.id, deletedAt: null };

    const [
      thisMonthRevResult,
      lastMonthRevResult,
      ordersCompleted,
      ordersThisMonth,
      topCustomerRows,
      bestItemRows,
      avgResult,
      pendingResult,
    ] = await Promise.all([
      // Revenue this month — confirmed payments only
      prisma.order.aggregate({
        where: { ...baseWhere, paymentStatus: 'CONFIRMED', createdAt: { gte: thisMonthStart } },
        _sum: { total: true },
      }),

      // Revenue last month
      prisma.order.aggregate({
        where: {
          ...baseWhere,
          paymentStatus: 'CONFIRMED',
          createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
        _sum: { total: true },
      }),

      // Orders delivered this month
      prisma.order.count({
        where: { ...baseWhere, orderStatus: 'DELIVERED', createdAt: { gte: thisMonthStart } },
      }),

      // All orders placed this month (excluding cancelled)
      prisma.order.count({
        where: {
          ...baseWhere,
          orderStatus: { not: 'CANCELLED' },
          createdAt: { gte: thisMonthStart },
        },
      }),

      // Top 3 customers by spend in last 90 days
      prisma.order.groupBy({
        by: ['customerId'],
        where: { ...baseWhere, paymentStatus: 'CONFIRMED', createdAt: { gte: ninetyDaysAgo } },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 3,
      }),

      // Best selling product by units sold (all time)
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { ...baseWhere } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 1,
      }),

      // Average order value (confirmed payments, all time)
      prisma.order.aggregate({
        where: { ...baseWhere, paymentStatus: 'CONFIRMED' },
        _avg: { total: true },
      }),

      // Pending payments total (non-cancelled orders with pending payment)
      prisma.order.aggregate({
        where: { ...baseWhere, paymentStatus: 'PENDING', orderStatus: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
    ]);

    // Resolve customer names for top customers
    const topCustomers = await Promise.all(
      topCustomerRows.map(async (row) => {
        const customer = await prisma.customer.findUnique({
          where: { id: row.customerId },
          select: { id: true, name: true },
        });
        return {
          id: row.customerId,
          name: customer?.name ?? 'Unknown',
          totalSpent: row._sum.total ?? 0,
          orderCount: row._count.id,
        };
      }),
    );

    // Resolve product name for best selling
    let bestSellingProduct = null;
    if (bestItemRows.length > 0) {
      const row = bestItemRows[0];
      const product = await prisma.product.findUnique({
        where: { id: row.productId },
        select: { id: true, name: true },
      });
      if (product) {
        bestSellingProduct = {
          id: product.id,
          name: product.name,
          unitsSold: row._sum.quantity ?? 0,
        };
      }
    }

    return reply.send({
      revenueThisMonth: thisMonthRevResult._sum.total ?? 0,
      revenueLastMonth: lastMonthRevResult._sum.total ?? 0,
      ordersThisMonth,
      ordersCompletedThisMonth: ordersCompleted,
      topCustomers,
      bestSellingProduct,
      averageOrderValue: Math.round(avgResult._avg.total ?? 0),
      pendingPaymentsTotal: pendingResult._sum.total ?? 0,
    });
  });
}
