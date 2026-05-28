import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

// Currency suffix follows the app language: "so'm" (uz), "сум" (ru), "UZS" (en).
// Updated from main.dart whenever the locale changes. Defaults to UZS.
String _currencySuffix = 'UZS';

void setCurrencyLocale(String code) {
  switch (code) {
    case 'uz':
      _currencySuffix = "so'm";
      break;
    case 'ru':
      _currencySuffix = 'сум';
      break;
    default:
      _currencySuffix = 'UZS';
  }
}

String formatUZS(int amount) {
  final formatted = NumberFormat('#,##0', 'en_US')
      .format(amount)
      .replaceAll(',', ' ');
  return '$formatted $_currencySuffix';
}

String formatDate(DateTime dt) =>
    DateFormat('d MMM yyyy').format(dt.toLocal());

String formatDateTime(DateTime dt) =>
    DateFormat('d MMM, HH:mm').format(dt.toLocal());

/// 24-hour time (HH:mm) from a DateTime. Pass a local DateTime.
String formatTime(DateTime dateTime) {
  final h = dateTime.hour.toString().padLeft(2, '0');
  final m = dateTime.minute.toString().padLeft(2, '0');
  return '$h:$m';
}

/// 24-hour time (HH:mm) from a TimeOfDay, locale-independent.
String formatTimeOfDay(TimeOfDay time) {
  final h = time.hour.toString().padLeft(2, '0');
  final m = time.minute.toString().padLeft(2, '0');
  return '$h:$m';
}

String todayIso() => DateFormat('yyyy-MM-dd').format(DateTime.now());
