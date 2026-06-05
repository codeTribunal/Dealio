import { randomInt, randomBytes, createHmac, timingSafeEqual } from 'crypto';

/**
 * Security utilities for Telegram-based owner authentication.
 *
 * Codes are 6-digit, generated with a crypto-secure RNG (never Math.random),
 * and stored ONLY as a keyed HMAC-SHA256 hash — the plaintext is never
 * persisted or logged. Link tokens are single-use random hex for the
 * enrollment deep link.
 */

// ── Lifetimes & limits ──────────────────────────────────────────────────────

/** One-time codes expire 5 minutes after they are issued. */
export const CODE_TTL_MS = 5 * 60 * 1000;

/** Enrollment link tokens expire 10 minutes after they are created. */
export const LINK_TOKEN_TTL_MS = 10 * 60 * 1000;

/** A code is invalidated after this many failed verify attempts. */
export const MAX_VERIFY_ATTEMPTS = 5;

/** Max code REQUESTS per phone inside RATE_WINDOW_MS (rate limiting). */
export const MAX_CODE_REQUESTS = 5;
export const RATE_WINDOW_MS = 10 * 60 * 1000;

// ── Server-side secret for keyed hashing ────────────────────────────────────

// Dedicated secret for hashing OTP codes; falls back to JWT_SECRET so a fresh
// environment still works. Keyed (HMAC) hashing means a leaked DB alone cannot
// be brute-forced without also knowing the server secret. `||` (not `??`) so an
// empty-string env var falls through rather than becoming the secret.
const HASH_SECRET =
  process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me';

// ── Code generation & hashing ───────────────────────────────────────────────

/** Generate a crypto-secure 6-digit numeric code (zero-padded, "000000"–"999999"). */
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Compute the stored hash for a code. Never store/transmit the plaintext. */
export function hashCode(code: string): string {
  return createHmac('sha256', HASH_SECRET).update(code).digest('hex');
}

/** Constant-time comparison of a candidate code against a stored hash. */
export function verifyCode(code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashCode(code), 'hex');
  let expected: Buffer;
  try {
    expected = Buffer.from(storedHash, 'hex');
  } catch {
    return false;
  }
  if (candidate.length !== expected.length || expected.length === 0) return false;
  return timingSafeEqual(candidate, expected);
}

// ── Link tokens ─────────────────────────────────────────────────────────────

/** Generate a single-use random hex token for the enrollment deep link. */
export function generateLinkToken(): string {
  return randomBytes(32).toString('hex');
}
