import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

// Active app language code ('uz' / 'ru' / 'en'), driving both the currency
// word and localized month/weekday names below. Updated from main.dart
// whenever the locale changes (setCurrencyLocale). Defaults to English.
String _localeCode = 'en';

void setCurrencyLocale(String code) {
  _localeCode = (code == 'uz' || code == 'ru') ? code : 'en';
}

/// The current localized currency word (e.g. "soum" / "so'm" / "сум"), for use
/// as a static suffix/label where the amount formatter isn't applied.
/// uz uses the straight apostrophe U+0027.
String currencyWord() {
  switch (_localeCode) {
    case 'uz':
      return "so'm";
    case 'ru':
      return 'сум';
    default:
      return 'soum';
  }
}

String formatUZS(int amount) {
  final formatted = NumberFormat('#,##0', 'en_US')
      .format(amount)
      .replaceAll(',', ' ');
  return '$formatted ${currencyWord()}';
}

// ── Localized dates ──────────────────────────────────────────────────────────
// Spec (CLAUDE.md): "15 yanvar 2026" (uz) / "15 января 2026" (ru). intl date
// symbols for uz are never initialized (and ru needs the genitive month for
// this format), so month/weekday names are explicit tables driven by the same
// locale mechanism as the currency word. Kept in sync with web/lib/format.ts.
const Map<String, List<String>> _months = {
  'en': [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  'uz': [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ],
  'ru': [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ],
};

const Map<String, List<String>> _monthsShort = {
  'en': [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ],
  'uz': [
    'yan', 'fev', 'mar', 'apr', 'may', 'iyn',
    'iyl', 'avg', 'sen', 'okt', 'noy', 'dek',
  ],
  'ru': [
    'янв', 'фев', 'мар', 'апр', 'май', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  ],
};

// Index 0 = Sunday (matching web's Date.getDay()); Dart's DateTime.weekday is
// Mon=1..Sun=7, mapped via `weekday % 7`.
const Map<String, List<String>> _weekdays = {
  'en': [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday',
  ],
  'uz': [
    'yakshanba', 'dushanba', 'seshanba', 'chorshanba',
    'payshanba', 'juma', 'shanba',
  ],
  'ru': [
    'воскресенье', 'понедельник', 'вторник', 'среда',
    'четверг', 'пятница', 'суббота',
  ],
};

List<String> _table(Map<String, List<String>> tables) =>
    tables[_localeCode] ?? tables['en']!;

String _composeDate(int day, int month, int year) =>
    '$day ${_table(_months)[month - 1]} $year';

/// Localized full date, e.g. "15 yanvar 2026" / "15 января 2026".
String formatDate(DateTime dt) {
  final d = dt.toLocal();
  return _composeDate(d.day, d.month, d.year);
}

/// Localized full date + 24h time, e.g. "15 yanvar 2026, 14:30".
String formatDateTime(DateTime dt) {
  final d = dt.toLocal();
  return '${_composeDate(d.day, d.month, d.year)}, ${formatTime(d)}';
}

/// Localized weekday name, e.g. "dushanba" / "понедельник" / "Monday".
String formatWeekday(DateTime dt) {
  final d = dt.toLocal();
  return _table(_weekdays)[d.weekday % 7];
}

/// Localized "weekday, full date" header, e.g. "dushanba, 15 yanvar 2026".
String formatWeekdayDate(DateTime dt) =>
    '${formatWeekday(dt)}, ${formatDate(dt)}';

/// Localized short month name for [month] 1..12 (DateTime.month), e.g. "yan".
String formatMonthShort(int month) =>
    _table(_monthsShort)[(month - 1) % 12];

/// Localized day + full month without year, e.g. "15 yanvar" (birthdays).
String formatDayMonth(DateTime dt) {
  final d = dt.toLocal();
  return '${d.day} ${_table(_months)[d.month - 1]}';
}

/// Localized day + short month without year, e.g. "15 yan" (compact chips).
String formatDayMonthShort(DateTime dt) {
  final d = dt.toLocal();
  return '${d.day} ${formatMonthShort(d.month)}';
}

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

/// Tashkent calendar date of an instant, localized, e.g. "15 iyun 2026".
/// Composes from the shifted fields directly — no toLocal().
String formatTashkentDate(String iso) {
  final d = _toTashkent(iso);
  return _composeDate(d.day, d.month, d.year);
}

/// Tashkent 24h time of an instant, e.g. "09:00".
String formatTashkentTime(String iso) {
  final d = _toTashkent(iso);
  return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}
