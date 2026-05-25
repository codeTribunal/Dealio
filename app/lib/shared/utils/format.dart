import 'package:intl/intl.dart';

String formatUZS(int amount) {
  final formatted = NumberFormat('#,##0', 'en_US')
      .format(amount)
      .replaceAll(',', ' ');
  return '$formatted UZS';
}

String formatDate(DateTime dt) =>
    DateFormat('d MMM yyyy').format(dt.toLocal());

String formatDateTime(DateTime dt) =>
    DateFormat('d MMM, HH:mm').format(dt.toLocal());

String todayIso() => DateFormat('yyyy-MM-dd').format(DateTime.now());
