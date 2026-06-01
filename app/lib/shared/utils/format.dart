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

// ── Tashkent (UTC+5, fixed, no DST) ─────────────────────────────────────────
// The scheduling backend treats every stored instant as a Tashkent wall-clock
// time at a fixed +5 offset. The appointment-create form builds its instant
// from naive device-local time (DateTime(...).toUtc()), which is only correct
// when the device is on Tashkent time — we deliberately do NOT reuse that here.
// Instead these helpers apply the fixed +5 offset so blocked slots are correct
// regardless of the device timezone.
const Duration _kTashkentOffset = Duration(hours: 5);

/// Build the UTC instant for a Tashkent wall-clock date + time.
/// Tashkent wall-clock = UTC + 5h, so the UTC instant = wall-clock − 5h.
String tashkentWallClockToIso(DateTime date, TimeOfDay time) {
  final asUtcWall =
      DateTime.utc(date.year, date.month, date.day, time.hour, time.minute);
  return asUtcWall.subtract(_kTashkentOffset).toIso8601String();
}

/// A UTC instant shifted into Tashkent wall-clock fields (still flagged UTC).
DateTime _toTashkent(String iso) =>
    DateTime.parse(iso).toUtc().add(_kTashkentOffset);

/// Tashkent calendar date of an instant, e.g. "15 Jun 2026".
String formatTashkentDate(String iso) =>
    DateFormat('d MMM yyyy').format(_toTashkent(iso));

/// Tashkent 24h time of an instant, e.g. "09:00".
String formatTashkentTime(String iso) {
  final d = _toTashkent(iso);
  return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}
