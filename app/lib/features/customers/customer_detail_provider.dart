import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/customer.dart';

class CustomerDetailNotifier
    extends FamilyAsyncNotifier<CustomerDetail, String> {
  @override
  Future<CustomerDetail> build(String customerId) async {
    return ref.read(apiServiceProvider).getCustomer(customerId);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(apiServiceProvider).getCustomer(arg),
    );
  }

  Future<void> saveNotes(String notes) async {
    final current = state.valueOrNull;
    if (current == null) return;
    await ref.read(apiServiceProvider).updateCustomerNotes(arg, notes);
    state = AsyncData(current.copyWith(notes: notes));
  }

  Future<void> saveCustomFields(Map<String, String> fields) async {
    final current = state.valueOrNull;
    if (current == null) return;
    await ref.read(apiServiceProvider).updateCustomer(arg, {'customFields': fields});
    state = AsyncData(current.copyWith(customFields: fields));
  }

  Future<void> addTag(String label, String color) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final tag = await ref.read(apiServiceProvider).addTag(arg, label, color);
    state = AsyncData(current.copyWith(tags: [...current.tags, tag]));
  }

  Future<void> removeTag(String tagId) async {
    final current = state.valueOrNull;
    if (current == null) return;
    await ref.read(apiServiceProvider).removeTag(arg, tagId);
    state = AsyncData(
      current.copyWith(tags: current.tags.where((t) => t.id != tagId).toList()),
    );
  }

  Future<void> addReminder(String note, DateTime dueDate) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final reminder =
        await ref.read(apiServiceProvider).addReminder(arg, note, dueDate);
    state = AsyncData(
      current.copyWith(reminders: [...current.reminders, reminder]),
    );
  }

  Future<void> toggleReminder(String reminderId, bool done) async {
    final current = state.valueOrNull;
    if (current == null) return;
    await ref.read(apiServiceProvider).toggleReminder(reminderId, done);
    state = AsyncData(
      current.copyWith(
        reminders: current.reminders
            .map((r) => r.id == reminderId ? r.copyWith(done: done) : r)
            .toList(),
      ),
    );
  }

  Future<void> sendMessage(String text) async {
    await ref.read(apiServiceProvider).sendCustomerMessage(arg, text);
  }

  Future<void> setStage(String? stageId) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final stage = await ref.read(apiServiceProvider).setCustomerStage(arg, stageId);
    state = AsyncData(
      stageId == null
          ? current.copyWith(clearStage: true)
          : current.copyWith(currentStage: stage),
    );
  }

  Future<void> setFieldValues(Map<String, String> values) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final updated = await ref.read(apiServiceProvider).setCustomerFieldValues(arg, values);
    state = AsyncData(current.copyWith(fieldValues: updated));
  }
}

final customerDetailProvider = AsyncNotifierProvider.family<
    CustomerDetailNotifier, CustomerDetail, String>(
  CustomerDetailNotifier.new,
);
