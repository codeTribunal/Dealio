import { prisma } from '../lib/prisma.js';

export async function allocateOrderNumber(businessId: string): Promise<number> {
  // No transaction needed — the @@unique([businessId, orderNumber]) constraint
  // catches any race condition at the DB level with a retryable conflict error.
  const result = await prisma.order.aggregate({
    where: { businessId },
    _max: { orderNumber: true },
  });
  return (result._max.orderNumber ?? 0) + 1;
}
