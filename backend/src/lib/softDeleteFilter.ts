/**
 * Soft-delete query filtering — the single source of truth for *which* models
 * are soft-deletable and *how* the "exclude deleted rows" filter is applied.
 *
 * Kept free of any Prisma-client import so it can be unit-tested without a DB
 * connection. `lib/prisma.ts` wires `injectNotDeleted` into a client extension
 * (see that file for scope/limitations).
 */

/**
 * Every model carrying a `deletedAt` column. Rows with a non-null `deletedAt`
 * are "deleted" and must be invisible to ordinary reads. Names are the
 * PascalCase Prisma model names (as passed to `$allModels` query extensions).
 */
export const SOFT_DELETE_MODELS: ReadonlySet<string> = new Set([
  'Customer',
  'Product',
  'Order',
  'Service',
  'Staff',
  'Appointment',
  'Project',
  'Milestone',
  'BusinessCustomField',
  'CustomerStage',
  'CheckoutQuestion',
]);

/**
 * Merge `deletedAt: null` into a read operation's `where` for soft-deletable
 * models, so deleted rows are excluded by default.
 *
 * Rules:
 *  - Non-soft-deletable model → args returned unchanged.
 *  - Caller already specified `deletedAt` (e.g. an admin query asking for
 *    `deletedAt: { not: null }`) → respected, never overridden. This is the
 *    per-query opt-in to see deleted rows.
 *  - Otherwise → `deletedAt: null` is added (AND-combined with any existing
 *    conditions).
 *
 * `args` is intentionally `any`: under `$allModels` the type is the broad union
 * across every model, and `deletedAt` is not part of the non-soft-deletable
 * models' `where` types. The runtime gate on SOFT_DELETE_MODELS keeps this safe.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function injectNotDeleted(model: string, args: any): any {
  if (!SOFT_DELETE_MODELS.has(model)) return args;

  const next = args ?? {};
  const where = next.where ?? {};

  if (!('deletedAt' in where)) {
    next.where = { ...where, deletedAt: null };
  }

  return next;
}
