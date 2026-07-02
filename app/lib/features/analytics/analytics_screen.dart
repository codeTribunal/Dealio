import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/icons/app_icon.dart';
import '../../core/models/analytics.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_avatar.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_checkbox.dart';
import '../../shared/widgets/app_error_state.dart';
import '../../shared/widgets/app_spinner.dart';
import '../../shared/widgets/app_stat_card.dart';
import '../settings/email_consent_actions.dart';
import 'analytics_provider.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final analyticsAsync = ref.watch(analyticsProvider);
    // Watch the auth notifier so the email-capture card appears/disappears live
    // as the owner's email/dismiss state changes (setBusiness → notifyListeners).
    final business = ref.watch(authNotifierProvider).state?.business;
    final showEmailCard = business?.shouldPromptEmail ?? false;
    // Mode-aware presentation: appointment wording/cards only for SERVICES.
    // PRODUCTS/FREELANCE omit the appointments card + appointment-specific
    // labels (revenue/completed/top-customer math is unchanged).
    final isServices = (business?.mode ?? 'SERVICES') == 'SERVICES';

    return Scaffold(
      appBar: AppBar(title: Text(l.analyticsTitle)),
      body: analyticsAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => AppErrorState(
          error: e,
          onRetry: () => ref.read(analyticsProvider.notifier).refresh(),
        ),
        data: (data) => Stack(
          children: [
            RefreshIndicator(
              color: AppTokens.of(context).accent,
              onRefresh: () => ref.read(analyticsProvider.notifier).refresh(),
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.s4),
                children: [
                  _RevenueCard(data: data),
                  const SizedBox(height: AppSpacing.s4),
                  _QuickStatsRow(data: data, isServices: isServices),
                  const SizedBox(height: AppSpacing.s4),
                  _PendingPaymentsCard(data: data),
                  const SizedBox(height: AppSpacing.s4),
                  _TopCustomersCard(data: data, isServices: isServices),
                  const SizedBox(height: AppSpacing.s6),
                ],
              ),
            ),
            // Email-capture MODAL over the analytics: dimmed + blurred backdrop,
            // shown ONLY per the show-logic. Any dismiss (close, Skip, backdrop)
            // reveals the analytics underneath and closes live via the watched
            // authNotifier (setBusiness -> shouldPromptEmail becomes false).
            if (showEmailCard) const _EmailCaptureModal(),
          ],
        ),
      ),
    );
  }
}

// ── Revenue: HeroCard + this-vs-last token bars ──────────────────────

// Owner email-capture MODAL (analytics only). Never gates the data: it is
// mounted only per the show-logic (Business.shouldPromptEmail) and closes live
// via the watched authNotifierProvider. Dimmed + blurred backdrop; dismissible
// via the close control, Skip, or a backdrop tap (each records the dismissal).
// The card sits in a keyboard-safe scroll view so the email input stays visible
// when the on-screen keyboard opens (this route's Scaffold resizes to the space
// above the keyboard, and the card centers/scrolls within it). Consent is
// SEPARATE from the email and unchecked by default.
class _EmailCaptureModal extends ConsumerStatefulWidget {
  const _EmailCaptureModal();

  @override
  ConsumerState<_EmailCaptureModal> createState() => _EmailCaptureModalState();
}

class _EmailCaptureModalState extends ConsumerState<_EmailCaptureModal> {
  final _emailCtrl = TextEditingController();
  bool _consent = false;
  bool _saving = false;

  static final _emailRe = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
  bool get _valid => _emailRe.hasMatch(_emailCtrl.text.trim());

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _saving = true);
    try {
      await action();
      // On success the watched business updates and the parent rebuild removes
      // this modal — nothing else to do.
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.emailPromptError)),
      );
    }
  }

  Future<void> _save() async {
    if (!_valid) return;
    await _run(() => ref.read(emailConsentActionsProvider).saveEmailConsent(
          email: _emailCtrl.text.trim(),
          consent: _consent,
        ));
  }

  Future<void> _skip() =>
      _run(() => ref.read(emailConsentActionsProvider).dismissEmailPrompt());

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Stack(
        children: [
          // Dimmed + blurred backdrop; a tap dismisses (records the dismissal).
          Positioned.fill(
            child: GestureDetector(
              onTap: _saving ? null : _skip,
              behavior: HitTestBehavior.opaque,
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                child: Container(color: Colors.black.withValues(alpha: 0.4)),
              ),
            ),
          ),
          // Centered, keyboard-safe card. The scroll view fills the space above
          // the keyboard; the card centers there and scrolls if it is taller.
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.s4),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 440),
                        // Absorb taps so tapping the card does not hit the backdrop.
                        child: GestureDetector(
                          onTap: () {},
                          child: _card(context),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
          borderRadius: AppRadii.md,
          borderSide: BorderSide(color: c, width: w),
        );
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  l.emailPromptHeading,
                  style: TextStyle(
                    fontWeight: AppFontWeights.bold,
                    fontSize: AppTextSizes.base,
                    color: t.text1,
                  ),
                ),
              ),
              GestureDetector(
                onTap: _saving ? null : _skip,
                behavior: HitTestBehavior.opaque,
                child: Padding(
                  padding: const EdgeInsets.only(left: AppSpacing.s2),
                  child: AppIcon(
                      name: AppIconName.close, size: 20, color: t.text3),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s1),
          Text(
            l.emailPromptSubtext,
            style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
          ),
          const SizedBox(height: AppSpacing.s3),
          TextField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            enableSuggestions: false,
            style: TextStyle(color: t.text1),
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'you@example.com',
              hintStyle: TextStyle(color: t.text3),
              isDense: true,
              filled: true,
              fillColor: t.surface,
              border: border(t.border),
              enabledBorder: border(t.border),
              focusedBorder: border(t.accent, 2),
            ),
          ),
          const SizedBox(height: AppSpacing.s3),
          InkWell(
            onTap: _saving ? null : () => setState(() => _consent = !_consent),
            borderRadius: AppRadii.sm,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppCheckbox(
                  value: _consent,
                  onChanged:
                      _saving ? null : (v) => setState(() => _consent = v),
                ),
                const SizedBox(width: AppSpacing.s2),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      l.emailPromptConsent,
                      style:
                          TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s3),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              AppButton(
                label: l.emailPromptSkip,
                variant: AppButtonVariant.ghost,
                size: AppButtonSize.sm,
                onPressed: _saving ? null : _skip,
              ),
              const SizedBox(width: AppSpacing.s2),
              AppButton(
                label: l.buttonSave,
                variant: AppButtonVariant.primary,
                size: AppButtonSize.sm,
                loading: _saving,
                onPressed: (_saving || !_valid) ? null : _save,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RevenueCard extends StatelessWidget {
  final AnalyticsData data;
  const _RevenueCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final onAccent = t.accentOn;
    final change = data.revenueChangePercent;
    final isUp = change != null && change >= 0;
    final changeText = change == null
        ? l.analyticsNoDataLastMonth
        : l.analyticsVsLastMonth(
            '${isUp ? '+' : ''}${change.toStringAsFixed(1)}');

    // Bar widths relative to the larger of the two months.
    final maxRev = data.revenueThisMonth > data.revenueLastMonth
        ? data.revenueThisMonth
        : data.revenueLastMonth;
    double frac(int v) => maxRev <= 0 ? 0 : (v / maxRev).clamp(0.0, 1.0);

    final trend = data.revenueTrend;

    return Column(
      // Stretch so the hero (and comparison card) fill the width instead of
      // shrinking to their content — no more lonely centred card.
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Premium accent hero: label + delta chip, big value, sub line, and a
        // 6-month revenue sparkline (drawn in accent-on via the parent color).
        Container(
          decoration: BoxDecoration(
            color: t.accent,
            borderRadius: AppRadii.xl,
            boxShadow: t.shadowAccent,
          ),
          padding: const EdgeInsets.all(AppSpacing.s5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      l.analyticsRevenueThisMonth,
                      style: TextStyle(
                        fontSize: AppTextSizes.sm,
                        fontWeight: AppFontWeights.semibold,
                        color: onAccent.withValues(alpha: 0.85),
                      ),
                    ),
                  ),
                  if (change != null) ...[
                    const SizedBox(width: AppSpacing.s2),
                    _DeltaChip(change: change),
                  ],
                ],
              ),
              const SizedBox(height: AppSpacing.s2),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  formatUZS(data.revenueThisMonth),
                  maxLines: 1,
                  softWrap: false,
                  style: TextStyle(
                    fontSize: AppTextSizes.h1,
                    fontWeight: AppFontWeights.extra,
                    color: onAccent,
                    height: 1.1,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.s2),
              Text(
                changeText,
                style: TextStyle(
                  fontSize: AppTextSizes.sm,
                  color: onAccent.withValues(alpha: 0.90),
                ),
              ),
              // Sparkline only once there are at least two months to show a shape.
              if (trend.length > 1) ...[
                const SizedBox(height: AppSpacing.s4),
                _Sparkline(values: trend, color: onAccent),
                const SizedBox(height: AppSpacing.s2),
                Text(
                  l.analyticsLast6Months,
                  style: TextStyle(
                    fontSize: AppTextSizes.caption,
                    color: onAccent.withValues(alpha: 0.70),
                  ),
                ),
              ],
            ],
          ),
        ),
        // Only show the this-vs-last comparison once there's revenue to compare.
        // With both months at zero it would just repeat the hero's "0" beside
        // two empty bars, so the hero alone says it more clearly. The bar labels
        // are short periods ("This month" / "Last month") so the first bar isn't
        // a verbatim echo of the hero.
        if (maxRev > 0) ...[
          const SizedBox(height: AppSpacing.s3),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ComparisonBar(
                  label: l.analyticsThisMonthShort,
                  value: formatUZS(data.revenueThisMonth),
                  fraction: frac(data.revenueThisMonth),
                  color: t.accent,
                ),
                const SizedBox(height: AppSpacing.s3),
                _ComparisonBar(
                  label: l.analyticsLastMonthShort,
                  value: formatUZS(data.revenueLastMonth),
                  fraction: frac(data.revenueLastMonth),
                  color: t.text3,
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// Delta pill for the revenue hero: a trending arrow + absolute percent. Sits on
/// the accent hero, so positive uses an accent-on (light) chip with accent text
/// and negative a soft-error chip — both stay legible in light and dark.
class _DeltaChip extends StatelessWidget {
  final double change;
  const _DeltaChip({required this.change});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final up = change >= 0;
    final bg = up ? t.accentOn : t.errorSoft;
    final fg = up ? t.accent : t.errorStrong;
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.s2, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadii.pill),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            up ? Icons.trending_up_rounded : Icons.trending_down_rounded,
            size: 14,
            color: fg,
          ),
          const SizedBox(width: 3),
          Text(
            '${change.abs().toStringAsFixed(0)}%',
            style: TextStyle(
              color: fg,
              fontSize: AppTextSizes.caption,
              fontWeight: AppFontWeights.bold,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}

/// A minimal 6-bar revenue sparkline. Bars are drawn in [color] (the hero's
/// accent-on) with the current (last) month at full opacity and prior months
/// dimmed, so the eye lands on "now". Not a charting package — token-styled bars.
class _Sparkline extends StatelessWidget {
  final List<int> values;
  final Color color;
  const _Sparkline({required this.values, required this.color});

  @override
  Widget build(BuildContext context) {
    final maxV = values.fold<int>(1, (m, v) => v > m ? v : m);
    const barHeight = 48.0;
    final bars = <Widget>[];
    for (var i = 0; i < values.length; i++) {
      if (i > 0) bars.add(const SizedBox(width: 6));
      final frac = maxV <= 0 ? 0.06 : (values[i] / maxV).clamp(0.06, 1.0);
      final isCurrent = i == values.length - 1;
      bars.add(
        Expanded(
          child: Container(
            height: barHeight * frac,
            decoration: BoxDecoration(
              color: color.withValues(alpha: isCurrent ? 1.0 : 0.35),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(3)),
            ),
          ),
        ),
      );
    }
    return SizedBox(
      height: barHeight,
      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: bars),
    );
  }
}

/// A simple token-styled comparison bar (NOT a charting package).
class _ComparisonBar extends StatelessWidget {
  final String label;
  final String value;
  final double fraction;
  final Color color;
  const _ComparisonBar({
    required this.label,
    required this.value,
    required this.fraction,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                label.trim().isEmpty ? '—' : label,
                style:
                    TextStyle(fontSize: AppTextSizes.caption, color: t.text2),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Text(
              value,
              style: TextStyle(
                fontSize: AppTextSizes.caption,
                fontWeight: AppFontWeights.semibold,
                color: t.text1,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.s1),
        ClipRRect(
          borderRadius: AppRadii.pill,
          child: Stack(
            children: [
              Container(height: 8, color: t.surface2),
              FractionallySizedBox(
                widthFactor: fraction,
                child: Container(height: 8, color: color),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Quick stats row ──────────────────────────────────────────────────

class _QuickStatsRow extends StatelessWidget {
  final AnalyticsData data;
  final bool isServices;
  const _QuickStatsRow({required this.data, required this.isServices});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final completed = AppStatCard(
      label: l.analyticsCompletedThisMonth,
      value: data.completedThisMonth.toString(),
      icon: AppIconName.paid,
    );
    // PRODUCTS/FREELANCE: Completed only (no "Appointments: 0" card; the backend
    // exposes no orders-this-month count to swap in). SERVICES: both cards.
    if (!isServices) return completed;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: completed),
        const SizedBox(width: AppSpacing.s3),
        Expanded(
          child: AppStatCard(
            label: l.analyticsAppointmentsThisMonth,
            value: data.appointmentsThisMonth.toString(),
            icon: AppIconName.calendar,
          ),
        ),
      ],
    );
  }
}

// ── Pending payments card ────────────────────────────────────────────

class _PendingPaymentsCard extends StatelessWidget {
  final AnalyticsData data;
  const _PendingPaymentsCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final hasPending = data.pendingPaymentsTotal > 0;

    return AppCard(
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: hasPending ? t.warningSoft : t.surface2,
              borderRadius: AppRadii.md,
            ),
            child: AppIcon(
              name: AppIconName.pending,
              size: 20,
              color: hasPending ? t.warningStrong : t.text3,
            ),
          ),
          const SizedBox(width: AppSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l.analyticsPendingPayments,
                  style:
                      TextStyle(color: t.text2, fontSize: AppTextSizes.caption),
                ),
                const SizedBox(height: 2),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    hasPending
                        ? formatUZS(data.pendingPaymentsTotal)
                        : l.analyticsAllReceived,
                    maxLines: 1,
                    softWrap: false,
                    style: TextStyle(
                      fontWeight: AppFontWeights.bold,
                      fontSize: AppTextSizes.base,
                      color: hasPending ? t.warningStrong : t.text3,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Top customers card ───────────────────────────────────────────────

class _TopCustomersCard extends StatelessWidget {
  final AnalyticsData data;
  final bool isServices;
  const _TopCustomersCard({required this.data, required this.isServices});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    // Scale for the spend bars — relative to the top spender.
    final maxSpent = data.topCustomers
        .fold<int>(1, (m, c) => c.totalSpent > m ? c.totalSpent : m);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCardHeader(title: l.analyticsTopCustomers),
          const SizedBox(height: AppSpacing.s3),
          if (data.topCustomers.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.s3),
                child: Text(
                  l.analyticsNoConfirmedOrders,
                  style: TextStyle(color: t.text3, fontSize: AppTextSizes.sm),
                ),
              ),
            )
          else
            ...data.topCustomers.asMap().entries.map(
                  (entry) => _TopCustomerRow(
                    rank: entry.key + 1,
                    customer: entry.value,
                    isServices: isServices,
                    maxSpent: maxSpent,
                    onTap: () => context.push('/customers/${entry.value.id}'),
                  ),
                ),
        ],
      ),
    );
  }
}

class _TopCustomerRow extends StatelessWidget {
  final int rank;
  final TopCustomer customer;
  final bool isServices;
  final int maxSpent;
  final VoidCallback onTap;

  const _TopCustomerRow({
    required this.rank,
    required this.customer,
    required this.isServices,
    required this.maxSpent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final isTop = rank == 1;
    final frac =
        maxSpent <= 0 ? 0.0 : (customer.totalSpent / maxSpent).clamp(0.04, 1.0);

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadii.sm,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
        child: Row(
          children: [
            SizedBox(
              width: 20,
              child: Text(
                '$rank',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: AppTextSizes.sm,
                  fontWeight: AppFontWeights.bold,
                  // Rank 1 pops in accent; the rest stay quiet.
                  color: isTop ? t.accent : t.text3,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.s2),
            AppAvatar(name: customer.name, size: AppAvatarSize.sm),
            const SizedBox(width: AppSpacing.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          customer.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontWeight: AppFontWeights.medium,
                              fontSize: AppTextSizes.sm,
                              color: t.text1),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.s2),
                      Text(
                        formatUZS(customer.totalSpent),
                        style: TextStyle(
                          fontWeight: AppFontWeights.bold,
                          fontSize: AppTextSizes.sm,
                          color: t.text1,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Spend bar — proportional to the top spender; #1 in accent.
                  ClipRRect(
                    borderRadius: AppRadii.pill,
                    child: Stack(
                      children: [
                        Container(height: 6, color: t.surface2),
                        FractionallySizedBox(
                          widthFactor: frac,
                          child: Container(
                            height: 6,
                            color: isTop ? t.accent : t.borderStrong,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Appointment count is meaningful only for SERVICES (the
                  // count excludes orders). Omit it otherwise; spend still shows.
                  if (isServices) ...[
                    const SizedBox(height: 4),
                    Text(
                      l.analyticsApptCount(customer.appointmentCount),
                      style: TextStyle(
                          color: t.text3, fontSize: AppTextSizes.caption),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Error view ───────────────────────────────────────────────────────
