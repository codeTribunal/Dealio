import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/icons/app_icon.dart';
import '../../core/models/service.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_empty_state.dart';
import '../../shared/widgets/app_spinner.dart';
import 'services_provider.dart';

class ServicesScreen extends ConsumerWidget {
  const ServicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final servicesAsync = ref.watch(servicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.servicesTitle),
      ),
      // Bottom-right create FAB, matching Customers/Appointments. Services is a
      // pushed route (no nav shell), so the default endFloat position already
      // clears the bottom safe-area inset — no extra offset needed. Hidden when
      // there are no services, so the empty-state "Add a service" CTA stands
      // alone (services has no search/filter, so empty == data-empty).
      floatingActionButton: (servicesAsync.valueOrNull?.isNotEmpty ?? false)
          ? FloatingActionButton(
              backgroundColor: t.accent,
              foregroundColor: t.accentOn,
              onPressed: () => context.push('/services/new'),
              child: AppIcon(name: AppIconName.add, color: t.accentOn),
            )
          : null,
      body: servicesAsync.when(
        // Keep the list visible during the refetch after a toggle, so the
        // switch animates instead of flashing the loading spinner.
        skipLoadingOnReload: true,
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(servicesProvider.notifier).refresh(),
        ),
        data: (services) {
          if (services.isEmpty) {
            return AppEmptyState(
              icon: AppIconName.catalog,
              title: l.servicesEmptyTitle,
              message: l.servicesEmptyMessage,
              ctaLabel: l.servicesEmptyCta,
              ctaIcon: AppIconName.add,
              onCta: () => context.push('/services/new'),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.s4),
            itemCount: services.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.s2),
            itemBuilder: (ctx, i) {
              final service = services[i];
              return _ServiceCard(
                service: service,
                onTap: () => context.push('/services/${service.id}'),
              );
            },
          );
        },
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final Service service;
  final VoidCallback onTap;

  const _ServiceCard({
    required this.service,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.s3),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  service.name,
                  style: TextStyle(
                    fontWeight: AppFontWeights.semibold,
                    fontSize: AppTextSizes.sm,
                    color: t.text1,
                  ),
                ),
                const SizedBox(height: AppSpacing.s1),
                Text(
                  '${l.durationMinutes(service.durationMinutes)} · ${formatUZS(service.price)}',
                  style: TextStyle(
                    color: t.text2,
                    fontSize: AppTextSizes.caption,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.s2),
          _ActiveBadge(active: service.active),
        ],
      ),
    );
  }
}

class _ActiveBadge extends StatelessWidget {
  final bool active;
  const _ActiveBadge({required this.active});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final bg = active ? t.successSoft : t.warningSoft;
    final fg = active ? t.successStrong : t.warningStrong;
    final label = active ? l.commonActive : l.commonPaused;
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.s2, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadii.pill),
      child: Text(
        label,
        style: TextStyle(
            fontSize: AppTextSizes.caption,
            fontWeight: AppFontWeights.semibold,
            color: fg),
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
