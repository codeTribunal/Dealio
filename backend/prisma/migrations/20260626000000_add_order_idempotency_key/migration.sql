-- Idempotency for POST /bot/orders: a retried request (after a lost/timed-out
-- response) reuses the original order instead of creating a duplicate. The
-- column is nullable and NULLs are distinct in Postgres, so existing orders
-- (and any future order without a key) are unaffected by the unique index.
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Order_businessId_idempotencyKey_key" ON "Order"("businessId", "idempotencyKey");
