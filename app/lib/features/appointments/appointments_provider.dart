import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_service.dart';
import '../../core/models/appointment.dart';

class AppointmentsFilter {
  final DateTime selectedDate;
  final String? staffId;
  final String? status;

  const AppointmentsFilter({
    required this.selectedDate,
    this.staffId,
    this.status,
  });

  AppointmentsFilter copyWith({
    DateTime? selectedDate,
    Object? staffId = _sentinel,
    Object? status = _sentinel,
  }) {
    return AppointmentsFilter(
      selectedDate: selectedDate ?? this.selectedDate,
      staffId: staffId == _sentinel ? this.staffId : staffId as String?,
      status: status == _sentinel ? this.status : status as String?,
    );
  }
}

const _sentinel = Object();
const _prefetchDays = 14;

class AppointmentsNotifier extends AsyncNotifier<List<Appointment>> {
  // date-string → appointments for that day
  final Map<String, List<Appointment>> _cache = {};
  // dates that have been fetched (including days with 0 appointments)
  final Set<String> _loadedDates = {};

  AppointmentsFilter _filter = AppointmentsFilter(selectedDate: DateTime.now());
  AppointmentsFilter get filter => _filter;

  @override
  Future<List<Appointment>> build() async {
    _cache.clear();
    _loadedDates.clear();

    final today = DateTime.now();
    await _prefetchRange(today, _prefetchDays);

    // If the selected date is outside the prefetched window, fetch it too
    final selectedKey = _key(_filter.selectedDate);
    if (!_loadedDates.contains(selectedKey)) {
      await _fetchSingleDate(_filter.selectedDate);
    }

    return _cache[selectedKey] ?? [];
  }

  // Fetches [days] consecutive days starting from [from] in one request
  Future<void> _prefetchRange(DateTime from, int days) async {
    final startStr = _key(from);
    final endStr = _key(DateTime(from.year, from.month, from.day + days - 1));

    final all = await ref.read(apiServiceProvider).getAppointments(
          startDate: startStr,
          endDate: endStr,
          staffId: _filter.staffId,
          status: _filter.status,
        );

    // Pre-populate every day in the range with an empty list
    for (var i = 0; i < days; i++) {
      final k = _key(DateTime(from.year, from.month, from.day + i));
      _cache[k] = [];
      _loadedDates.add(k);
    }

    // Distribute each appointment into its day bucket
    for (final appt in all) {
      final k = _key(appt.startTime.toLocal());
      (_cache[k] ??= []).add(appt);
    }
  }

  Future<void> _fetchSingleDate(DateTime date) async {
    final k = _key(date);
    final list = await ref.read(apiServiceProvider).getAppointments(
          date: k,
          staffId: _filter.staffId,
          status: _filter.status,
        );
    _cache[k] = list;
    _loadedDates.add(k);
  }

  String _key(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

  void selectDate(DateTime date) {
    _filter = _filter.copyWith(selectedDate: date);
    final k = _key(date);
    if (_loadedDates.contains(k)) {
      // Instant — already in cache
      state = AsyncData(_cache[k] ?? []);
    } else {
      // Show loading and fetch only this one day
      state = const AsyncLoading();
      _fetchAndUpdate(date);
    }
  }

  // Fire-and-forget async fetch that updates state when done
  void _fetchAndUpdate(DateTime date) {
    final k = _key(date);
    ref
        .read(apiServiceProvider)
        .getAppointments(
          date: k,
          staffId: _filter.staffId,
          status: _filter.status,
        )
        .then((list) {
      _cache[k] = list;
      _loadedDates.add(k);
      // Only update if the user hasn't navigated away
      if (_key(_filter.selectedDate) == k) {
        state = AsyncData(list);
      }
    }).catchError((Object e, StackTrace st) {
      if (_key(_filter.selectedDate) == k) {
        state = AsyncError(e, st);
      }
    });
  }

  void setStaffFilter(String? staffId) {
    _filter = _filter.copyWith(staffId: staffId);
    _cache.clear();
    _loadedDates.clear();
    ref.invalidateSelf();
  }

  Future<void> refresh() async {
    _cache.clear();
    _loadedDates.clear();
    ref.invalidateSelf();
    await future;
  }

  // Keeps the cache in sync after a mutation
  void _patchCache(Appointment updated) {
    final k = _key(updated.startTime.toLocal());
    final day = _cache[k];
    if (day != null) {
      _cache[k] = [for (final a in day) if (a.id == updated.id) updated else a];
    }
  }

  Future<Appointment> updateStatus(String id, String status) async {
    final updated =
        await ref.read(apiServiceProvider).updateAppointmentStatus(id, status);
    _patchCache(updated);
    state = state.whenData(
        (list) => [for (final a in list) if (a.id == id) updated else a]);
    return updated;
  }

  Future<Appointment> confirmPayment(String id) async {
    final updated =
        await ref.read(apiServiceProvider).confirmAppointmentPayment(id);
    _patchCache(updated);
    state = state.whenData(
        (list) => [for (final a in list) if (a.id == id) updated else a]);
    return updated;
  }

  Future<Appointment> updateNotes(String id, String notes) async {
    final updated =
        await ref.read(apiServiceProvider).updateAppointmentNotes(id, notes);
    _patchCache(updated);
    state = state.whenData(
        (list) => [for (final a in list) if (a.id == id) updated else a]);
    return updated;
  }
}

final appointmentsProvider =
    AsyncNotifierProvider<AppointmentsNotifier, List<Appointment>>(
        AppointmentsNotifier.new);

// Provider for a single appointment detail
final appointmentDetailProvider =
    FutureProvider.family<Appointment, String>((ref, id) {
  return ref.read(apiServiceProvider).getAppointment(id);
});
