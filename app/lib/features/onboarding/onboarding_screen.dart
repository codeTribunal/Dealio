import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/api/api_service.dart';
import '../../core/locale/locale_provider.dart';
import '../../l10n/app_localizations.dart';
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
                  duration: const Duration(milliseconds: 250),
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
    final primary = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
      child: Row(
        children: List.generate(4, (i) {
          final active = i < step;
          return Expanded(
            child: Container(
              height: 4,
              margin: EdgeInsets.only(right: i < 3 ? 6 : 0),
              decoration: BoxDecoration(
                color: active ? primary : Colors.grey.shade200,
                borderRadius: BorderRadius.circular(2),
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
    final state = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);
    final primary = Theme.of(context).colorScheme.primary;

    final canContinue =
        state.businessName.trim().isNotEmpty && state.modes.isNotEmpty;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          Text(
            l.onboardingSetupTitle,
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            l.onboardingBusinessStepTitle,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: Colors.grey[600]),
          ),
          const SizedBox(height: 28),
          TextField(
            controller: _nameController,
            decoration: InputDecoration(
              labelText: l.onboardingBusinessNameLabel,
              hintText: l.onboardingBusinessNameHint,
              border: const OutlineInputBorder(),
            ),
            onChanged: notifier.setBusinessName,
          ),
          const SizedBox(height: 24),
          Text(
            l.onboardingBusinessType,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(fontWeight: FontWeight.w600, color: Colors.grey[700]),
          ),
          const SizedBox(height: 10),
          _ModeCard(
            mode: 'PRODUCTS',
            icon: Icons.shopping_bag_outlined,
            title: l.onboardingModeProductsTitle,
            subtitle: l.onboardingModeProductsSubtitle,
            selected: state.modes.contains('PRODUCTS'),
            onTap: () => notifier.toggleMode('PRODUCTS'),
          ),
          const SizedBox(height: 8),
          _ModeCard(
            mode: 'SERVICES',
            icon: Icons.calendar_today_outlined,
            title: l.onboardingModeServicesTitle,
            subtitle: l.onboardingModeServicesSubtitle,
            selected: state.modes.contains('SERVICES'),
            onTap: () => notifier.toggleMode('SERVICES'),
          ),
          const SizedBox(height: 8),
          _ModeCard(
            mode: 'FREELANCE',
            icon: Icons.work_outline,
            title: l.onboardingModeFreelanceTitle,
            subtitle: l.onboardingModeFreelanceSubtitle,
            selected: state.modes.contains('FREELANCE'),
            onTap: () => notifier.toggleMode('FREELANCE'),
          ),
          const SizedBox(height: 24),
          Text(
            l.onboardingLanguageLabel,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(fontWeight: FontWeight.w600, color: Colors.grey[700]),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _ToggleButton(
                  label: "O'zbek",
                  selected: state.language == 'UZBEK',
                  onTap: () => _selectLanguage('UZBEK'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _ToggleButton(
                  label: 'Русский',
                  selected: state.language == 'RUSSIAN',
                  onTap: () => _selectLanguage('RUSSIAN'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _ToggleButton(
                  label: 'English',
                  selected: state.language == 'ENGLISH',
                  onTap: () => _selectLanguage('ENGLISH'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: canContinue
                ? () => ref.read(onboardingProvider.notifier).setStep(2)
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: primary,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(l.buttonContinue,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          ),
        ],
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  final String mode;
  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _ModeCard({
    required this.mode,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? primary.withValues(alpha: 0.05) : Colors.white,
          border: Border.all(
            color: selected ? primary : Colors.grey.shade300,
            width: selected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: 22,
                color: selected ? primary : Colors.grey[600]),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: selected ? primary : Colors.black87)),
                  Text(subtitle,
                      style:
                          TextStyle(fontSize: 12, color: Colors.grey[600])),
                ],
              ),
            ),
            if (selected)
              Icon(Icons.check_circle, color: primary, size: 20),
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
    final primary = Theme.of(context).colorScheme.primary;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? primary : Colors.white,
          border: Border.all(
              color: selected ? primary : Colors.grey.shade300),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : Colors.grey.shade700),
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
    final state = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);
    final primary = Theme.of(context).colorScheme.primary;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => notifier.setStep(1),
              ),
              const SizedBox(width: 4),
              Text(l.onboardingBotHeader,
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 16),
          Text(l.onboardingBotCreateTitle,
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(l.onboardingBotCreateSubtitle,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: Colors.grey[600])),
          const SizedBox(height: 24),
          ..._instructions(context, l),
          const SizedBox(height: 20),
          Text(l.onboardingBotPasteToken,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextField(
            controller: _tokenController,
            decoration: InputDecoration(
              hintText: '1234567890:AAHxyz...',
              border: const OutlineInputBorder(),
              errorText: state.tokenError,
            ),
            onChanged: notifier.setBotToken,
          ),
          const SizedBox(height: 16),
          if (!state.tokenVerified) ...[
            ElevatedButton(
              onPressed: state.verifyingToken || state.botToken.isEmpty
                  ? null
                  : notifier.verifyBotToken,
              style: ElevatedButton.styleFrom(
                backgroundColor: primary,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: state.verifyingToken
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : Text(l.onboardingVerifyToken,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 16)),
            ),
          ] else ...[
            Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 22),
                const SizedBox(width: 8),
                Text(l.onboardingBotReady(state.botUsername),
                    style: const TextStyle(
                        color: Colors.green, fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: state.tokenVerified ? () => notifier.setStep(3) : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: primary,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(l.buttonContinue,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 16)),
            ),
          ],
        ],
      ),
    );
  }

  List<Widget> _instructions(BuildContext context, AppLocalizations l) {
    final steps = [
      (l.onboardingBotStep1, Icons.search),
      (l.onboardingBotStep2, Icons.send_outlined),
      (l.onboardingBotStep3, Icons.badge_outlined),
      (l.onboardingBotStep4, Icons.alternate_email),
      (l.onboardingBotStep5, Icons.copy_outlined),
    ];
    return steps.indexed.map((entry) {
      final (i, step) = entry;
      final (text, icon) = step;
      return Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text('${i + 1}',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(text,
                    style: const TextStyle(fontSize: 14)),
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
    final state = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);
    final primary = Theme.of(context).colorScheme.primary;

    void goNext() => notifier.setStep(4);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => notifier.setStep(2),
              ),
              const SizedBox(width: 4),
              Text(l.onboardingPaymentHeader,
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 16),
          Text(l.onboardingPaymentStepTitle,
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(l.onboardingPaymentSubtitle,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: Colors.grey[600])),
          const SizedBox(height: 28),
          TextField(
            controller: _cardController,
            keyboardType: TextInputType.number,
            maxLength: 19, // 16 digits + 3 spaces
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              labelText: l.onboardingCardNumberLabel(l.commonOptional),
              hintText: '8600 1234 5678 1234',
              border: const OutlineInputBorder(),
              counterText: '',
            ),
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
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _ToggleButton(
                  label: 'Uzcard',
                  selected: state.cardBank == 'UZCARD',
                  onTap: () => notifier.setCardBank('UZCARD'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ToggleButton(
                  label: 'Humo',
                  selected: state.cardBank == 'HUMO',
                  onTap: () => notifier.setCardBank('HUMO'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: goNext,
            style: ElevatedButton.styleFrom(
              backgroundColor: primary,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(l.buttonContinue,
                style: const TextStyle(
                    fontWeight: FontWeight.w600, fontSize: 16)),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () {
              notifier.setCardNumber('');
              goNext();
            },
            child: Text(l.onboardingSkipForNow),
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
    final state = ref.watch(onboardingProvider);
    final notifier = ref.read(onboardingProvider.notifier);
    final primary = Theme.of(context).colorScheme.primary;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => notifier.setStep(3),
              ),
              const SizedBox(width: 4),
              Text(l.onboardingAlmostDone,
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 24),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade200),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _SummaryRow(l.onboardingBusinessNameLabel, state.businessName),
                _SummaryRow(
                    l.onboardingSummaryType,
                    state.modes
                        .map((m) => _modeName(l, m))
                        .join(', ')),
                _SummaryRow(
                    l.onboardingLanguageLabel,
                    _languageName(state.language)),
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
          const SizedBox(height: 32),
          if (state.completing) ...[
            const Center(child: CircularProgressIndicator()),
          ] else ...[
            ElevatedButton(
              onPressed: notifier.complete,
              style: ElevatedButton.styleFrom(
                backgroundColor: primary,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(56),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(l.onboardingLaunchCrm,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 17)),
            ),
          ],
          if (state.completionError != null) ...[
            const SizedBox(height: 12),
            Text(state.completionError!,
                style: const TextStyle(color: Colors.red, fontSize: 13),
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
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Row(
            children: [
              Text(label,
                  style: TextStyle(
                      color: Colors.grey[600], fontSize: 14)),
              const Spacer(),
              Flexible(
                child: Text(value,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14),
                    textAlign: TextAlign.right),
              ),
            ],
          ),
        ),
        if (!isLast)
          Divider(height: 1, color: Colors.grey.shade200, indent: 20, endIndent: 20),
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
    final primary = Theme.of(context).colorScheme.primary;

    return PopScope(
      canPop: false,
      child: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                Center(
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: const BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check,
                        color: Colors.white, size: 44),
                  ),
                ),
                const SizedBox(height: 28),
                Text(
                  l.onboardingDoneTitle,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    l.onboardingDoneShareHint,
                    style: const TextStyle(color: Colors.grey, fontSize: 14),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 32),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(color: primary.withValues(alpha: 0.4)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.telegram, color: primary, size: 28),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text('@$botUsername',
                            style: TextStyle(
                                fontWeight: FontWeight.w600, color: primary)),
                      ),
                      IconButton(
                        icon: const Icon(Icons.copy_outlined),
                        color: primary,
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
                ElevatedButton(
                  onPressed: () => context.go('/home'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(56),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(l.onboardingFinishButton,
                      style: const TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 16)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
