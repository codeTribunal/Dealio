/**
 * Startup secret/env validation — mirrors the fail-fast pattern in
 * lib/crypto.ts (which throws at import when BOT_TOKEN_ENCRYPTION_KEY is missing
 * or the wrong size).
 *
 * There must be NO silent dev fallback for signing/hashing secrets. Previously a
 * misconfigured production booted with publicly-known placeholder strings, which
 * would let anyone forge owner/admin JWTs or brute-force OTP hashes. Instead of
 * falling back, we refuse to boot.
 */

// Reject obvious placeholder / dev values (and anything too short to be a real
// secret). This is a *denylist pattern* used only to refuse boot — it can never
// become the secret itself, so there is no usable fallback here.
const WEAK_SECRET =
  /change[-_ ]?me|dev[-_ ]?secret|placeholder|changeme|example|your[-_ ]?secret/i;
const MIN_SECRET_LENGTH = 16;

/**
 * Return a required secret from the environment, or throw. Throws when the
 * variable is missing/empty, too short, or matches a known placeholder pattern.
 * Use this anywhere a secret is consumed so there is never an insecure fallback.
 */
export function requireSecret(name: string): string {
  const value = (process.env[name] ?? '').trim();
  if (value === '') {
    throw new Error(
      `${name} is not set — refusing to boot. Set a strong random value (see backend/.env.example).`,
    );
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} is too short (<${MIN_SECRET_LENGTH} chars) — refusing to boot. Use a long random value.`,
    );
  }
  if (WEAK_SECRET.test(value)) {
    throw new Error(
      `${name} looks like a placeholder/dev value — refusing to boot. Set a real secret.`,
    );
  }
  return value;
}

/** Required signing/hashing secrets that must never silently fall back. */
const REQUIRED_SECRETS = ['JWT_SECRET', 'ADMIN_JWT_SECRET', 'OTP_HASH_SECRET'] as const;

/**
 * Validate all required secrets up front and throw a single aggregated error
 * listing everything that is wrong, so a misconfigured deploy fails clearly at
 * startup. Call once before the server begins handling requests.
 * (BOT_TOKEN_ENCRYPTION_KEY is validated in lib/crypto.ts at import time.)
 */
export function validateEnv(): void {
  const errors: string[] = [];
  for (const name of REQUIRED_SECRETS) {
    try {
      requireSecret(name);
    } catch (err) {
      errors.push((err as Error).message);
    }
  }
  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed — the server will not start:\n - ${errors.join('\n - ')}`,
    );
  }
}
