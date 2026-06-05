import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/api/api_service.dart';
import '../../core/icons/app_icon.dart';
import '../../core/locale/locale_provider.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_spinner.dart';
import 'onboarding_provider.dart';

class OnboardingScreen extends ConsumerWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(onboardingProvider);

    // Navigate to home once completed
    ref.listen(onboardingProvider, (prev, next) async {
      if (next.completed && !(prev?.completed ?? false)) {
        // Fetch the fresh business record and update auth state
        try {
          final business = await ref.read(apiServiceProvider).getBusiness();
          ref.read(authNotifierProvider).setBusiness(business);
        } catch (_) {
          // Best-effort; the router will fetch on next app start
        }
      }
    });

    if (state.completed) {
      return _DoneStep(
        botUsername: state.botUsername,
        botLink: state.botLink,
      );
    }

    return PopScope(
      canPop: state.step == 1,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && state.step > 1) {
          ref.read(onboardingProvider.notifier).setStep(state.step - 1);
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              if (state.step < 5) _ProgressBar(step: state.step),
              Expanded(
                child: AnimatedSwitcher(
                  duration: AppMotion.durSlow,
                  child: KeyedSubtree(
                    key: ValueKey(state.step),
                    child: _stepWidget(state.step),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _stepWidget(int step) {
    switch (step) {
      case 1:
        return const _Step1Business();
      case 2:
        return const _Step2Bot();
      case 3:
        return const _Step3Payment();
      case 4:
        return const _Step4Review();
      default:
        return const SizedBox.shrink();
    }
  }
}

// ── Progress bar ─────────────────────────────────────────────────────────────

class _ProgressBar extends StatelessWidget {
  final int step;
  const _ProgressBar({required this.step});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.s5, AppSpacing.s4, AppSpacing.s5, 0),
      child: Row(
        children: List.generate(4, (i) {
          final active = i < step;
          return Expanded(
            child: Container(
              height: 4,
              margin: EdgeInsets.only(right: i < 3 ? AppSpacing.s1 : 0),
              decoration: BoxDecoration(
                color: active ? t.accent : t.border,
                borderRadius: AppRadii.pill,
              ),
            ),
          );
        }),
      ),
    );
  }
}

// ── Step 1 — Business details ─────────────────────────────────────────────────

class _Step1Business extends ConsumerStatefulWidget {
  const _Step1Business();

  @override
  ConsumerState<_Step1Business> createState() => _Step1BusinessState();
}

class _Step1BusinessState extends ConsumerState<_Step1Business> {
  final _nameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _nameController.text = ref.read(onboardingProvider).businessName;
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _selectLanguage(String enumValue) {
    ref.read(onboardingProvider.notifier).setLanguage(enumValue);
    // Update the app UI language immediately to match the chosen business language.
    ref
        .read(localeProvider.notifier)
        .setLocale(LocaleNotifier.enumToCode(enumValue));
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final state = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);

    // mode is always set (scalar, defaults to SERVICES), so only the name gates.
    final canContinue = state.businessName.trim().isNotEmpty;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.s4),
          Text(
            l.onboardingSetupTitle,
            style: TextStyle(
              fontSize: AppTextSizes.h3,
              fontWeight: AppFontWeights.bold,
              color: t.text1,
            ),
          ),
          const SizedBox(height: AppSpacing.s1),
          Text(
            l.onboardingBusinessStepTitle,
            style: TextStyle(fontSize: AppTextSizes.base, color: t.text2),
          ),
          const SizedBox(height: AppSpacing.s6),
          TextField(
            controller: _nameController,
            style: TextStyle(color: t.text1),
            decoration: _decoration(context,
                label: l.onboardingBusinessNameLabel,
                hint: l.onboardingBusinessNameHint),
            onChanged: notifier.setBusinessName,
          ),
          const SizedBox(height: AppSpacing.s5),
          _FieldLabel(l.onboardingBusinessType),
          const SizedBox(height: AppSpacing.s2),
          // Product-seller mode disabled — only SERVICES/FREELANCE are offered.
          _ModeCard(
            icon: AppIconName.calendar,
            title: l.onboardingModeServicesTitle,
            subtitle: l.onboardingModeServicesSubtitle,
            selected: state.mode == 'SERVICES',
            onTap: () => notifier.toggleMode('SERVICES'),
          ),
          const SizedBox(height: AppSpacing.s2),
          _ModeCard(
            icon: AppIconName.projects,
            title: l.onboardingModeFreelanceTitle,
            subtitle: l.onboardingModeFreelanceSubtitle,
            selected: state.mode == 'FREELANCE',
            onTap: () => notifier.toggleMode('FREELANCE'),
          ),
          const SizedBox(height: AppSpacing.s5),
          _FieldLabel(l.onboardingLanguageLabel),
          const SizedBox(height: AppSpacing.s2),
          Row(
            children: [
              Expanded(
                child: _ToggleButton(
                  label: "O'zbek",
                  selected: state.language == 'UZBEK',
                  onTap: () => _selectLanguage('UZBEK'),
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              Expanded(
                child: _ToggleButton(
                  label: 'Русский',
                  selected: state.language == 'RUSSIAN',
                  onTap: () => _selectLanguage('RUSSIAN'),
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              Expanded(
                child: _ToggleButton(
                  label: 'English',
                  selected: state.language == 'ENGLISH',
                  onTap: () => _selectLanguage('ENGLISH'),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s6),
          AppButton(
            label: l.buttonContinue,
            fullWidth: true,
            onPressed: canContinue
                ? () => ref.read(onboardingProvider.notifier).setStep(2)
                : null,
          ),
        ],
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  final AppIconName icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _ModeCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AppMotion.durFast,
        curve: AppMotion.ease,
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.s4, vertical: AppSpacing.s3),
        decoration: BoxDecoration(
          color: selected ? t.accentSoft : t.surface,
          border: Border.all(
            color: selected ? t.accent : t.border,
            width: selected ? 2 : 1,
          ),
          borderRadius: AppRadii.lg,
        ),
        child: Row(
          children: [
            AppIcon(name: icon, size: 22, color: selected ? t.accent : t.text2),
            const SizedBox(width: AppSpacing.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: TextStyle(
                          fontWeight: AppFontWeights.semibold,
                          color: selected ? t.accent : t.text1)),
                  Text(subtitle,
                      style: TextStyle(
                          fontSize: AppTextSizes.caption, color: t.text2)),
                ],
              ),
            ),
            if (selected)
              AppIcon(name: AppIconName.paid, color: t.accent, size: 20),
          ],
        ),
      ),
    );
  }
}

class _ToggleButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _ToggleButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AppMotion.durFast,
        curve: AppMotion.ease,
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.s3),
        decoration: BoxDecoration(
          color: selected ? t.accentSoft : t.surface,
          border: Border.all(color: selected ? t.accent : t.border),
          borderRadius: AppRadii.md,
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
                fontWeight: AppFontWeights.semibold,
                color: selected ? t.accent : t.text2),
          ),
        ),
      ),
    );
  }
}

// ── Step 2 — Telegram bot setup ───────────────────────────────────────────────

class _Step2Bot extends ConsumerStatefulWidget {
  const _Step2Bot();

  @override
  ConsumerState<_Step2Bot> createState() => _Step2BotState();
}

class _Step2BotState extends ConsumerState<_Step2Bot> {
  final _tokenController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tokenController.text = ref.read(onboardingProvider).botToken;
  }

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final state = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                icon: AppIcon(name: AppIconName.menu, color: t.text1),
                onPressed: () => notifier.setStep(1),
              ),
              const SizedBox(width: AppSpacing.s1),
              Text(l.onboardingBotHeader,
                  style: TextStyle(
                      fontSize: AppTextSizes.lg,
                      fontWeight: AppFontWeights.bold,
                      color: t.text1)),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          Text(l.onboardingBotCreateTitle,
              style: TextStyle(
                  fontSize: AppTextSizes.lg,
                  fontWeight: AppFontWeights.bold,
                  color: t.text1)),
          const SizedBox(height: AppSpacing.s1),
          Text(l.onboardingBotCreateSubtitle,
              style: TextStyle(fontSize: AppTextSizes.base, color: t.text2)),
          const SizedBox(height: AppSpacing.s5),
          AppCard(
            child: Column(
              children: _instructions(context, l),
            ),
          ),
          const SizedBox(height: AppSpacing.s5),
          _FieldLabel(l.onboardingBotPasteToken),
          const SizedBox(height: AppSpacing.s2),
          TextField(
            controller: _tokenController,
            style: TextStyle(color: t.text1),
            decoration: _decoration(
              context,
              hint: '1234567890:AAHxyz...',
              errorText: state.tokenError,
            ),
            onChanged: notifier.setBotToken,
          ),
          const SizedBox(height: AppSpacing.s4),
          if (!state.tokenVerified) ...[
            AppButton(
              label: l.onboardingVerifyToken,
              fullWidth: true,
              loading: state.verifyingToken,
              onPressed: state.verifyingToken || state.botToken.isEmpty
                  ? null
                  : notifier.verifyBotToken,
            ),
          ] else ...[
            Row(
              children: [
                AppIcon(
                    name: AppIconName.paid, color: t.successStrong, size: 22),
                const SizedBox(width: AppSpacing.s2),
                Expanded(
                  child: Text(l.onboardingBotReady(state.botUsername),
                      style: TextStyle(
                          color: t.successStrong,
                          fontWeight: AppFontWeights.semibold)),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.s4),
            AppButton(
              label: l.buttonContinue,
              fullWidth: true,
              onPressed: state.tokenVerified ? () => notifier.setStep(3) : null,
            ),
          ],
        ],
      ),
    );
  }

  List<Widget> _instructions(BuildContext context, AppLocalizations l) {
    final t = AppTokens.of(context);
    final steps = [
      l.onboardingBotStep1,
      l.onboardingBotStep2,
      l.onboardingBotStep3,
      l.onboardingBotStep4,
      l.onboardingBotStep5,
    ];
    return steps.indexed.map((entry) {
      final (i, text) = entry;
      return Padding(
        padding: EdgeInsets.only(bottom: i < steps.length - 1 ? AppSpacing.s3 : 0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: t.accent,
                shape: BoxShape.circle,
              ),
              child: Text('${i + 1}',
                  style: TextStyle(
                      color: t.accentOn,
                      fontSize: AppTextSizes.caption,
                      fontWeight: AppFontWeights.bold)),
            ),
            const SizedBox(width: AppSpacing.s3),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: AppSpacing.s1),
                child: Text(text,
                    style:
                        TextStyle(fontSize: AppTextSizes.sm, color: t.text1)),
              ),
            ),
          ],
        ),
      );
    }).toList();
  }
}

// ── Step 3 — Payment method ───────────────────────────────────────────────────

class _Step3Payment extends ConsumerStatefulWidget {
  const _Step3Payment();

  @override
  ConsumerState<_Step3Payment> createState() => _Step3PaymentState();
}

class _Step3PaymentState extends ConsumerState<_Step3Payment> {
  final _cardController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _cardController.text = ref.read(onboardingProvider).cardNumber;
  }

  @override
  void dispose() {
    _cardController.dispose();
    super.dispose();
  }

  String _formatCard(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    final groups = <String>[];
    for (var i = 0; i < digits.length && i < 16; i += 4) {
      groups.add(digits.substring(i, (i + 4).clamp(0, digits.length)));
    }
    return groups.join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final state = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);

    void goNext() => notifier.setStep(4);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                icon: AppIcon(name: AppIconName.menu, color: t.text1),
                onPressed: () => notifier.setStep(2),
              ),
              const SizedBox(width: AppSpacing.s1),
              Text(l.onboardingPaymentHeader,
                  style: TextStyle(
                      fontSize: AppTextSizes.lg,
                      fontWeight: AppFontWeights.bold,
                      color: t.text1)),
            ],
          ),
          const SizedBox(height: AppSpacing.s4),
          Text(l.onboardingPaymentStepTitle,
              style: TextStyle(
                  fontSize: AppTextSizes.lg,
                  fontWeight: AppFontWeights.bold,
                  color: t.text1)),
          const SizedBox(height: AppSpacing.s1),
          Text(l.onboardingPaymentSubtitle,
              style: TextStyle(fontSize: AppTextSizes.base, color: t.text2)),
          const SizedBox(height: AppSpacing.s6),
          TextField(
            controller: _cardController,
            keyboardType: TextInputType.number,
            maxLength: 19, // 16 digits + 3 spaces
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: TextStyle(color: t.text1),
            decoration: _decoration(
              context,
              label: l.onboardingCardNumberLabel(l.commonOptional),
              hint: '8600 1234 5678 1234',
            ).copyWith(counterText: ''),
            onChanged: (raw) {
              final formatted = _formatCard(raw);
              final digits = raw.replaceAll(RegExp(r'\D'), '');
              notifier.setCardNumber(digits);
              if (formatted != _cardController.text) {
                _cardController.value = TextEditingValue(
                  text: formatted,
                  selection:
                      TextSelection.collapsed(offset: formatted.length),
                );
              }
            },
          ),
          const SizedBox(height: AppSpacing.s4),
          Row(
            children: [
              Expanded(
                child: _ToggleButton(
                  label: 'Uzcard',
                  selected: state.cardBank == 'UZCARD',
                  onTap: () => notifier.setCardBank('UZCARD'),
                ),
              ),
              const SizedBox(width: AppSpacing.s3),
              Expanded(
                child: _ToggleButton(
                  label: 'Humo',
                  selected: state.cardBank == 'HUMO',
                  onTap: () => notifier.setCardBank('HUMO'),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.s6),
          AppButton(
            label: l.buttonContinue,
            fullWidth: true,
            onPressed: goNext,
          ),
          const SizedBox(height: AppSpacing.s3),
          AppButton(
            label: l.onboardingSkipForNow,
            variant: AppButtonVariant.ghost,
            fullWidth: true,
            onPressed: () {
              notifier.setCardNumber('');
              goNext();
            },
          ),
        ],
      ),
    );
  }
}

// ── Step 4 — Review and launch ────────────────────────────────────────────────

class _Step4Review extends ConsumerWidget {
  const _Step4Review();

  String _modeName(AppLocalizations l, String mode) {
    switch (mode) {
      case 'PRODUCTS':
        return l.onboardingModeProductsTitle;
      case 'SERVICES':
        return l.navServices;
      case 'FREELANCE':
        return l.onboardingModeFreelanceShort;
      default:
        return mode;
    }
  }

  String _languageName(String lang) {
    switch (lang) {
      case 'RUSSIAN':
        return 'Русский';
      case 'ENGLISH':
        return 'English';
      default:
        return "O'zbek";
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final state = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                icon: AppIcon(name: AppIconName.menu, color: t.text1),
                onPressed: () => notifier.setStep(3),
              ),
              const SizedBox(width: AppSpacing.s1),
              Text(l.onboardingAlmostDone,
                  style: TextStyle(
                      fontSize: AppTextSizes.lg,
                      fontWeight: AppFontWeights.bold,
                      color: t.text1)),
            ],
          ),
          const SizedBox(height: AppSpacing.s5),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _SummaryRow(l.onboardingBusinessNameLabel, state.businessName),
                _SummaryRow(l.onboardingSummaryType, _modeName(l, state.mode)),
                _SummaryRow(
                    l.onboardingLanguageLabel, _languageName(state.language)),
                _SummaryRow(l.onboardingSummaryBot, '@${state.botUsername}'),
                _SummaryRow(
                    l.onboardingSummaryPayment,
                    state.cardNumber.isNotEmpty
                        ? '${state.cardNumber} (${state.cardBank})'
                        : l.onboardingNotSet,
                    isLast: true),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.s6),
          if (state.completing) ...[
            const Center(child: AppSpinner(size: 28)),
          ] else ...[
            AppButton(
              label: l.onboardingLaunchCrm,
              size: AppButtonSize.lg,
              fullWidth: true,
              onPressed: notifier.complete,
            ),
          ],
          if (state.completionError != null) ...[
            const SizedBox(height: AppSpacing.s3),
            Text(state.completionError!,
                style: TextStyle(
                    color: t.errorStrong, fontSize: AppTextSizes.sm),
                textAlign: TextAlign.center),
          ],
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isLast;

  const _SummaryRow(this.label, this.value, {this.isLast = false});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.s4, vertical: AppSpacing.s4),
          child: Row(
            children: [
              Text(label,
                  style:
                      TextStyle(color: t.text2, fontSize: AppTextSizes.sm)),
              const Spacer(),
              Flexible(
                child: Text(value,
                    style: TextStyle(
                        fontWeight: AppFontWeights.semibold,
                        fontSize: AppTextSizes.sm,
                        color: t.text1),
                    textAlign: TextAlign.right),
              ),
            ],
          ),
        ),
        if (!isLast)
          Divider(
              height: 1,
              color: t.border,
              indent: AppSpacing.s4,
              endIndent: AppSpacing.s4),
      ],
    );
  }
}

// ── Step 5 — Done ─────────────────────────────────────────────────────────────

class _DoneStep extends ConsumerWidget {
  final String botUsername;
  final String botLink;

  const _DoneStep({required this.botUsername, required this.botLink});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    return PopScope(
      canPop: false,
      child: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.s6),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                Center(
                  child: Container(
                    width: 80,
                    height: 80,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: t.successSoft,
                      shape: BoxShape.circle,
                    ),
                    child: AppIcon(
                        name: AppIconName.paid,
                        color: t.successStrong,
                        size: 44),
                  ),
                ),
                const SizedBox(height: AppSpacing.s6),
                Text(
                  l.onboardingDoneTitle,
                  style: TextStyle(
                    fontSize: AppTextSizes.h2,
                    fontWeight: AppFontWeights.extra,
                    color: t.text1,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.s3),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s2),
                  child: Text(
                    l.onboardingDoneShareHint,
                    style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: AppSpacing.s6),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.s4),
                  decoration: BoxDecoration(
                    color: t.surface,
                    border: Border.all(color: t.border),
                    borderRadius: AppRadii.lg,
                  ),
                  child: Row(
                    children: [
                      AppIcon(name: AppIconName.inbox, color: t.accent, size: 28),
                      const SizedBox(width: AppSpacing.s3),
                      Expanded(
                        child: Text('@$botUsername',
                            style: TextStyle(
                                fontWeight: AppFontWeights.semibold,
                                color: t.accent)),
                      ),
                      IconButton(
                        icon: AppIcon(
                            name: AppIconName.add, color: t.accent, size: 20),
                        tooltip: l.settingsCopyLinkTooltip,
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: botLink));
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                                content: Text(l.settingsBotLinkCopied),
                                duration: const Duration(seconds: 2)),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                AppButton(
                  label: l.onboardingFinishButton,
                  size: AppButtonSize.lg,
                  fullWidth: true,
                  onPressed: () => context.go('/home'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        text,
        style: TextStyle(
          fontSize: AppTextSizes.caption,
          fontWeight: AppFontWeights.semibold,
          color: t.text2,
        ),
      ),
    );
  }
}

InputDecoration _decoration(
  BuildContext context, {
  String? label,
  String? hint,
  String? errorText,
}) {
  final t = AppTokens.of(context);
  OutlineInputBorder border(Color color, [double width = 1]) =>
      OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: BorderSide(color: color, width: width),
      );
  return InputDecoration(
    labelText: label,
    labelStyle: TextStyle(color: t.text2),
    hintText: hint,
    hintStyle: TextStyle(color: t.text3),
    errorText: errorText,
    errorStyle: TextStyle(color: t.errorStrong),
    filled: true,
    fillColor: t.surface,
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.s4, vertical: AppSpacing.s3),
    border: border(t.border),
    enabledBorder: border(t.border),
    focusedBorder: border(t.accent, 2),
    errorBorder: border(t.error),
    focusedErrorBorder: border(t.error, 2),
  );
}
