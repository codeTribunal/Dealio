import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/icons/app_icon.dart';
import '../../core/models/business.dart';
import '../../core/models/user.dart';
import '../../core/services/fcm_service.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/phone.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import '../../shared/widgets/language_switcher.dart';

/// Returning-user login: enter phone → receive a Telegram code → verify.
/// No consent checkboxes (consent is captured once, at enrollment).
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController(text: '+998');
  final _codeController = TextEditingController();
  bool _codeStep = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  String get _phone => _phoneController.text.trim();

  Future<void> _sendCode() async {
    final l = AppLocalizations.of(context)!;
    if (_phone.length < 9) {
      setState(() => _error = l.loginErrorInvalidPhone);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // Canonicalize to E.164 so the backend matches the stored form regardless
      // of how the number was typed. Backend returns a generic 200 on success
      // (no enumeration) — the only non-2xx we surface specially is 429.
      await ref.read(apiServiceProvider).loginRequest(normalizePhone(_phone));
      if (!mounted) return;
      setState(() => _codeStep = true);
    } catch (e) {
      if (!mounted) return;
      final status = e is ApiException ? e.statusCode : null;
      setState(() => _error =
          status == 429 ? l.loginTooManyAttempts : l.loginSendFailed);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    final l = AppLocalizations.of(context)!;
    final code = _codeController.text.trim();
    if (code.length < 6) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(apiServiceProvider)
          .loginVerify(normalizePhone(_phone), code);
      final user = User.fromJson(result.user);
      final business =
          result.business != null ? Business.fromJson(result.business!) : null;

      await ref
          .read(authNotifierProvider)
          .setAuth(result.token, user: user, business: business);

      // Best-effort — register for push after login.
      registerFcmToken(ref.read(apiServiceProvider)).ignore();

      if (!mounted) return;
      context.go(business != null ? '/home' : '/onboarding');
    } catch (e) {
      if (!mounted) return;
      final status = e is ApiException ? e.statusCode : null;
      final msg = e.toString();
      setState(() {
        _codeController.clear();
        _error = (status == 429 ||
                RegExp('many|attempt', caseSensitive: false).hasMatch(msg))
            ? l.loginTooManyAttempts
            : l.otpErrorInvalid;
      });
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
        // Keyboard-safe: when the soft keyboard opens the viewport shrinks, so
        // the content scrolls instead of overflowing. ConstrainedBox +
        // IntrinsicHeight keep the Spacer-based centering identical when the
        // keyboard is closed.
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: IntrinsicHeight(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.s5),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          IconButton(
                            icon:
                                AppIcon(name: AppIconName.menu, color: t.text1),
                            onPressed: () {
                              if (_codeStep) {
                                setState(() {
                                  _codeStep = false;
                                  _codeController.clear();
                                  _error = null;
                                });
                              } else {
                                context.go('/welcome');
                              }
                            },
                          ),
                          const Spacer(),
                          const LanguageSwitcher(),
                        ],
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
                              name: AppIconName.orders,
                              size: 36,
                              color: t.accentOn),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.s6),
                      Text(
                        l.loginReturningTitle,
                        style: TextStyle(
                          fontSize: AppTextSizes.h2,
                          fontWeight: AppFontWeights.extra,
                          color: t.text1,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.s2),
                      Text(
                        _codeStep
                            ? l.loginCodeSentNotice
                            : l.loginPhoneSubtitle,
                        style: TextStyle(
                            fontSize: AppTextSizes.base, color: t.text2),
                        textAlign: TextAlign.center,
                      ),
                      const Spacer(),
                      if (!_codeStep)
                        AppTextField(
                          label: l.loginPhoneLabel,
                          hint: '+998 90 123 45 67',
                          controller: _phoneController,
                          leftIcon: AppIconName.customers,
                          keyboardType: TextInputType.phone,
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(RegExp(r'[+\d]'))
                          ],
                        )
                      else
                        AppTextField(
                          label: l.otpCodeLabel,
                          hint: '123456',
                          controller: _codeController,
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(6),
                          ],
                          onChanged: (_) => setState(() {}),
                        ),
                      if (_error != null) ...[
                        const SizedBox(height: AppSpacing.s2),
                        Text(
                          _error!,
                          style: TextStyle(
                              color: t.errorStrong, fontSize: AppTextSizes.sm),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.s5),
                      if (!_codeStep)
                        AppButton(
                          label: l.loginSendCodeButton,
                          fullWidth: true,
                          loading: _loading,
                          onPressed: _sendCode,
                        )
                      else ...[
                        AppButton(
                          label: l.otpVerifyButton,
                          fullWidth: true,
                          loading: _loading,
                          onPressed: _codeController.text.trim().length == 6
                              ? _verify
                              : null,
                        ),
                        const SizedBox(height: AppSpacing.s3),
                        AppButton(
                          label: l.loginChangeNumber,
                          variant: AppButtonVariant.ghost,
                          fullWidth: true,
                          onPressed: () => setState(() {
                            _codeStep = false;
                            _codeController.clear();
                            _error = null;
                          }),
                        ),
                      ],
                      const Spacer(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
