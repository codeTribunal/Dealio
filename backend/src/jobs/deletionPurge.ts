import { prismaUnscoped } from '../lib/prisma.js';
import { eraseBusinessCascade } from '../services/eraseBusiness.js';
import { stopBusinessBot } from '../lib/botManager.js';

/**
 * Scheduled irreversible purge of businesses whose 30-day deletion window has
 * elapsed. Finds PENDING_DELETION businesses with deletionScheduledAt <= now and
 * hard-deletes each via the SHARED cascade (eraseBusinessCascade), after
 * stopping + deregistering its bot. The encrypted bot token is on the business
 * row, so it is wiped by the cascade delete.
 *
 * GUARANTEED TRIGGER: called on backend BOOT and on a 24h interval (see
 * src/index.ts), and by the manual superadmin sweep endpoint. A missed schedule
 * (process down at the interval) is caught on the next boot — so a 30-day flag
 * never becomes soft-delete-forever.
 *
 * Idempotent + resilient: keyed off deletionState + deletionScheduledAt, so a
 * re-run finds nothing; each business is purged independently so one failure
 * never blocks the rest, and a failed one is retried on the next sweep. Logs each
 * purge to the SYSTEM log without PII (AuditLog requires an adminUserId, which a
 * system job has none of; the manual admin trigger audit-logs separately).
 */
export async function runDeletionPurge(): Promise<{ purged: number; failed: number; overdue: number }> {
  const overdue = await prismaUnscoped.business.findMany({
    where: { deletionState: 'PENDING_DELETION', deletionScheduledAt: { lte: new Date() } },
    select: { id: true, deletionRequestedAt: true },
  });

  let purged = 0;
  let failed = 0;
  for (const b of overdue) {
    try {
      // Stop + deregister the bot first (best-effort; the token is wiped by the
      // cascade delete below regardless).
      await stopBusinessBot(b.id).catch(() => {});
      const result = await eraseBusinessCascade(b.id);
      if (result) {
        purged += 1;
        console.log(
          `[deletion-purge] purged business ${b.id} at ${new Date().toISOString()} ` +
            `(requestedAt=${b.deletionRequestedAt?.toISOString() ?? '?'}, ` +
            `tables=${JSON.stringify(result.tableCounts)})`,
        );
      }
    } catch (err) {
      failed += 1;
      console.error(`[deletion-purge] FAILED to purge business ${b.id} (retries next sweep):`, err);
    }
  }

  if (overdue.length > 0) {
    console.log(
      `[deletion-purge] sweep complete: ${purged} purged, ${failed} failed of ${overdue.length} overdue`,
    );
  }
  return { purged, failed, overdue: overdue.length };
}
