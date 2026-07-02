import 'package:flutter/services.dart';

/// P2P transfer card helpers — mirrored from the web (`web/lib/card.ts`).
/// Keep the two in sync.

/// Groups typed digits in blocks of 4 ("8600 1234 5678 9012") and caps input
/// at 16 digits (Uzcard/Humo card length). Non-digits are dropped as typed.
class CardNumberInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    var digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length > 16) digits = digits.substring(0, 16);
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write(' ');
      buffer.write(digits[i]);
    }
    final text = buffer.toString();
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

enum CardValidationError { length, prefix }

/// Validates an Uzcard/Humo card number (spaces allowed). Empty input is
/// valid — it clears the card. Returns null when valid, otherwise which rule
/// failed: [CardValidationError.length] (not 16 digits) or
/// [CardValidationError.prefix] (not Uzcard 8600 / Humo 9860).
CardValidationError? validateCardNumber(String value) {
  final digits = value.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return null;
  if (digits.length != 16) return CardValidationError.length;
  if (!digits.startsWith('8600') && !digits.startsWith('9860')) {
    return CardValidationError.prefix;
  }
  return null;
}
