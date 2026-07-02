import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/icons/app_icon.dart';
import '../../core/models/staff.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_empty_state.dart';
import '../../shared/widgets/app_error_state.dart';
import '../../shared/widgets/app_spinner.dart';
import 'staff_provider.dart';

class StaffScreen extends ConsumerWidget {
  const StaffScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final staffAsync = ref.watch(staffProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.staffTitle),
      ),
      // One create affordance at a time (matches Customers): the empty-state CTA
      // shows when the list is empty, so the FAB appears ONLY when there is ≥1
      // staff member — never both at once. Staff is a pushed route (no nav
      // shell), so endFloat already clears the safe area.
      floatingActionButton: (staffAsync.valueOrNull?.isNotEmpty ?? false)
          ? FloatingActionButton(
              backgroundColor: t.accent,
              foregroundColor: t.accentOn,
              onPressed: () => context.push('/staff/new'),
              child: AppIcon(name: AppIconName.add, color: t.accentOn),
            )
          : null,
      body: staffAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => AppErrorState(
          error: e,
          onRetry: () => ref.read(staffProvider.notifier).refresh(),
        ),
        data: (staff) {
          if (staff.isEmpty) {
            return AppEmptyState(
              icon: AppIconName.staff,
              title: l.staffEmptyTitle,
              message: l.staffEmptyMessage,
              ctaLabel: l.staffEmptyCta,
              ctaIcon: AppIconName.add,
              onCta: () => context.push('/staff/new'),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.s4),
            itemCount: staff.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s2),
            itemBuilder: (ctx, i) {
              final member = staff[i];
              return _StaffCard(
                member: member,
                onTap: () => context.push('/staff/${member.id}'),
              );
            },
          );
        },
      ),
    );
  }
}

class _StaffCard extends StatelessWidget {
  final Staff member;
  final VoidCallback onTap;

  const _StaffCard({required this.member, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final serviceNames = member.services.isEmpty
        ? l.staffNoServices
        : member.services.map((s) => s.name).join(', ');

    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.s3),
      child: Row(
        children: [
          AppAvatar(name: member.name, size: AppAvatarSize.md),
          const SizedBox(width: AppSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.name,
                  style: TextStyle(
                    fontWeight: AppFontWeights.semibold,
                    fontSize: AppTextSizes.sm,
                    color: t.text1,
                  ),
                ),
                if (member.telegramHandle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    '@${member.telegramHandle}',
                    style: TextStyle(
                        color: t.text2, fontSize: AppTextSizes.caption),
                  ),
                ],
                const SizedBox(height: 2),
                Text(
                  serviceNames,
                  style:
                      TextStyle(color: t.text2, fontSize: AppTextSizes.caption),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
