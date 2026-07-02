import { Prisma } from '@prisma/client';
import { prismaUnscoped } from '../lib/prisma.js';

/**
 * Field NAMES scrubbed by anonymizeCustomer — for audit metadata only (never the
 * values, which would defeat the erasure). Kept next to the scrub so they stay in
 * sync.
 */
export const ANONYMIZE_SCRUBBED_FIELDS = [
  'name',
  'phone',
  'telegramUserId',
  'telegramUsername',
  'notes',
  'birthday',
  'customFields',
  'consentedAt',
  'consentVersion',
  'customFieldValues',
  'tags',
  'order.deliveryAddress',
  'order.customAnswers',
  'order.notes',
  'order.internalNotes',
  'order.timeline',
  'order.paymentProofFileId',
  'order.paymentProofUrl',
  'appointment.notes',
  'project.name',
  'project.description',
  'project.paymentTerms',
  'milestone.name',
  'invoice.lineItems',
];

/**
 * Keep only the structured, non-personal fields of an order timeline entry
 * (status, at, by). Drops the optional owner free-text `note` (which can hold
 * PII) and any other/unexpected keys, while preserving the status history so the
 * owner order-detail timeline still renders (that view reads status + at). We
 * strip rather than null the timeline array precisely so the history survives.
 * Pure and tolerant of odd shapes.
 */
function scrubTimelineEntry(entry: Prisma.JsonValue): Prisma.InputJsonValue {
  if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
    const source = entry as Record<string, unknown>;
    const cleaned: Record<string, string> = {};
    if (typeof source.status === 'string') cleaned.status = source.status;
    if (typeof source.at === 'string') cleaned.at = source.at;
    // `by` is always a role literal ('owner' | 'bot' | 'customer' | ...), never
    // a personal name, so it is safe to keep.
    if (typeof source.by === 'string') cleaned.by = source.by;
    return cleaned;
  }
  // Unexpected non-object entry: drop to an empty object rather than risk
  // keeping free text.
  return {};
}

/**
 * Scrub one invoice line-item JSON value: every string anywhere in it (the
 * description etc.) becomes 'Deleted'; numbers (quantity, unitPrice, amounts)
 * and booleans are preserved exactly so the financial record stays intact.
 * Recurses through nested arrays/objects and is tolerant of odd shapes, like
 * scrubTimelineEntry above.
 */
function scrubLineItemValue(value: Prisma.JsonValue): Prisma.InputJsonValue {
  if (typeof value === 'string') return 'Deleted';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map((entry) => (entry === null ? null : scrubLineItemValue(entry)));
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) continue;
      cleaned[key] = entry === null ? null : scrubLineItemValue(entry);
    }
    return cleaned;
  }
  // Only JSON null reaches here; it carries no PII but InputJsonValue cannot
  // express a top-level null, so normalize to an empty object.
  return {};
}

/** Per-model counts of what an anonymize run scrubbed, for the caller/audit. */
export interface AnonymizeCustomerSummary {
  projectsAnonymized: number;
  milestonesAnonymized: number;
  invoicesAnonymized: number;
  /** Orders whose payment-proof Telegram file_id reference was cleared. */
  proofRefsCleared: number;
}

/**
 * Irreversibly de-identify a customer (ZRU-547 "delete my personal data"): scrub
 * the personal fields on the customer row and their orders/appointments, delete
 * personal custom-field values + tags, clear consent, and stamp anonymizedAt —
 * while KEEPING the customer row and its de-identified transactional links so the
 * business's accounting records (order numbers, amounts, dates, status) survive.
 *
 * Free-text PII is scrubbed everywhere it lives for this customer: the customer
 * notes, Order.notes / Order.internalNotes, Appointment.notes, the free-text
 * `note` inside each Order.timeline entry (the rest of the timeline, which is a
 * structured status history, is preserved), plus their freelance records —
 * Project name/description/paymentTerms, Milestone names, and the string fields
 * inside Invoice.lineItems. The payment-proof screenshot reference
 * (Order.paymentProofFileId, a Telegram file_id) is also cleared, making the
 * image unreachable through the getFile proxy. Financial integrity is locked:
 * no amounts, totals, statuses, dates, or invoiceNumbers change — only names,
 * free text, and the proof reference.
 *
 * This is the SINGLE source of truth for both the admin anonymize route and the
 * bot-initiated erase, so the two can never diverge. Runs in one transaction and
 * is safe to re-run (re-scrubbing already-null / already-stripped data is a
 * no-op). No restore.
 *
 * @param id the resolved Customer.id (caller resolves it by tenancy first).
 * @returns per-model counts of the freelance records scrubbed.
 */
export async function anonymizeCustomer(id: string): Promise<AnonymizeCustomerSummary> {
  return prismaUnscoped.$transaction(async (tx) => {
    // Personal custom-field values and tags are deleted outright.
    await tx.customerFieldValue.deleteMany({ where: { customerId: id } });
    await tx.customerTag.deleteMany({ where: { customerId: id } });

    // Scrub the personal fields on their orders: the structured home address and
    // free-text checkout answers, plus the free-text owner/customer notes. Scoped
    // to this customer's orders (customerId = id), not global.
    await tx.order.updateMany({
      where: { customerId: id },
      data: {
        deliveryAddress: null,
        customAnswers: Prisma.DbNull,
        notes: null,
        internalNotes: null,
      },
    });

    // Clear the reference to the customer's payment-proof screenshot — a
    // Telegram file_id that the authenticated getFile proxy resolves on
    // demand (the image bytes live on Telegram's servers, reachable only via
    // this business's bot token; once the ref is gone the proxy returns 404).
    // paymentProofUrl is the not-yet-written future archive URL for the same
    // artifact, cleared alongside so no reference can outlive the erasure.
    // Same customer scoping as the scrubs above; the not-null filter makes
    // the count meaningful (= orders that actually had a proof).
    const proofRefs = await tx.order.updateMany({
      where: { customerId: id, paymentProofFileId: { not: null } },
      data: { paymentProofFileId: null, paymentProofUrl: null },
    });

    // Scrub the free-text notes on their appointments (customer-scoped).
    await tx.appointment.updateMany({
      where: { customerId: id },
      data: { notes: null },
    });

    // Order.timeline is a structured status history whose entries can carry an
    // optional owner free-text `note`. Strip each entry to its structured fields
    // (status/at/by) per order, rather than nulling the array, so the status
    // history the order-detail view renders is preserved while the PII is gone.
    const orders = await tx.order.findMany({
      where: { customerId: id },
      select: { id: true, timeline: true },
    });
    for (const order of orders) {
      const scrubbed = order.timeline.map(scrubTimelineEntry);
      await tx.order.update({
        where: { id: order.id },
        data: { timeline: { set: scrubbed } },
      });
    }

    // Scrub the customer's freelance projects: the title and free-text fields
    // only. totalPrice, dates, and status are untouched so the accounting
    // record survives. Scoped to this customer (customerId = id) exactly like
    // the order/appointment scrubs above; soft-deleted projects are scrubbed
    // too — erasure must reach them as well.
    const projects = await tx.project.updateMany({
      where: { customerId: id },
      data: { name: 'Deleted project', description: null, paymentTerms: null },
    });

    // Milestones on those projects: `name` is the only free-text field.
    // amount, dueDate, and status are untouched.
    const milestones = await tx.milestone.updateMany({
      where: { project: { customerId: id } },
      data: { name: 'Milestone' },
    });

    // Invoice line items are JSON ({ description, quantity, unitPrice }):
    // replace every string with 'Deleted', keep every number exactly.
    // invoiceNumber, total, dueDate, and status are untouched. Read-then-update
    // inside the tx, mirroring the timeline scrub above.
    const invoices = await tx.invoice.findMany({
      where: { project: { customerId: id } },
      select: { id: true, lineItems: true },
    });
    for (const invoice of invoices) {
      const scrubbed = invoice.lineItems.map(scrubLineItemValue);
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { lineItems: { set: scrubbed } },
      });
    }

    // De-identify the customer row itself; keep the row + transactional links.
    await tx.customer.update({
      where: { id },
      data: {
        name: 'Deleted customer',
        phone: null,
        telegramUserId: null,
        telegramUsername: null,
        notes: null,
        birthday: null,
        customFields: Prisma.DbNull,
        // Clear consent so a future /start treats them as a fresh subject and
        // re-triggers the first-contact consent gate (they consented as a
        // different, now-erased identity).
        consentedAt: null,
        consentVersion: null,
        anonymizedAt: new Date(),
      },
    });

    return {
      projectsAnonymized: projects.count,
      milestonesAnonymized: milestones.count,
      invoicesAnonymized: invoices.length,
      proofRefsCleared: proofRefs.count,
    };
  });
}
