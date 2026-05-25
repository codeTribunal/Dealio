import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/models/business.dart';
import '../../core/models/user.dart';
import '../../core/services/fcm_service.dart';
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
    if (_code.length == 4) _verify();
  }

  Future<void> _verify() async {
    if (_code.length != 4) return;
    setState(() => _loading = true);
    try {
      final result = await ref
          .read(apiServiceProvider)
          .verifyOtp(widget.phone, _code);

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
        const SnackBar(content: Text('Code resent')),
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
                'Enter the code',
                style: Theme.of(context)
                    .textTheme
                    .headlineMedium
                    ?.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Sent to ${widget.phone}',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: Colors.grey[600]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Use 1234 in development',
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
              const Spacer(),
              if (_loading)
                const Center(child: CircularProgressIndicator())
              else ...[
                AppButton(
                  label: 'Verify',
                  onPressed: _code.length == 4 ? _verify : null,
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: _resend,
                  child: const Text('Resend code'),
                ),
              ],
              const Spacer(),
            ],
          ),
        ),
      ),
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
