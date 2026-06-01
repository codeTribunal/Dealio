import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/icons/app_icon.dart';
import '../../core/models/staff.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
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
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.s3),
            child: Center(
              child: AppButton(
                label: l.staffFormNewTitle,
                leftIcon: AppIconName.add,
                size: AppButtonSize.sm,
                onPressed: () => context.push('/staff/new'),
              ),
            ),
          ),
        ],
      ),
      body: staffAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(staffProvider.notifier).refresh(),
        ),
        data: (staff) {
          if (staff.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppIcon(name: AppIconName.staff, size: 56, color: t.text3),
                  const SizedBox(height: AppSpacing.s3),
                  Text(l.staffEmpty, style: TextStyle(color: t.text2)),
                ],
              ),
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
                  style: TextStyle(
                      color: t.text2, fontSize: AppTextSizes.caption),
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
