import { prisma } from './prisma.js';

/**
 * Global platform settings — a single row keyed by this fixed id.
 *
 * These are superadmin-controlled, platform-wide toggles (NOT per-business).
 * Today the only setting is `cardPaymentsEnabled`, which gates the visibility
 * of card-payment setup/display across the platform. No payment data is ever
 * removed by these flags — they only control whether UI is surfaced.
 */
const SINGLETON_ID = 'singleton';

/**
 * Read the global card-payments flag.
 *
 * Defaults to TRUE when no settings row exists yet, so card setup/display is
 * shown unless a superadmin has explicitly turned it off. This guarantees the
 * "default ON" behaviour without needing to seed a row.
 */
export async function getCardPaymentsEnabled(): Promise<boolean> {
  // findUnique is intentionally outside the soft-delete extension's scope, and
  // PlatformSettings has no deletedAt — a plain unique read is correct here.
  const row = await prisma.platformSettings.findUnique({
    where: { id: SINGLETON_ID },
    select: { cardPaymentsEnabled: true },
  });
  return row?.cardPaymentsEnabled ?? true;
}

/** Set the card-payments flag, creating the singleton row on first write. */
export async function setCardPaymentsEnabled(value: boolean): Promise<boolean> {
  const row = await prisma.platformSettings.upsert({
    where: { id: SINGLETON_ID },
    update: { cardPaymentsEnabled: value },
    create: { id: SINGLETON_ID, cardPaymentsEnabled: value },
    select: { cardPaymentsEnabled: true },
  });
  return row.cardPaymentsEnabled;
}
