import { prismaUnscoped } from '../lib/prisma.js';

export interface EraseResult {
  /** Last 4 digits of the owner phone — compliance proof without retaining PII. */
  ownerPhoneLast4: string;
  /** Per-table deleted-row counts (proof of the cascade). */
  tableCounts: Record<string, number>;
}

/**
 * Irreversible, FK-safe child -> parent HARD delete of a business, all of its
 * data, and the owner User + auth artifacts, in a single transaction. There is
 * NO database-level onDelete cascade in the schema, so the order below is
 * load-bearing (deleteMany the children before their parents).
 *
 * SINGLE source of truth shared by the admin erase route and the scheduled
 * deletion purge job, so the two can never diverge. Idempotent: returns null if
 * the business is already gone (a re-run finds nothing). Throws on a real DB
 * error, rolling the whole transaction back (all-or-nothing; no partial delete).
 */
export async function eraseBusinessCascade(businessId: string): Promise<EraseResult | null> {
  const business = await prismaUnscoped.business.findUnique({
    where: { id: businessId },
    select: { id: true, owner: { select: { id: true, phone: true } } },
  });
  if (!business) return null;

  const ownerId = business.owner.id;
  const ownerPhone = business.owner.phone;

  const tableCounts = await prismaUnscoped.$transaction(
    async (tx) => {
      const counts: Record<string, number> = {};
      // ── children first (FK-safe), scoped to this business ──────────────
      counts.orderItems = (await tx.orderItem.deleteMany({ where: { order: { businessId } } })).count;
      counts.invoices = (await tx.invoice.deleteMany({ where: { project: { businessId } } })).count;
      counts.milestones = (await tx.milestone.deleteMany({ where: { project: { businessId } } })).count;
      counts.orders = (await tx.order.deleteMany({ where: { businessId } })).count;
      counts.appointments = (await tx.appointment.deleteMany({ where: { businessId } })).count;
      counts.projects = (await tx.project.deleteMany({ where: { businessId } })).count;
      counts.staffServices = (await tx.staffService.deleteMany({ where: { staff: { businessId } } })).count;
      counts.blockedSlots = (await tx.blockedSlot.deleteMany({ where: { businessId } })).count;
      counts.customerFieldValues = (await tx.customerFieldValue.deleteMany({ where: { customer: { businessId } } })).count;
      counts.customerTags = (await tx.customerTag.deleteMany({ where: { businessId } })).count;
      counts.reminders = (await tx.reminder.deleteMany({ where: { businessId } })).count;
      counts.sentReminders = (await tx.sentReminder.deleteMany({ where: { businessId } })).count;
      counts.deviceTokens = (await tx.deviceToken.deleteMany({ where: { businessId } })).count;
      counts.usageLogs = (await tx.usageLog.deleteMany({ where: { businessId } })).count;
      counts.checkoutQuestions = (await tx.checkoutQuestion.deleteMany({ where: { businessId } })).count;
      counts.businessCustomFields = (await tx.businessCustomField.deleteMany({ where: { businessId } })).count;
      // Customer holds the FK to CustomerStage (currentStageId) → delete
      // customers before stages.
      counts.customers = (await tx.customer.deleteMany({ where: { businessId } })).count;
      counts.customerStages = (await tx.customerStage.deleteMany({ where: { businessId } })).count;
      counts.services = (await tx.service.deleteMany({ where: { businessId } })).count;
      counts.staff = (await tx.staff.deleteMany({ where: { businessId } })).count;
      counts.products = (await tx.product.deleteMany({ where: { businessId } })).count;
      // ── the business itself (holds the FK to its owner User); the encrypted
      //    bot token columns are on this row, so they are wiped by this delete ──
      await tx.business.delete({ where: { id: businessId } });
      counts.business = 1;
      // ── owner User + its auth artifacts (ConsentRecord FK → User) ──────
      counts.consentRecords = (await tx.consentRecord.deleteMany({ where: { userId: ownerId } })).count;
      counts.otpCodes = (await tx.otpCode.deleteMany({ where: { phone: ownerPhone } })).count;
      counts.linkTokens = (await tx.linkToken.deleteMany({ where: { phone: ownerPhone } })).count;
      await tx.user.delete({ where: { id: ownerId } });
      counts.user = 1;
      return counts;
    },
    { timeout: 30000, maxWait: 10000 },
  );

  return { ownerPhoneLast4: ownerPhone.slice(-4), tableCounts };
}
