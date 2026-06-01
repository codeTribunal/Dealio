import 'package:flutter/material.dart';

import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_input.dart';
import '../../shared/widgets/app_spinner.dart';
import '../../shared/widgets/app_stat_card.dart';
import '../../shared/widgets/hero_card.dart';
import '../../shared/widgets/quick_actions.dart';

/// Dev-only showcase of every Soft Depth core component.
/// Reached via `/design-components` (not linked in navigation).
class DesignComponentsScreen extends StatelessWidget {
  const DesignComponentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Core Components — Practical Soft Depth')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.s5),
        children: [
          // ── Buttons ─────────────────────────────────────────────────────
          const _Section('Buttons — variants'),
          Wrap(
            spacing: AppSpacing.s3,
            runSpacing: AppSpacing.s3,
            children: [
              AppButton(
                label: 'Primary',
                variant: AppButtonVariant.primary,
                onPressed: () {},
              ),
              AppButton(
                label: 'Secondary',
                variant: AppButtonVariant.secondary,
                onPressed: () {},
              ),
              AppButton(
                label: 'Ghost',
                variant: AppButtonVariant.ghost,
                onPressed: () {},
              ),
              AppButton(
                label: 'Danger',
                variant: AppButtonVariant.danger,
                onPressed: () {},
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          const _Section('Buttons — sizes, icons, loading, disabled'),
          Wrap(
            spacing: AppSpacing.s3,
            runSpacing: AppSpacing.s3,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              AppButton(
                label: 'Small',
                size: AppButtonSize.sm,
                leftIcon: AppIconName.add,
                onPressed: () {},
              ),
              AppButton(
                label: 'Medium',
                size: AppButtonSize.md,
                leftIcon: AppIconName.search,
                onPressed: () {},
              ),
              AppButton(
                label: 'Large',
                size: AppButtonSize.lg,
                rightIcon: AppIconName.growth,
                onPressed: () {},
              ),
              const AppButton(label: 'Loading', loading: true),
              const AppButton(label: 'Disabled', disabled: true),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          AppButton(
            label: 'Full width primary',
            fullWidth: true,
            leftIcon: AppIconName.paid,
            onPressed: () {},
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Cards ───────────────────────────────────────────────────────
          const _Section('Cards'),
          AppCard(
            child: Text(
              'Basic AppCard — surface, hairline border, soft shadow, xl radius.',
              style: TextStyle(color: t.text2),
            ),
          ),
          const SizedBox(height: AppSpacing.s3),
          AppCard(
            header: const AppCardHeader(
              title: 'Card with header',
              trailing: AppBadge(status: 'NEW', type: AppBadgeType.order),
            ),
            onTap: () {},
            child: Text(
              'Tappable card (press to see the subtle depress).',
              style: TextStyle(color: t.text2),
            ),
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Badges ──────────────────────────────────────────────────────
          const _Section('Badges — semantic colors (green / amber / red)'),
          const _BadgeRow('Order', [
            AppBadge(status: 'NEW', type: AppBadgeType.order),
            AppBadge(status: 'PREPARING', type: AppBadgeType.order),
            AppBadge(status: 'READY', type: AppBadgeType.order),
            AppBadge(status: 'DELIVERED', type: AppBadgeType.order),
            AppBadge(status: 'CANCELLED', type: AppBadgeType.order),
          ]),
          const _BadgeRow('Payment', [
            AppBadge(status: 'PENDING', type: AppBadgeType.payment),
            AppBadge(status: 'PAYMENT_RECEIVED', type: AppBadgeType.payment),
            AppBadge(status: 'CONFIRMED', type: AppBadgeType.payment),
          ]),
          const _BadgeRow('Appointment', [
            AppBadge(status: 'REQUESTED', type: AppBadgeType.appointment),
            AppBadge(status: 'CONFIRMED', type: AppBadgeType.appointment),
            AppBadge(status: 'COMPLETED', type: AppBadgeType.appointment),
            AppBadge(status: 'CANCELLED', type: AppBadgeType.appointment),
            AppBadge(status: 'NO_SHOW', type: AppBadgeType.appointment),
          ]),
          const _BadgeRow('Project', [
            AppBadge(status: 'PROPOSAL_SENT', type: AppBadgeType.project),
            AppBadge(status: 'IN_PROGRESS', type: AppBadgeType.project),
            AppBadge(status: 'REVIEW', type: AppBadgeType.project),
            AppBadge(status: 'COMPLETED', type: AppBadgeType.project),
            AppBadge(status: 'CANCELLED', type: AppBadgeType.project),
          ]),

          const SizedBox(height: AppSpacing.s6),

          // ── Inputs ──────────────────────────────────────────────────────
          const _Section('Inputs'),
          const AppTextField(
            label: 'Customer name',
            hint: 'e.g. Dilnoza',
            leftIcon: AppIconName.customers,
          ),
          const SizedBox(height: AppSpacing.s4),
          const AppTextArea(
            label: 'Notes',
            hint: 'Internal notes about this order…',
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Avatars ─────────────────────────────────────────────────────
          const _Section('Avatars'),
          const Row(
            children: [
              AppAvatar(name: 'Dilnoza Karimova', size: AppAvatarSize.sm),
              SizedBox(width: AppSpacing.s3),
              AppAvatar(name: 'Dilnoza Karimova', size: AppAvatarSize.md),
              SizedBox(width: AppSpacing.s3),
              AppAvatar(name: 'Dilnoza Karimova', size: AppAvatarSize.lg),
            ],
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Stat cards ──────────────────────────────────────────────────
          const _Section('Stat cards'),
          const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AppStatCard(
                  label: 'Orders today',
                  value: '12',
                  delta: '+3',
                ),
              ),
              SizedBox(width: AppSpacing.s3),
              Expanded(
                child: AppStatCard(
                  label: 'Revenue',
                  value: '1 250 000',
                  delta: '-5%',
                  money: true,
                ),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Quick actions ───────────────────────────────────────────────
          const _Section('Quick actions (neumorphic — depress on tap)'),
          QuickActions(
            items: [
              QuickActionItem(
                icon: AppIconName.add,
                label: 'New order',
                onTap: () {},
              ),
              QuickActionItem(
                icon: AppIconName.calendar,
                label: 'Book',
                onTap: () {},
              ),
              QuickActionItem(
                icon: AppIconName.customers,
                label: 'Customers',
                onTap: () {},
              ),
              QuickActionItem(
                icon: AppIconName.catalog,
                label: 'Catalog',
                onTap: () {},
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Hero card ───────────────────────────────────────────────────
          const _Section('Hero card'),
          const HeroCard(
            label: "Today's revenue",
            value: '1 250 000',
            sub: '12 orders · 3 pending payment',
          ),

          const SizedBox(height: AppSpacing.s6),

          // ── Spinner ─────────────────────────────────────────────────────
          const _Section('Spinner'),
          const Row(
            children: [
              AppSpinner(),
              SizedBox(width: AppSpacing.s4),
              AppSpinner(size: 32),
            ],
          ),

          const SizedBox(height: AppSpacing.s8),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String text;
  const _Section(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s3),
      child: Text(text, style: Theme.of(context).textTheme.headlineSmall),
    );
  }
}

class _BadgeRow extends StatelessWidget {
  final String label;
  final List<Widget> badges;
  const _BadgeRow(this.label, this.badges);

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: AppTextSizes.caption,
              fontWeight: AppFontWeights.semibold,
              color: t.text3,
            ),
          ),
          const SizedBox(height: AppSpacing.s2),
          Wrap(spacing: AppSpacing.s2, runSpacing: AppSpacing.s2, children: badges),
        ],
      ),
    );
  }
}
