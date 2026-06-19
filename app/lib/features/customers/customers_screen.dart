import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/icons/app_icon.dart';
import '../../core/models/customer.dart' show Customer, CustomerStage;
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_spinner.dart';
import 'customers_provider.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  final _searchController = TextEditingController();
  String? _restoringId;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _restore(String id) async {
    setState(() => _restoringId = id);
    try {
      await ref.read(customersProvider.notifier).restore(id);
    } finally {
      if (mounted) setState(() => _restoringId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final notifier = ref.read(customersProvider.notifier);
    final customersAsync = ref.watch(customersProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.customersTitle),
        actions: [
          TextButton(
            onPressed: () => notifier.setShowDeleted(!notifier.showDeleted),
            style: TextButton.styleFrom(
              foregroundColor: notifier.showDeleted ? t.accent : t.text2,
            ),
            child: Text(l.commonShowDeleted),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Search bar ────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSpacing.s4, AppSpacing.s3, AppSpacing.s4, AppSpacing.s3),
            child: Container(
              decoration: BoxDecoration(
                color: t.surface,
                borderRadius: AppRadii.md,
                border: Border.all(color: t.border),
                boxShadow: t.shadowSm,
              ),
              child: TextField(
                controller: _searchController,
                style: TextStyle(fontSize: AppTextSizes.base, color: t.text1),
                decoration: InputDecoration(
                  hintText: l.customersSearchHint,
                  hintStyle:
                      TextStyle(fontSize: AppTextSizes.base, color: t.text3),
                  prefixIcon: Padding(
                    padding: const EdgeInsets.only(
                        left: AppSpacing.s4, right: AppSpacing.s2),
                    child: AppIcon(
                        name: AppIconName.search, size: 20, color: t.text2),
                  ),
                  prefixIconConstraints:
                      const BoxConstraints(minWidth: 0, minHeight: 0),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: AppIcon(
                              name: AppIconName.close, size: 18, color: t.text2),
                          onPressed: () {
                            _searchController.clear();
                            notifier.setSearch('');
                            setState(() {});
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.s4, vertical: AppSpacing.s3),
                ),
                onChanged: (v) {
                  notifier.setSearch(v);
                  setState(() {});
                },
              ),
            ),
          ),

          // ── Customer list ─────────────────────────────────────
          Expanded(
            child: customersAsync.when(
              loading: () => const Center(child: AppSpinner(size: 32)),
              error: (e, _) => _ErrorView(
                message: e.toString(),
                onRetry: notifier.refresh,
              ),
              data: (_) {
                final customers = notifier.filteredCustomers;
                if (customers.isEmpty) {
                  return _EmptyView(
                    hasFilter: _searchController.text.isNotEmpty,
                  );
                }
                return RefreshIndicator(
                  color: t.accent,
                  onRefresh: notifier.refresh,
                  child: ListView.separated(
                    padding: EdgeInsets.fromLTRB(AppSpacing.s4, 0, AppSpacing.s4,
                        AppSpacing.s4 + MediaQuery.of(context).padding.bottom),
                    itemCount: customers.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSpacing.s2),
                    itemBuilder: (ctx, i) {
                      final c = customers[i];
                      if (c.deleted) {
                        return _DeletedCustomerCard(
                          customer: c,
                          restoring: _restoringId == c.id,
                          onRestore: () => _restore(c.id),
                        );
                      }
                      return _CustomerCard(
                        customer: c,
                        onTap: () => context.push('/customers/${c.id}'),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Customer card ───────────────────────────────────────────────────

class _CustomerCard extends StatelessWidget {
  final Customer customer;
  final VoidCallback onTap;
  const _CustomerCard({required this.customer, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.s3),
      child: Row(
        children: [
          AppAvatar(name: customer.name, size: AppAvatarSize.md),
          const SizedBox(width: AppSpacing.s3),

          // Name + handle + stage
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  customer.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: AppFontWeights.semibold,
                    fontSize: AppTextSizes.sm,
                    color: t.text1,
                  ),
                ),
                if (customer.telegramUsername != null)
                  Text(
                    '@${customer.telegramUsername}',
                    style: TextStyle(
                        color: t.text2, fontSize: AppTextSizes.caption),
                  )
                else if (customer.phone != null)
                  Text(
                    customer.phone!,
                    style: TextStyle(
                        color: t.text2, fontSize: AppTextSizes.caption),
                  ),
                if (customer.currentStage != null) ...[
                  const SizedBox(height: AppSpacing.s1),
                  StagePill(stage: customer.currentStage!),
                ],
              ],
            ),
          ),

          const SizedBox(width: AppSpacing.s2),

          // Stats
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                l.homeOrdersCount(customer.orderCount),
                style: TextStyle(
                  fontWeight: AppFontWeights.medium,
                  fontSize: AppTextSizes.caption,
                  color: t.text1,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                formatDate(customer.lastInteractionAt),
                style:
                    TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Deleted customer card (dimmed, with restore) ───────────────────

class _DeletedCustomerCard extends StatelessWidget {
  final Customer customer;
  final bool restoring;
  final VoidCallback onRestore;
  const _DeletedCustomerCard({
    required this.customer,
    required this.restoring,
    required this.onRestore,
  });

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Opacity(
      opacity: 0.6,
      child: AppCard(
        padding: const EdgeInsets.all(AppSpacing.s3),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          customer.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontWeight: AppFontWeights.semibold,
                            fontSize: AppTextSizes.sm,
                            color: t.text1,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.s2),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.s2, vertical: 2),
                        decoration: BoxDecoration(
                          color: t.errorSoft,
                          borderRadius: AppRadii.pill,
                        ),
                        child: Text(
                          l.commonDeletedBadge,
                          style: TextStyle(
                            fontSize: AppTextSizes.caption,
                            fontWeight: AppFontWeights.semibold,
                            color: t.errorStrong,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (customer.telegramUsername != null)
                    Text(
                      '@${customer.telegramUsername}',
                      style: TextStyle(
                          color: t.text2, fontSize: AppTextSizes.caption),
                    ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.s2),
            AppButton(
              label: l.buttonRestore,
              variant: AppButtonVariant.secondary,
              size: AppButtonSize.sm,
              loading: restoring,
              onPressed: onRestore,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Stage pill (shared; preserves the user-picked stage color) ──────

class StagePill extends StatelessWidget {
  final CustomerStage stage;
  const StagePill({super.key, required this.stage});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    Color color;
    try {
      color =
          Color(int.parse('FF${stage.color.replaceFirst('#', '')}', radix: 16));
    } catch (_) {
      color = t.accent;
    }
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.s2, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: AppRadii.pill,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: AppSpacing.s1),
          Text(
            stage.name,
            style: TextStyle(
              fontSize: AppTextSizes.caption,
              fontWeight: AppFontWeights.semibold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Empty / error ───────────────────────────────────────────────────

class _EmptyView extends StatelessWidget {
  final bool hasFilter;
  const _EmptyView({required this.hasFilter});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppIcon(name: AppIconName.customers, size: 56, color: t.text3),
          const SizedBox(height: AppSpacing.s3),
          Text(
            hasFilter ? l.customersEmptyFiltered : l.customersEmpty,
            style: TextStyle(color: t.text2),
          ),
          if (!hasFilter) ...[
            const SizedBox(height: AppSpacing.s1),
            Text(
              l.customersEmptyHint,
              style: TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
              textAlign: TextAlign.center,
            ),
          ],
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
