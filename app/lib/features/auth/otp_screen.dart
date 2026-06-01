import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_service.dart';
import '../../core/config/app_config.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/models/business.dart';
import '../../core/models/user.dart';
import '../../core/services/fcm_service.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_spinner.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String phone;

  const OtpScreen({super.key, required this.phone});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _controllers = List.generate(4, (_) => TextEditingController());
  final _focusNodes = List.generate(4, (_) => FocusNode());
  bool _loading = false;
  bool _generalConsent = false;
  bool _crossBorderConsent = false;

  bool get _canVerify =>
      _code.length == 4 && _generalConsent && _crossBorderConsent;

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _code => _controllers.map((c) => c.text).join();

  void _onDigitEntered(int index, String value) {
    if (value.isNotEmpty && index < 3) {
      _focusNodes[index + 1].requestFocus();
    }
    if (_canVerify) _verify();
  }

  Future<void> _verify() async {
    if (!_canVerify) return;
    setState(() => _loading = true);
    try {
      final result = await ref.read(apiServiceProvider).verifyOtp(
            widget.phone,
            _code,
            generalConsent: _generalConsent,
            crossBorderConsent: _crossBorderConsent,
          );

      final user = User.fromJson(result.user);
      final business = result.business != null
          ? Business.fromJson(result.business!)
          : null;

      await ref
          .read(authNotifierProvider)
          .setAuth(result.token, user: user, business: business);

      // Best-effort — register FCM token after login so the owner receives push notifications
      registerFcmToken(ref.read(apiServiceProvider)).ignore();

      if (!mounted) return;
      if (business != null) {
        context.go('/home');
      } else {
        context.go('/onboarding');
      }
    } catch (e) {
      if (!mounted) return;
      // Clear OTP on error
      for (final c in _controllers) {
        c.clear();
      }
      _focusNodes[0].requestFocus();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppTokens.of(context).error),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    try {
      await ref.read(apiServiceProvider).requestOtp(widget.phone);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.otpCodeResent)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppTokens.of(context).error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: t.text1,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.s5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Text(
                l.otpTitle,
                style: TextStyle(
                  fontSize: AppTextSizes.h2,
                  fontWeight: AppFontWeights.extra,
                  color: t.text1,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.s2),
              Text(
                l.otpSubtitle(widget.phone),
                style: TextStyle(fontSize: AppTextSizes.base, color: t.text2),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.s2),
              Text(
                l.otpDevHint,
                style: TextStyle(
                    fontSize: AppTextSizes.caption, color: t.warningStrong),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(4, (i) => _buildDigitBox(i)),
              ),
              const SizedBox(height: AppSpacing.s5),
              _buildConsentCheckbox(
                value: _generalConsent,
                onChanged: (v) => setState(() => _generalConsent = v ?? false),
                text: l.consentGeneral,
                linkText: l.consentGeneralLink,
              ),
              const SizedBox(height: AppSpacing.s2),
              _buildConsentCheckbox(
                value: _crossBorderConsent,
                onChanged: (v) =>
                    setState(() => _crossBorderConsent = v ?? false),
                text: l.consentCrossBorder,
              ),
              const Spacer(),
              if (_loading)
                const Center(child: AppSpinner(size: 28))
              else ...[
                AppButton(
                  label: l.otpVerifyButton,
                  fullWidth: true,
                  onPressed: _canVerify ? _verify : null,
                ),
                const SizedBox(height: AppSpacing.s3),
                AppButton(
                  label: l.otpResendButton,
                  variant: AppButtonVariant.ghost,
                  fullWidth: true,
                  onPressed: _resend,
                ),
              ],
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openPrivacyPolicy() async {
    final uri = Uri.parse(AppConfig.privacyPolicyUrl);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open the link')),
      );
    }
  }

  Widget _buildConsentCheckbox({
    required bool value,
    required ValueChanged<bool?> onChanged,
    required String text,
    String? linkText,
  }) {
    final t = AppTokens.of(context);
    final baseStyle = TextStyle(
        fontSize: AppTextSizes.caption, color: t.text2, height: 1.3);
    final linkStyle = baseStyle.copyWith(
      color: t.accent,
      decoration: TextDecoration.underline,
      fontWeight: AppFontWeights.semibold,
    );

    Widget label;
    if (linkText != null && text.contains(linkText)) {
      final parts = text.split(linkText);
      label = Text.rich(
        TextSpan(
          style: baseStyle,
          children: [
            TextSpan(text: parts[0]),
            TextSpan(
              text: linkText,
              style: linkStyle,
              recognizer: TapGestureRecognizer()..onTap = _openPrivacyPolicy,
            ),
            TextSpan(
                text: parts.length > 1 ? parts.sublist(1).join(linkText) : ''),
          ],
        ),
      );
    } else {
      label = Text(text, style: baseStyle);
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 24,
          height: 24,
          child: Checkbox(
            value: value,
            onChanged: onChanged,
            activeColor: t.accent,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ),
        const SizedBox(width: AppSpacing.s2),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: label,
          ),
        ),
      ],
    );
  }

  Widget _buildDigitBox(int index) {
    final t = AppTokens.of(context);
    return Container(
      width: 60,
      height: 64,
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.s1),
      child: TextFormField(
        controller: _controllers[index],
        focusNode: _focusNodes[index],
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(1),
        ],
        style: TextStyle(
          fontSize: AppTextSizes.h3,
          fontWeight: AppFontWeights.bold,
          color: t.text1,
        ),
        decoration: InputDecoration(
          filled: true,
          fillColor: t.surface2,
          enabledBorder: OutlineInputBorder(
            borderRadius: AppRadii.md,
            borderSide: BorderSide(color: t.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: AppRadii.md,
            borderSide: BorderSide(color: t.accent, width: 2),
          ),
          contentPadding: EdgeInsets.zero,
        ),
        onChanged: (v) {
          if (v.isEmpty && index > 0) {
            _focusNodes[index - 1].requestFocus();
          } else {
            _onDigitEntered(index, v);
          }
        },
      ),
    );
  }
}
