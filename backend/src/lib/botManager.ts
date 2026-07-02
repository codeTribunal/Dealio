// Thin client for the bot-manager service (the separate process that runs the
// per-business Grammy bots). Mirrors the existing fetch pattern in
// routes/business.ts (restartBusinessBot) + routes/onboarding.ts. All calls are
// best-effort: the caller decides whether a failure matters. Note that even if
// stop fails, a suspended/PENDING_DELETION business's bot is already functionally
// down — every backend call it makes returns 403 ACCOUNT_SUSPENDED.

const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL ?? 'http://localhost:3002';

function managerHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '',
  };
}

/** Stop + deregister this business's bot in the manager (activeBots.delete). */
export async function stopBusinessBot(businessId: string): Promise<void> {
  await fetch(`${BOT_SERVICE_URL}/internal/stop-bot`, {
    method: 'POST',
    headers: managerHeaders(),
    body: JSON.stringify({ businessId }),
    signal: AbortSignal.timeout(10_000),
  });
}

/** (Re)start this business's bot in the manager. No-op if already running. */
export async function startBusinessBot(businessId: string): Promise<void> {
  await fetch(`${BOT_SERVICE_URL}/internal/start-bot`, {
    method: 'POST',
    headers: managerHeaders(),
    body: JSON.stringify({ businessId }),
    signal: AbortSignal.timeout(10_000),
  });
}
