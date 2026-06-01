import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_service.dart';
import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import '../../shared/widgets/language_switcher.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController(text: '+998');
  bool _loading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ref
          .read(apiServiceProvider)
          .requestOtp(_phoneController.text.trim());
      if (!mounted) return;
      context.push('/otp', extra: _phoneController.text.trim());
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppTokens.of(context).error),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.s5),
          child: Form(
            key: _formKey,
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
                  l.loginWelcomeTitle,
                  style: TextStyle(
                    fontSize: AppTextSizes.h2,
                    fontWeight: AppFontWeights.extra,
                    color: t.text1,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.s2),
                Text(
                  l.loginWelcomeSubtitle,
                  style: TextStyle(
                      fontSize: AppTextSizes.base, color: t.text2),
                  textAlign: TextAlign.center,
                ),
                const Spacer(),
                AppTextField(
                  label: l.loginPhoneLabel,
                  hint: '+998 90 123 45 67',
                  controller: _phoneController,
                  leftIcon: AppIconName.customers,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[+\d]'))
                  ],
                  validator: (v) {
                    if (v == null || v.trim().length < 9) {
                      return l.loginErrorInvalidPhone;
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.s5),
                AppButton(
                  label: l.loginContinueButton,
                  fullWidth: true,
                  onPressed: _submit,
                  loading: _loading,
                ),
                const SizedBox(height: AppSpacing.s4),
                Center(
                  child: Text(
                    l.loginOtpHint,
                    style: TextStyle(
                        fontSize: AppTextSizes.caption, color: t.text3),
                    textAlign: TextAlign.center,
                  ),
                ),
                const Spacer(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
