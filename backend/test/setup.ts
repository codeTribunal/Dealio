/**
 * Vitest setup — runs (as a setupFile) BEFORE any test module imports the app
 * or the Prisma client, so the DB target and secrets are locked in first.
 *
 * SAFETY (read this): these isolation tests TRUNCATE the database they run
 * against. They must NEVER touch production. This file therefore:
 *   1. Forces DATABASE_URL to TEST_DATABASE_URL (or a non-routable dummy when
 *      no test DB is configured — the DB-dependent tests skip in that case).
 *   2. HARD-ABORTS if the resolved URL looks like the production/Railway host,
 *      even if a prod URL leaked in via the shell or a .env file.
 */

const TEST_DB = process.env.TEST_DATABASE_URL;

// Point the app's Prisma client at the test DB (or a dummy that can only ever
// fail to connect to localhost — never prod). The dummy is never queried
// because the DB-dependent suites are skipped when TEST_DATABASE_URL is unset.
process.env.DATABASE_URL =
  TEST_DB ?? 'postgresql://disabled:disabled@127.0.0.1:1/no_test_db_configured';

// Hard guard: refuse to ever run against the production/Railway database.
const resolved = process.env.DATABASE_URL ?? '';
if (/railway|rlwy\.net|autorack|proxy\.rlwy/i.test(resolved)) {
  throw new Error(
    'SAFETY ABORT: the test database URL resolves to a production/Railway host. ' +
      'Cross-tenant isolation tests truncate their database — point TEST_DATABASE_URL ' +
      'at a throwaway local Postgres and never at production.',
  );
}

// Deterministic, non-secret test values. Only set when absent so a CI runner can
// still override them. BOT_TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)
// — lib/crypto.ts validates this at import time.
process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'test-jwt-secret-not-for-prod';
process.env.JWT_EXPIRES_IN ??= '30d';
process.env.ADMIN_JWT_SECRET ??= 'test-admin-jwt-secret-not-for-prod';
process.env.ADMIN_JWT_EXPIRES_IN ??= '8h';
process.env.BOT_MANAGER_SECRET ??= 'test-bot-manager-secret';
process.env.BOT_TOKEN_ENCRYPTION_KEY ??= '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';

// Ensure push/notification side-channels are inert (no outbound network during
// tests) — both are guarded by these env vars being absent.
delete process.env.FCM_SERVICE_ACCOUNT_JSON;
delete process.env.FCM_SERVER_KEY;
