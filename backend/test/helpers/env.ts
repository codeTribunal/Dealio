/** True only when a dedicated test database is configured. */
export function hasTestDb(): boolean {
  return !!process.env.TEST_DATABASE_URL;
}

export const SKIP_DB_MESSAGE =
  'TEST_DATABASE_URL is not set — skipping DB-dependent cross-tenant isolation tests. ' +
  'See backend/TESTING.md to point them at a throwaway local Postgres.';
