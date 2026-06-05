import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/language_switcher.dart';

/// First screen for unauthenticated users: choose Log in (returning) or
/// Sign up (onboarding, which ends with Telegram verification).
class ArrivalScreen extends ConsumerWidget {
  const ArrivalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.s5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Align(
                alignment: Alignment.topRight,
                child: LanguageSwitcher(),
              ),
              const Spacer(),
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: t.accent,
                    borderRadius: AppRadii.xl,
                    boxShadow: t.shadowAccent,
                  ),
                  child: AppIcon(
                      name: AppIconName.orders, size: 36, color: t.accentOn),
                ),
              ),
              const SizedBox(height: AppSpacing.s6),
              Text(
                l.arrivalTitle,
                style: TextStyle(
                  fontSize: AppTextSizes.h2,
                  fontWeight: AppFontWeights.extra,
                  color: t.text1,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.s2),
              Text(
                l.arrivalSubtitle,
                style: TextStyle(fontSize: AppTextSizes.base, color: t.text2),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              AppButton(
                label: l.arrivalLogIn,
                fullWidth: true,
                onPressed: () => context.go('/login'),
              ),
              const SizedBox(height: AppSpacing.s3),
              AppButton(
                label: l.arrivalSignUp,
                variant: AppButtonVariant.ghost,
                fullWidth: true,
                onPressed: () => context.go('/onboarding'),
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
