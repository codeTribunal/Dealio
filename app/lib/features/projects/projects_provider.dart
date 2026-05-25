import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_service.dart';
import '../../core/models/project.dart';

class ProjectsNotifier extends AsyncNotifier<List<Project>> {
  @override
  Future<List<Project>> build() => _fetch();

  Future<List<Project>> _fetch({String? status}) =>
      ref.read(apiServiceProvider).getProjects(status: status);

  Future<void> refresh({String? status}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetch(status: status));
  }
}

final projectsProvider =
    AsyncNotifierProvider<ProjectsNotifier, List<Project>>(ProjectsNotifier.new);

class ProjectDetailNotifier extends FamilyAsyncNotifier<Project, String> {
  @override
  Future<Project> build(String projectId) =>
      ref.read(apiServiceProvider).getProject(projectId);

  Future<void> refresh() async {
    // Do NOT set AsyncLoading first — that unmounts the RefreshIndicator and
    // breaks pull-to-refresh. Write the new data directly; existing content
    // stays visible while the fetch runs.
    state = await AsyncValue.guard(() => ref.read(apiServiceProvider).getProject(arg));
  }

  Future<void> updateStatus(String status) async {
    final project = state.valueOrNull;
    if (project == null) return;
    final updated = await ref
        .read(apiServiceProvider)
        .updateProject(project.id, {'status': status});
    state = AsyncData(updated);
    ref.invalidate(projectsProvider);
  }

  Future<void> submitMilestone(String milestoneId) async {
    final project = state.valueOrNull;
    if (project == null) return;
    await ref.read(apiServiceProvider).updateMilestone(
      project.id,
      milestoneId,
      {'status': 'SUBMITTED_FOR_REVIEW'},
    );
    await refresh();
  }

  Future<void> markMilestonePaymentReceived(String milestoneId) async {
    final project = state.valueOrNull;
    if (project == null) return;
    await ref.read(apiServiceProvider).updateMilestone(
      project.id,
      milestoneId,
      {'status': 'PAYMENT_RECEIVED'},
    );
    await refresh();
  }

  Future<void> resetMilestoneToPending(String milestoneId) async {
    final project = state.valueOrNull;
    if (project == null) return;
    await ref.read(apiServiceProvider).updateMilestone(
      project.id,
      milestoneId,
      {'status': 'PENDING'},
    );
    await refresh();
  }

  Future<void> deleteMilestone(String milestoneId) async {
    final project = state.valueOrNull;
    if (project == null) return;
    await ref.read(apiServiceProvider).deleteMilestone(project.id, milestoneId);
    await refresh();
  }

  Future<void> markInvoicePaid(String invoiceId) async {
    final project = state.valueOrNull;
    if (project == null) return;
    await ref.read(apiServiceProvider).markInvoicePaid(project.id, invoiceId);
    await refresh();
  }
}

final projectDetailProvider =
    AsyncNotifierProviderFamily<ProjectDetailNotifier, Project, String>(
        ProjectDetailNotifier.new);
