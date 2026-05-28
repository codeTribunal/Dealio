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
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_button.dart';

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
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
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
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Theme.of(context).colorScheme.primary,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Text(
                l.otpTitle,
                style: Theme.of(context)
                    .textTheme
                    .headlineMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                l.otpSubtitle(widget.phone),
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: Colors.grey[600]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                l.otpDevHint,
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: Colors.orange[700]),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(4, (i) => _buildDigitBox(i)),
              ),
              const SizedBox(height: 24),
              _buildConsentCheckbox(
                value: _generalConsent,
                onChanged: (v) => setState(() => _generalConsent = v ?? false),
                text: l.consentGeneral,
                linkText: l.consentGeneralLink,
              ),
              const SizedBox(height: 8),
              _buildConsentCheckbox(
                value: _crossBorderConsent,
                onChanged: (v) =>
                    setState(() => _crossBorderConsent = v ?? false),
                text: l.consentCrossBorder,
              ),
              const Spacer(),
              if (_loading)
                const Center(child: CircularProgressIndicator())
              else ...[
                AppButton(
                  label: l.otpVerifyButton,
                  onPressed: _canVerify ? _verify : null,
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: _resend,
                  child: Text(l.otpResendButton),
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
    final baseStyle = Theme.of(context)
        .textTheme
        .bodySmall
        ?.copyWith(color: Colors.grey[800], height: 1.3);
    final linkStyle = baseStyle?.copyWith(
      color: Theme.of(context).colorScheme.primary,
      decoration: TextDecoration.underline,
      fontWeight: FontWeight.w600,
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
            TextSpan(text: parts.length > 1 ? parts.sublist(1).join(linkText) : ''),
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
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ),
        const SizedBox(width: 8),
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
    return Container(
      width: 60,
      height: 64,
      margin: const EdgeInsets.symmetric(horizontal: 6),
      child: TextFormField(
        controller: _controllers[index],
        focusNode: _focusNodes[index],
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(1),
        ],
        style: Theme.of(context)
            .textTheme
            .headlineSmall
            ?.copyWith(fontWeight: FontWeight.bold),
        decoration: InputDecoration(
          filled: true,
          fillColor: const Color(0xFFF5F7FF),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: Theme.of(context).colorScheme.primary,
            ),
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
