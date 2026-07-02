import { prisma } from './prisma.js';

export type LegalDocType = 'PRIVACY' | 'OFFER';

/**
 * Baseline versions used ONLY as a defensive fallback if a LegalDocument row is
 * somehow missing (the migration seeds both, so this should never be hit). Kept
 * equal to the deploy baseline so a fallback can never silently invalidate every
 * existing consent. This is NOT the source of truth — the DB row is.
 */
const FALLBACK_VERSION: Record<LegalDocType, string> = {
  PRIVACY: '2026-07-01',
  OFFER: '2026-07-01',
};

// Light in-process cache so the consent-status endpoint (hit on every bot
// interaction) does not read the row every time. A short TTL bounds staleness
// across instances; publish() calls invalidateVersionCache() for instant local
// freshness. "Always reflect a publish promptly" — TTL is 15s, invalidated on publish.
const TTL_MS = 15_000;
const cache = new Map<LegalDocType, { version: string; at: number }>();

/** Current in-force version for a legal document, read from the DB (cached). */
export async function getCurrentVersion(docType: LegalDocType): Promise<string> {
  const hit = cache.get(docType);
  const now = Date.now();
  if (hit && now - hit.at < TTL_MS) return hit.version;

  let row: { version: string } | null;
  try {
    row = await prisma.legalDocument.findUnique({
      where: { docType },
      select: { version: true },
    });
  } catch (err) {
    // Fail SAFE on a DB read error (outage/timeout): return the baseline
    // version WITHOUT caching it, so the very next call retries the DB rather
    // than pinning the fallback for the TTL — a transient blip must not freeze
    // the in-force version. (The null-row case below is a SUCCESSFUL query and
    // is still cached as normal.)
    console.error(
      `[legalVersion] getCurrentVersion(${docType}) DB read failed, using fallback: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return FALLBACK_VERSION[docType];
  }

  const version = row?.version ?? FALLBACK_VERSION[docType];
  cache.set(docType, { version, at: now });
  return version;
}

/** Drop the cache (all, or one docType) so the next read reflects a publish. */
export function invalidateVersionCache(docType?: LegalDocType): void {
  if (docType) cache.delete(docType);
  else cache.clear();
}
