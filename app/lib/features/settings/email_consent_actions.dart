import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/providers/business_provider.dart';

/// Shared actions for the owner email + newsletter-consent capture, used by BOTH
/// the analytics email-capture card and the Settings email field. Each action
/// hits the User-scoped endpoint, then refetches GET /business and pushes the
/// fresh business into the WATCHED authNotifierProvider so the card/settings
/// update live — the same watched-provider pattern as saveProfile/saveMode.
final emailConsentActionsProvider = Provider<EmailConsentActions>((ref) {
  return EmailConsentActions(ref);
});

class EmailConsentActions {
  final Ref _ref;
  EmailConsentActions(this._ref);

  /// Set the owner email + consent. Pass email=null to clear it. Consent is
  /// separate from the email (an email may be saved with consent=false).
  Future<void> saveEmailConsent({String? email, required bool consent}) async {
    final api = _ref.read(apiServiceProvider);
    await api.patchEmailConsent(email: email, newsletterConsent: consent);
    await _refresh(api);
  }

  /// Skip/dismiss the analytics email-capture card.
  Future<void> dismissEmailPrompt() async {
    final api = _ref.read(apiServiceProvider);
    await api.dismissEmailPrompt();
    await _refresh(api);
  }

  Future<void> _refresh(ApiService api) async {
    final fresh = await api.getBusiness();
    _ref.read(authNotifierProvider).setBusiness(fresh);
    _ref.invalidate(businessProvider);
  }
}
