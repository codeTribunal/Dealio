/// Default country for bare national-format numbers — Uzbekistan (+998).
const String _kDefaultCountryCode = '998';

/// Canonicalize a phone number to E.164 form ("+" followed by digits only).
///
/// Mirrors the backend `lib/phone.ts` `normalizePhone` exactly, so a number the
/// user types in any format is sent in the same canonical form the backend
/// stores and looks up by. Rules:
///  - strip everything that isn't a digit or a leading "+";
///  - leading "+"        → keep the country code as typed;
///  - leading "00"       → international prefix → replace with "+";
///  - leading single "0" → national trunk prefix → apply the default country;
///  - otherwise (bare digits) → assume a country code is present, prepend "+".
String normalizePhone(String input) {
  final raw = input.trim();
  if (raw.isEmpty) return raw;

  final hasPlus = raw.startsWith('+');
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return raw;

  if (hasPlus) return '+$digits';
  if (digits.startsWith('00')) return '+${digits.substring(2)}';
  if (digits.startsWith('0')) return '+$_kDefaultCountryCode${digits.substring(1)}';
  return '+$digits';
}
