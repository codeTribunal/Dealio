// P2P transfer card helpers — shared by settings (entry) and anywhere a card
// number is displayed. Mirrored in the Flutter app
// (app/lib/shared/utils/card_number.dart) — keep the two in sync.

/** Strip everything but digits and cap at 16 (Uzcard/Humo card length). */
export function cardDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16)
}

/** Group digits in blocks of 4: "8600123412341234" → "8600 1234 1234 1234". */
export function formatCardNumber(value: string): string {
  return cardDigits(value).replace(/(.{4})(?=.)/g, '$1 ')
}

export type CardValidationError = 'length' | 'prefix'

/**
 * Validate an Uzcard/Humo card number (spaces allowed). Empty input is valid —
 * it clears the card. Returns null when valid, otherwise which rule failed:
 * 'length' (not 16 digits) or 'prefix' (not Uzcard 8600 / Humo 9860).
 */
export function validateCardNumber(value: string): CardValidationError | null {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return null
  if (digits.length !== 16) return 'length'
  if (!digits.startsWith('8600') && !digits.startsWith('9860')) return 'prefix'
  return null
}
