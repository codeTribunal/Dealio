import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/models/customer.dart'
    show BusinessCustomField, CheckoutQuestion, CustomerStage;

export '../../core/models/customer.dart'
    show BusinessCustomField, CustomerStage, CheckoutQuestion;

// ── Custom Fields ─────────────────────────────────────────────────────

class CustomFieldsNotifier extends AsyncNotifier<List<BusinessCustomField>> {
  @override
  Future<List<BusinessCustomField>> build() =>
      ref.read(apiServiceProvider).getCustomFields();

  Future<void> add(String name, String fieldType) async {
    final current = state.valueOrNull ?? [];
    final field = await ref.read(apiServiceProvider).createCustomField(
          name,
          fieldType,
          current.length,
        );
    state = AsyncData([...current, field]);
  }

  Future<void> remove(String fieldId) async {
    final current = state.valueOrNull ?? [];
    await ref.read(apiServiceProvider).deleteCustomField(fieldId);
    state = AsyncData(current.where((f) => f.id != fieldId).toList());
  }
}

final customFieldsProvider =
    AsyncNotifierProvider<CustomFieldsNotifier, List<BusinessCustomField>>(
  CustomFieldsNotifier.new,
);

// ── Stages ────────────────────────────────────────────────────────────

class StagesNotifier extends AsyncNotifier<List<CustomerStage>> {
  @override
  Future<List<CustomerStage>> build() =>
      ref.read(apiServiceProvider).getStages();

  Future<void> add(String name, String color) async {
    final current = state.valueOrNull ?? [];
    final stage = await ref.read(apiServiceProvider).createStage(
          name,
          color,
          current.length,
        );
    state = AsyncData([...current, stage]);
  }

  Future<void> remove(String stageId) async {
    final current = state.valueOrNull ?? [];
    await ref.read(apiServiceProvider).deleteStage(stageId);
    state = AsyncData(current.where((s) => s.id != stageId).toList());
  }
}

final stagesProvider =
    AsyncNotifierProvider<StagesNotifier, List<CustomerStage>>(
  StagesNotifier.new,
);

// ── Checkout Questions ────────────────────────────────────────────────

class CheckoutQuestionsNotifier
    extends AsyncNotifier<List<CheckoutQuestion>> {
  @override
  Future<List<CheckoutQuestion>> build() =>
      ref.read(apiServiceProvider).getCheckoutQuestions();

  Future<void> add(String question, bool required) async {
    final current = state.valueOrNull ?? [];
    final q = await ref.read(apiServiceProvider).createCheckoutQuestion(
          question,
          required,
          current.length,
        );
    state = AsyncData([...current, q]);
  }

  Future<void> remove(String id) async {
    final current = state.valueOrNull ?? [];
    await ref.read(apiServiceProvider).deleteCheckoutQuestion(id);
    state = AsyncData(current.where((q) => q.id != id).toList());
  }

  Future<void> toggleRequired(String id, bool required) async {
    final current = state.valueOrNull ?? [];
    await ref
        .read(apiServiceProvider)
        .updateCheckoutQuestion(id, {'required': required});
    state = AsyncData(
      current
          .map((q) =>
              q.id == id ? CheckoutQuestion(id: q.id, question: q.question, required: required, order: q.order) : q)
          .toList(),
    );
  }
}

final checkoutQuestionsProvider =
    AsyncNotifierProvider<CheckoutQuestionsNotifier, List<CheckoutQuestion>>(
  CheckoutQuestionsNotifier.new,
);
