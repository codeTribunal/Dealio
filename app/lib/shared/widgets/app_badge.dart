import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../utils/status_labels.dart';

/// Which status vocabulary an [AppBadge] is displaying. Selects both the
/// localization function and the status→semantic-color mapping.
enum AppBadgeType { order, payment, appointment, project, milestone, invoice }

/// A pill badge that shows a localized status using SEMANTIC colors
/// (success / warning / error token pairs) — never the cobalt accent.
///
/// The raw backend [status] code is mapped to a localized label via the app's
/// existing status-label helpers, so nothing is hardcoded in English.
class AppBadge extends StatelessWidget {
  final String status;
  final AppBadgeType type;

  const AppBadge({super.key, required this.status, required this.type});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final l = AppLocalizations.of(context)!;

    final label = _label(l);
    final tone = _tone(status);
    final (bg, fg) = switch (tone) {
      _Tone.success => (t.successSoft, t.successStrong),
      _Tone.warning => (t.warningSoft, t.warningStrong),
      _Tone.error => (t.errorSoft, t.errorStrong),
    };

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.s3,
        vertical: AppSpacing.s1,
      ),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadii.pill),
      child: Text(
        label,
        style: TextStyle(
          fontSize: AppTextSizes.caption,
          fontWeight: AppFontWeights.semibold,
          color: fg,
        ),
      ),
    );
  }

  String _label(AppLocalizations l) => switch (type) {
        AppBadgeType.order => orderStatusLabel(l, status),
        AppBadgeType.payment => paymentStatusLabel(l, status),
        AppBadgeType.appointment => appointmentStatusLabel(l, status),
        AppBadgeType.project => projectStatusLabel(l, status),
        AppBadgeType.milestone => milestoneStatusLabel(l, status),
        AppBadgeType.invoice => invoiceStatusLabel(l, status),
      };

  /// Buckets every status into a semantic tone. Terminal-positive → success,
  /// in-flight/awaiting → warning, cancelled/failed → error.
  _Tone _tone(String s) {
    switch (s) {
      case 'READY':
      case 'DELIVERED':
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'APPROVED':
      case 'PAID':
        return _Tone.success;
      case 'CANCELLED':
      case 'NO_SHOW':
        return _Tone.error;
      default:
        // NEW, PREPARING, PENDING, PAYMENT_RECEIVED, REQUESTED, PROPOSAL_SENT,
        // IN_PROGRESS, REVIEW, SUBMITTED_FOR_REVIEW, UNPAID, …
        return _Tone.warning;
    }
  }
}

enum _Tone { success, warning, error }
