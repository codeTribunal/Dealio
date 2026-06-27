import { prismaUnscoped } from '../lib/prisma.js';

export async function allocateOrderNumber(businessId: string): Promise<number> {
  // Count over ALL orders for the business, INCLUDING soft-deleted ones: a
  // soft-deleted order still occupies its (businessId, orderNumber) under the
  // @@unique constraint, so the next number must clear it too (otherwise we'd
  // perpetually collide with a deleted top number and exhaust the retries).
  // Uses the un-extended client to bypass the soft-delete read filter; the
  // caller (POST /bot/orders) catches + retries the unique-constraint race.
  const result = await prismaUnscoped.order.aggregate({
    where: { businessId },
    _max: { orderNumber: true },
  });
  return (result._max.orderNumber ?? 0) + 1;
}
