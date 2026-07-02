import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';

/// Account / profile page. Reached from the avatar in the Home app bar (which
/// replaced the redundant Settings gear). Shows the owner's identity and
/// account actions; full business configuration still lives in /settings.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final auth = ref.watch(authNotifierProvider);
    final business = auth.state?.business;
    final phone = auth.phone;

    return Scaffold(
      appBar: AppBar(title: Text(l.profileTitle)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.s4),
        children: [
          // Identity
          AppCard(
            child: Row(
              children: [
                AppAvatar(name: business?.name ?? 'CRM', size: AppAvatarSize.lg),
                const SizedBox(width: AppSpacing.s4),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        business?.name ?? '—',
                        style: TextStyle(
                            fontWeight: AppFontWeights.bold,
                            fontSize: AppTextSizes.lg,
                            color: t.text1),
                      ),
                      if (business?.description != null &&
                          business!.description!.isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.s1),
                        Text(
                          business.description!,
                          style: TextStyle(
                              color: t.text2, fontSize: AppTextSizes.sm),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s3),

          // Account details
          AppCard(
            child: Column(
              children: [
                _InfoRow(
                  icon: AppIconName.customers,
                  label: l.profilePhoneLabel,
                  value: phone ?? '—',
                ),
                Divider(height: AppSpacing.s4, color: t.border),
                _InfoRow(
                  icon: AppIconName.paid,
                  label: l.profilePlanLabel,
                  value: business?.plan ?? 'FREE',
                ),
                if (business?.botUsername != null) ...[
                  Divider(height: AppSpacing.s4, color: t.border),
                  _InfoRow(
                    icon: AppIconName.inbox,
                    label: l.settingsTelegramBot,
                    value: '@${business!.botUsername}',
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s3),

          // Link to full business settings
          AppCard(
            onTap: () => context.go('/settings'),
            child: Row(
              children: [
                AppIcon(name: AppIconName.settings, size: 20, color: t.text2),
                const SizedBox(width: AppSpacing.s3),
                Expanded(
                  child: Text(
                    l.profileBusinessSettings,
                    style: TextStyle(
                        fontSize: AppTextSizes.base,
                        fontWeight: AppFontWeights.medium,
                        color: t.text1),
                  ),
                ),
                Icon(Icons.chevron_right, size: 20, color: t.text3),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s5),

          // Log out
          AppButton(
            label: l.settingsLogOut,
            variant: AppButtonVariant.secondary,
            leftIcon: AppIconName.logout,
            fullWidth: true,
            onPressed: () async {
              await ref.read(authNotifierProvider).logout();
              if (context.mounted) context.go('/welcome');
            },
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final AppIconName icon;
  final String label;
  final String value;
  const _InfoRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    // One Expanded value (not Spacer + Flexible): the value Text fills ALL the
    // space after icon+label and right-aligns within it, so every row's value —
    // short ones like "FREE" included — shares the exact right edge. (Spacer +
    // loose Flexible split the free space by flex, leaving short values short of
    // the edge.) crossAxisAlignment.center keeps label and value on one line.
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        AppIcon(name: icon, size: 18, color: t.text3),
        const SizedBox(width: AppSpacing.s3),
        Text(label, style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm)),
        const SizedBox(width: AppSpacing.s3),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
                color: t.text1,
                fontSize: AppTextSizes.sm,
                fontWeight: AppFontWeights.medium),
          ),
        ),
      ],
    );
  }
}
