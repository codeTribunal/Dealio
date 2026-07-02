import 'package:flutter/material.dart';

import '../../core/api/api_service.dart' show ApiException;
import '../../core/icons/app_icon.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import 'app_button.dart';

/// Maps any thrown error to a short, localized, plain-language message.
/// Raw exception text (DioException dumps, English server strings) must never
/// reach the owner — it breaks both the calm/trustworthy voice and uz/ru
/// language parity at exactly the moment trust is fragile. Screens that can
/// say something more specific (plan limits, already-confirmed payments)
/// should special-case BEFORE falling back to this.
String localizedErrorMessage(BuildContext context, Object? error) {
  final l = AppLocalizations.of(context)!;
  if (error is ApiException) {
    final code = error.statusCode;
    // No HTTP status → the request never reached the server (offline, DNS,
    // timeout): tell the owner to check their connection.
    if (code == null) return l.errorNoConnection;
    if (code >= 500) return l.errorServer;
  }
  return l.errorGeneric;
}

/// Shared full-area error state: icon + localized message + Retry. Replaces
/// the per-screen `_ErrorView(message: e.toString())` copies.
class AppErrorState extends StatelessWidget {
  final Object? error;
  final VoidCallback onRetry;

  const AppErrorState({super.key, required this.error, required this.onRetry});

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
            Text(
              localizedErrorMessage(context, error),
              textAlign: TextAlign.center,
              style: TextStyle(color: t.text2),
            ),
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
