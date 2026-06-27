import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/icons/app_icon.dart';
import '../../core/models/project.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_empty_state.dart';
import '../../shared/widgets/app_spinner.dart';
import '../../shared/widgets/floating_tab_bar.dart';
import 'projects_provider.dart';

const _statusFilterCodes = [
  null,
  'PROPOSAL_SENT',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
  'CANCELLED'
];

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
    final t = AppTokens.of(context);
    final projectsAsync = ref.watch(projectsProvider);

    // Records currently shown (after the status filter). Drives the FAB so it is
    // mutually exclusive with the empty-state CTA: data-empty shows the long
    // "Create your first project" CTA, filter-empty shows "Clear filter", and
    // only a non-empty list shows the bottom-right + FAB.
    final visibleProjects = projectsAsync.valueOrNull ?? const [];
    final hasVisibleProjects = (_selectedStatus == null
            ? visibleProjects
            : visibleProjects.where((p) => p.status == _selectedStatus))
        .isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: Text(l.projectsTitle),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
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
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: () =>
              ref.read(projectsProvider.notifier).refresh(status: _selectedStatus),
        ),
        data: (projects) {
          final filtered = _selectedStatus == null
              ? projects
              : projects.where((p) => p.status == _selectedStatus).toList();

          if (filtered.isEmpty) {
            // Data-empty (no projects) vs filter-empty (status matched none).
            if (projects.isEmpty) {
              return AppEmptyState(
                icon: AppIconName.projects,
                title: l.projectsEmpty,
                message: l.projectsEmptyMessage,
                ctaLabel: l.projectsEmptyCta,
                ctaIcon: AppIconName.add,
                onCta: () => context.push('/projects/new'),
              );
            }
            return AppEmptyState(
              icon: AppIconName.projects,
              title: l.projectsFilterEmpty,
              ctaLabel: l.emptyClearFilter,
              onCta: () {
                setState(() => _selectedStatus = null);
                ref.read(projectsProvider.notifier).refresh(status: null);
              },
            );
          }

          return RefreshIndicator(
            color: t.accent,
            onRefresh: () => ref
                .read(projectsProvider.notifier)
                .refresh(status: _selectedStatus),
            child: ListView.separated(
              padding: EdgeInsets.fromLTRB(AppSpacing.s4, AppSpacing.s3,
                  AppSpacing.s4,
                  AppSpacing.s6 + MediaQuery.of(context).padding.bottom),
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s2),
              itemBuilder: (ctx, i) => _ProjectCard(project: filtered[i]),
            ),
          );
        },
      ),
      // Bottom-right create FAB, matching Customers/Appointments. Projects is a
      // tab root inside the nav shell, so lift it above the floating bar. Hidden
      // when the visible list is empty so it never doubles the empty-state CTA.
      floatingActionButton: !hasVisibleProjects
          ? null
          : Padding(
              padding:
                  const EdgeInsets.only(bottom: FloatingTabBar.reservedHeight),
              child: FloatingActionButton(
                backgroundColor: t.accent,
                foregroundColor: t.accentOn,
                onPressed: () => context.push('/projects/new'),
                child: AppIcon(name: AppIconName.add, color: t.accentOn),
              ),
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
    final t = AppTokens.of(context);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s4, vertical: AppSpacing.s2),
      child: Row(
        children: _statusFilterCodes.map((code) {
          final isActive = selected == code;
          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.s2),
            child: GestureDetector(
              onTap: () => onSelected(code),
              child: AnimatedContainer(
                duration: AppMotion.durFast,
                curve: AppMotion.ease,
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.s4, vertical: AppSpacing.s2),
                decoration: BoxDecoration(
                  color: isActive ? t.accentSoft : t.surface,
                  borderRadius: AppRadii.pill,
                  border: Border.all(color: isActive ? t.accent : t.border),
                ),
                child: Text(
                  _filterLabel(l, code),
                  style: TextStyle(
                    fontSize: AppTextSizes.sm,
                    fontWeight: AppFontWeights.semibold,
                    color: isActive ? t.accent : t.text2,
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
    final t = AppTokens.of(context);
    final totalMilestones = project.milestones.length;
    final doneMilestones = project.milestones
        .where((m) => m.status == 'PAYMENT_RECEIVED' || m.status == 'APPROVED')
        .length;

    return AppCard(
      onTap: () => context.push('/projects/${project.id}'),
      padding: const EdgeInsets.all(AppSpacing.s4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  project.name,
                  style: TextStyle(
                    fontWeight: AppFontWeights.bold,
                    fontSize: AppTextSizes.sm,
                    color: t.text1,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              AppBadge(status: project.status, type: AppBadgeType.project),
            ],
          ),
          const SizedBox(height: AppSpacing.s1),
          Text(
            project.customer.name,
            style: TextStyle(color: t.text2, fontSize: AppTextSizes.caption),
          ),
          const SizedBox(height: AppSpacing.s3),
          Row(
            children: [
              Text(
                formatUZS(project.totalPrice),
                style: TextStyle(
                  fontWeight: AppFontWeights.bold,
                  fontSize: AppTextSizes.sm,
                  color: t.text1,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              const Spacer(),
              if (project.deadline != null)
                Row(
                  children: [
                    AppIcon(
                        name: AppIconName.calendar, size: 13, color: t.text3),
                    const SizedBox(width: AppSpacing.s1),
                    Text(
                      DateFormat('d MMM').format(project.deadline!),
                      style: TextStyle(
                          color: t.text3, fontSize: AppTextSizes.caption),
                    ),
                  ],
                ),
              if (totalMilestones > 0) ...[
                const SizedBox(width: AppSpacing.s3),
                Text(
                  l.projectsMilestoneCount(doneMilestones, totalMilestones),
                  style: TextStyle(
                      color: t.text3, fontSize: AppTextSizes.caption),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.s5),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(name: AppIconName.close, size: 48, color: t.errorStrong),
            const SizedBox(height: AppSpacing.s3),
            Text(message,
                textAlign: TextAlign.center,
                style: TextStyle(color: t.text2)),
            const SizedBox(height: AppSpacing.s4),
            AppButton(
              label: l.buttonRetry,
              variant: AppButtonVariant.secondary,
              size: AppButtonSize.sm,
              onPressed: onRetry,
            ),
          ],
        ),
      ),
    );
  }
}
