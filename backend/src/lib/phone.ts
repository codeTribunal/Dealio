/** Default country for bare national-format numbers — Uzbekistan (+998). */
const DEFAULT_COUNTRY_CODE = '998';

/**
 * Canonicalize a phone number to E.164 form ("+" followed by digits only), so
 * the same human number always compares/stores identically regardless of how
 * it was typed. Used for ALL auth phone storage and lookups (enrollment +
 * login) so an account stays matchable across formats.
 *
 * Rules (simple + predictable, for the formats we support — UZ +998 and
 * international such as +82):
 *  - Strip everything that isn't a digit or a leading "+": spaces, dashes,
 *    parens, dots, etc.
 *  - Leading "+"         → keep the country code as typed: "+82 10 6778…" → "+82106778…"
 *  - Leading "00"        → international access prefix → replace with "+":  "0082…" → "+82…"
 *  - Leading single "0"  → national trunk prefix → apply DEFAULT_COUNTRY_CODE,
 *                          dropping the 0:  "090 123…"(UZ local) → "+99890123…"
 *  - Otherwise (bare digits, no "+"/"0") → assume the digits already include a
 *    country code and just prepend "+":  "821067788836" → "+821067788836",
 *    "998901234567" → "+998901234567"
 *
 * Notes:
 *  - Idempotent: normalizePhone(normalizePhone(x)) === normalizePhone(x).
 *  - An already-E.164 stored value like "+821067788836" maps to itself, so
 *    existing rows stay matchable (no data migration needed).
 *  - Empty/garbage input is returned trimmed; length/validity is checked by the
 *    callers (zod min/max).
 */
export function normalizePhone(input: string): string {
  const raw = (input ?? '').trim();
  if (raw === '') return raw;

  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return raw;

  if (hasPlus) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  return `+${digits}`;
}
