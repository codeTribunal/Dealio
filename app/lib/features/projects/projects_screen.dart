import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/project.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/utils/status_labels.dart';
import 'projects_provider.dart';

const _statusFilterCodes = [null, 'PROPOSAL_SENT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'];

String _filterLabel(AppLocalizations l, String? code) {
  switch (code) {
    case null:
      return l.commonAll;
    case 'PROPOSAL_SENT':
      return l.projectsFilterProposal;
    case 'IN_PROGRESS':
      return l.projectStatusInProgress;
    case 'REVIEW':
      return l.projectsFilterReview;
    case 'COMPLETED':
      return l.projectStatusCompleted;
    case 'CANCELLED':
      return l.projectStatusCancelled;
    default:
      return code;
  }
}

const _statusColor = {
  'PROPOSAL_SENT': Color(0xFF6366F1),
  'IN_PROGRESS': Color(0xFF2563EB),
  'REVIEW': Color(0xFFD97706),
  'COMPLETED': Color(0xFF059669),
  'CANCELLED': Color(0xFFDC2626),
};

class ProjectsScreen extends ConsumerStatefulWidget {
  const ProjectsScreen({super.key});

  @override
  ConsumerState<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends ConsumerState<ProjectsScreen> {
  String? _selectedStatus;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final projectsAsync = ref.watch(projectsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.projectsTitle),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: _FilterBar(
            selected: _selectedStatus,
            onSelected: (status) {
              setState(() => _selectedStatus = status);
              ref.read(projectsProvider.notifier).refresh(status: status);
            },
          ),
        ),
      ),
      body: projectsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(e.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () =>
                    ref.read(projectsProvider.notifier).refresh(status: _selectedStatus),
                child: Text(l.buttonRetry),
              ),
            ],
          ),
        ),
        data: (projects) {
          final filtered = _selectedStatus == null
              ? projects
              : projects.where((p) => p.status == _selectedStatus).toList();

          if (filtered.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.work_outline, size: 48, color: Colors.grey[300]),
                  const SizedBox(height: 12),
                  Text(
                    l.projectsEmpty,
                    style: TextStyle(color: Colors.grey[500]),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () =>
                ref.read(projectsProvider.notifier).refresh(status: _selectedStatus),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
              itemCount: filtered.length,
              itemBuilder: (ctx, i) => _ProjectCard(project: filtered[i]),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/projects/new'),
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  final String? selected;
  final ValueChanged<String?> onSelected;

  const _FilterBar({required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Row(
        children: _statusFilterCodes.map((code) {
          final isActive = selected == code;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => onSelected(code),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: isActive
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _filterLabel(l, code),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: isActive
                        ? Colors.white
                        : Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final Project project;
  const _ProjectCard({required this.project});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final color = _statusColor[project.status] ?? Colors.grey;
    final label = projectStatusLabel(l, project.status);
    final totalMilestones = project.milestones.length;
    final doneMilestones = project.milestones
        .where((m) => m.status == 'PAYMENT_RECEIVED' || m.status == 'APPROVED')
        .length;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/projects/${project.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      project.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      label,
                      style: TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w600, color: color),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                project.customer.name,
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(
                    formatUZS(project.totalPrice),
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const Spacer(),
                  if (project.deadline != null)
                    Row(
                      children: [
                        Icon(Icons.calendar_today_outlined,
                            size: 13, color: Colors.grey[500]),
                        const SizedBox(width: 4),
                        Text(
                          DateFormat('d MMM').format(project.deadline!),
                          style: TextStyle(
                              color: Colors.grey[500], fontSize: 12),
                        ),
                      ],
                    ),
                  if (totalMilestones > 0) ...[
                    const SizedBox(width: 12),
                    Text(
                      l.projectsMilestoneCount(doneMilestones, totalMilestones),
                      style: TextStyle(
                          color: Colors.grey[500], fontSize: 12),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
