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
  'appointment.notes',
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
 * Irreversibly de-identify a customer (ZRU-547 "delete my personal data"): scrub
 * the personal fields on the customer row and their orders/appointments, delete
 * personal custom-field values + tags, clear consent, and stamp anonymizedAt —
 * while KEEPING the customer row and its de-identified transactional links so the
 * business's accounting records (order numbers, amounts, dates, status) survive.
 *
 * Free-text PII is scrubbed everywhere it lives for this customer: the customer
 * notes, Order.notes / Order.internalNotes, Appointment.notes, and the free-text
 * `note` inside each Order.timeline entry (the rest of the timeline, which is a
 * structured status history, is preserved).
 *
 * This is the SINGLE source of truth for both the admin anonymize route and the
 * bot-initiated erase, so the two can never diverge. Runs in one transaction and
 * is safe to re-run (re-scrubbing already-null / already-stripped data is a
 * no-op). No restore.
 *
 * @param id the resolved Customer.id (caller resolves it by tenancy first).
 */
export async function anonymizeCustomer(id: string): Promise<void> {
  await prismaUnscoped.$transaction(async (tx) => {
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
  });
}
