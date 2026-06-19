import { prismaUnscoped } from '../lib/prisma.js';

/**
 * Reusable, tenant-scoped soft-delete / restore primitives.
 *
 * These flip `deletedAt` on a single row, scoped to a business, so a caller can
 * never touch another tenant's data. They use `updateMany` with the businessId
 * in the WHERE (rather than `update` by id) precisely so a foreign id silently
 * affects zero rows — the same ownership pattern the routes use.
 *
 * They run against `prismaUnscoped` (the un-extended client): the soft-delete
 * extension only affects reads, so writes behave identically, but restore must
 * be able to target an already-deleted (otherwise invisible) row, so using the
 * unscoped client keeps both operations consistent.
 *
 * Phase A built these; Phase B wires them to the admin data-management routes.
 * Do not call them from owner-facing routes.
 */

/** Soft-deletable models that carry a direct `businessId` column. */
export type BusinessScopedSoftDeletable =
  | 'customer'
  | 'product'
  | 'order'
  | 'service'
  | 'staff'
  | 'appointment'
  | 'project'
  | 'businessCustomField'
  | 'customerStage'
  | 'checkoutQuestion';

type DeletedAtWhere = null | { not: null };

async function setDeletedAt(
  model: BusinessScopedSoftDeletable,
  where: { id: string; businessId: string; deletedAt: DeletedAtWhere },
  value: Date | null,
): Promise<number> {
  const data = { deletedAt: value };
  switch (model) {
    case 'customer':
      return (await prismaUnscoped.customer.updateMany({ where, data })).count;
    case 'product':
      return (await prismaUnscoped.product.updateMany({ where, data })).count;
    case 'order':
      return (await prismaUnscoped.order.updateMany({ where, data })).count;
    case 'service':
      return (await prismaUnscoped.service.updateMany({ where, data })).count;
    case 'staff':
      return (await prismaUnscoped.staff.updateMany({ where, data })).count;
    case 'appointment':
      return (await prismaUnscoped.appointment.updateMany({ where, data })).count;
    case 'project':
      return (await prismaUnscoped.project.updateMany({ where, data })).count;
    case 'businessCustomField':
      return (await prismaUnscoped.businessCustomField.updateMany({ where, data })).count;
    case 'customerStage':
      return (await prismaUnscoped.customerStage.updateMany({ where, data })).count;
    case 'checkoutQuestion':
      return (await prismaUnscoped.checkoutQuestion.updateMany({ where, data })).count;
  }
}

/**
 * Soft-delete one `businessId`-scoped row. Returns `{ deleted: true }` only when
 * a not-already-deleted row owned by `businessId` matched (idempotent — a row
 * already deleted keeps its original timestamp and reports false).
 */
export async function softDelete(
  model: BusinessScopedSoftDeletable,
  id: string,
  businessId: string,
): Promise<{ deleted: boolean }> {
  const count = await setDeletedAt(model, { id, businessId, deletedAt: null }, new Date());
  return { deleted: count > 0 };
}

/**
 * Restore (un-delete) one `businessId`-scoped row. Returns `{ restored: true }`
 * only when a currently-deleted row owned by `businessId` matched.
 */
export async function restore(
  model: BusinessScopedSoftDeletable,
  id: string,
  businessId: string,
): Promise<{ restored: boolean }> {
  const count = await setDeletedAt(model, { id, businessId, deletedAt: { not: null } }, null);
  return { restored: count > 0 };
}

/**
 * Soft-delete a Milestone. Milestone has no `businessId` of its own, so it is
 * scoped through its parent Project's `businessId` — still tenant-safe.
 */
export async function softDeleteMilestone(
  id: string,
  businessId: string,
): Promise<{ deleted: boolean }> {
  const { count } = await prismaUnscoped.milestone.updateMany({
    where: { id, deletedAt: null, project: { businessId } },
    data: { deletedAt: new Date() },
  });
  return { deleted: count > 0 };
}
