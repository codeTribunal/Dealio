import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_service.dart';
import '../../core/config/app_config.dart';
import '../../core/icons/app_icon.dart';
import '../../core/locale/locale_provider.dart';
import '../../core/models/blocked_slot.dart';
import '../../core/models/staff.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/card_number.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_checkbox.dart';
import '../../shared/widgets/app_dialog.dart';
import '../../shared/widgets/app_error_state.dart';
import '../../shared/widgets/app_spinner.dart';
import '../../shared/widgets/app_switch.dart';
import '../staff/staff_provider.dart';
import 'blocked_time_provider.dart';
import 'customization_provider.dart';
import 'email_consent_actions.dart';
import 'reminder_settings_provider.dart';
import 'settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final settingsAsync = ref.watch(settingsProvider);
    // The tab shell adds a bottom inset (via MediaQuery) so the floating nav bar
    // doesn't cover the last list item. Consume it as bottom padding — a plain
    // ListView with fixed padding would otherwise ignore it and clip content.
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      appBar: AppBar(title: Text(l.settingsTitle)),
      body: settingsAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => AppErrorState(
          error: e,
          onRetry: () => ref.read(settingsProvider.notifier).refresh(),
        ),
        data: (data) => RefreshIndicator(
          color: t.accent,
          onRefresh: () => ref.read(settingsProvider.notifier).refresh(),
          child: ListView(
            padding: EdgeInsets.fromLTRB(AppSpacing.s4, AppSpacing.s4,
                AppSpacing.s4, AppSpacing.s4 + bottomInset),
            children: [
              _ProfileSection(data: data),
              const SizedBox(height: AppSpacing.s3),
              _BusinessModeSection(data: data),
              // Services + scheduling (working hours, blocked time) are
              // appointments-specific — gated to SERVICES mode.
              if (data.business.mode == 'SERVICES') ...[
                const SizedBox(height: AppSpacing.s3),
                const _ServicesSection(),
              ],
              // Staff applies to every mode (Orders & Projects businesses have
              // staff too), so it is NOT mode-gated.
              const SizedBox(height: AppSpacing.s3),
              const _StaffSection(),
              if (data.business.mode == 'SERVICES') ...[
                const SizedBox(height: AppSpacing.s3),
                _WorkingHoursSection(data: data),
                const SizedBox(height: AppSpacing.s3),
                const _BlockedTimeSection(),
              ],
              const SizedBox(height: AppSpacing.s3),
              _CalendarSection(data: data),
              const SizedBox(height: AppSpacing.s3),
              _RemindersSection(data: data),
              const SizedBox(height: AppSpacing.s3),
              _BotSection(data: data),
              // Payment card — gated by the GLOBAL cardPaymentsEnabled flag.
              // When off, the section is not built at all (no card UI anywhere).
              if (data.business.cardPaymentsEnabled) ...[
                const SizedBox(height: AppSpacing.s3),
                _PaymentSection(data: data),
              ],
              const SizedBox(height: AppSpacing.s3),
              const _CustomerFieldsSection(),
              const SizedBox(height: AppSpacing.s3),
              const _StagesSection(),
              const SizedBox(height: AppSpacing.s3),
              const _CheckoutQuestionsSection(),
              const SizedBox(height: AppSpacing.s3),
              _LanguageSection(data: data),
              // Visually separated destructive section at the very bottom.
              const SizedBox(height: AppSpacing.s6),
              const _DangerZoneSection(),
              const SizedBox(height: AppSpacing.s6),
            ],
          ),
        ),
      ),
    );
  }
}

/// Final, visually separated destructive section: a single row that opens the
/// full account-deletion confirmation screen. Styled with the negative color.
class _DangerZoneSection extends StatelessWidget {
  const _DangerZoneSection();

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return AppCard(
      onTap: () => context.push('/settings/delete-account'),
      child: Text(
        l.settingsDeleteAccount,
        style: TextStyle(
          fontSize: AppTextSizes.base,
          fontWeight: AppFontWeights.semibold,
          color: t.errorStrong,
        ),
      ),
    );
  }
}

// ── Shared section scaffold ──────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  final AppIconName? icon;
  final String title;
  final Widget? trailing;
  final Widget child;
  const _SectionCard({
    this.icon,
    required this.title,
    this.trailing,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                AppIcon(name: icon!, size: 18, color: t.text2),
                const SizedBox(width: AppSpacing.s2),
              ],
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: AppTextSizes.sm,
                    fontWeight: AppFontWeights.semibold,
                    color: t.text1,
                  ),
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: AppSpacing.s3),
          child,
        ],
      ),
    );
  }
}

class _EditButton extends StatelessWidget {
  final VoidCallback onPressed;
  final String? tooltip;
  const _EditButton({required this.onPressed, this.tooltip});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return IconButton(
      icon: Icon(Icons.edit_outlined, size: 18, color: t.text2),
      onPressed: onPressed,
      tooltip: tooltip,
      visualDensity: VisualDensity.compact,
    );
  }
}

class _AddButton extends StatelessWidget {
  final VoidCallback onPressed;
  final String? tooltip;
  const _AddButton({required this.onPressed, this.tooltip});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return IconButton(
      icon: AppIcon(name: AppIconName.add, size: 20, color: t.accent),
      onPressed: onPressed,
      tooltip: tooltip,
      visualDensity: VisualDensity.compact,
    );
  }
}

InputDecoration _decoration(
  BuildContext context, {
  String? label,
  String? hint,
  String? errorText,
}) {
  final t = AppTokens.of(context);
  OutlineInputBorder border(Color color, [double width = 1]) =>
      OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: BorderSide(color: color, width: width),
      );
  return InputDecoration(
    labelText: label,
    labelStyle: TextStyle(color: t.text2),
    hintText: hint,
    hintStyle: TextStyle(color: t.text3),
    errorText: errorText,
    errorStyle: TextStyle(color: t.errorStrong),
    errorBorder: border(t.error),
    focusedErrorBorder: border(t.error, 2),
    isDense: true,
    filled: true,
    fillColor: t.surface,
    border: border(t.border),
    enabledBorder: border(t.border),
    focusedBorder: border(t.accent, 2),
  );
}

void _snackErr(BuildContext context, Object e) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content:
          Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
      backgroundColor: AppTokens.of(context).error,
    ),
  );
}

// ── Profile section ──────────────────────────────────────────────────

class _ProfileSection extends ConsumerStatefulWidget {
  final SettingsState data;
  const _ProfileSection({required this.data});

  @override
  ConsumerState<_ProfileSection> createState() => _ProfileSectionState();
}

class _ProfileSectionState extends ConsumerState<_ProfileSection> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _emailCtrl;
  bool _consent = false;
  bool _editing = false;
  bool _saving = false;

  static final _emailRe = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.data.business.name);
    _descCtrl =
        TextEditingController(text: widget.data.business.description ?? '');
    _addressCtrl =
        TextEditingController(text: widget.data.business.address ?? '');
    _emailCtrl =
        TextEditingController(text: widget.data.business.ownerEmail ?? '');
    _consent = widget.data.business.newsletterConsent;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _addressCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    final email = _emailCtrl.text.trim();
    if (email.isNotEmpty && !_emailRe.hasMatch(email)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(AppLocalizations.of(context)!.settingsEmailInvalid)),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      // Email/consent (on User) first, so the subsequent PATCH /business flatten
      // returns the fresh ownerEmail into the settings state. Empty clears it.
      await ref.read(emailConsentActionsProvider).saveEmailConsent(
            email: email.isEmpty ? null : email,
            consent: _consent,
          );
      await ref.read(settingsProvider.notifier).saveProfile(
            name: _nameCtrl.text.trim(),
            description: _descCtrl.text.trim(),
            address: _addressCtrl.text.trim(),
          );
      if (!mounted) return;
      setState(() {
        _editing = false;
        _saving = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      _snackErr(context, e);
    }
  }

  void _cancel() {
    setState(() {
      _nameCtrl.text = widget.data.business.name;
      _descCtrl.text = widget.data.business.description ?? '';
      _addressCtrl.text = widget.data.business.address ?? '';
      _emailCtrl.text = widget.data.business.ownerEmail ?? '';
      _consent = widget.data.business.newsletterConsent;
      _editing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return _SectionCard(
      title: l.settingsBusinessProfile,
      trailing: _editing
          ? null
          : _EditButton(
              onPressed: () => setState(() => _editing = true),
              tooltip: l.settingsEditProfileTooltip,
            ),
      child: _editing
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _nameCtrl,
                  autofocus: true,
                  style: TextStyle(color: t.text1),
                  decoration: _decoration(context,
                      label: l.onboardingBusinessNameLabel),
                ),
                const SizedBox(height: AppSpacing.s3),
                TextField(
                  controller: _descCtrl,
                  maxLines: 3,
                  style: TextStyle(color: t.text1),
                  decoration: _decoration(context,
                      label: l.settingsDescriptionLabel(l.commonOptional)),
                ),
                const SizedBox(height: AppSpacing.s3),
                TextField(
                  controller: _addressCtrl,
                  maxLines: 2,
                  style: TextStyle(color: t.text1),
                  decoration:
                      _decoration(context, label: l.settingsAddressLabel),
                ),
                const SizedBox(height: AppSpacing.s1),
                Text(
                  l.settingsAddressHelper,
                  style:
                      TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
                ),
                const SizedBox(height: AppSpacing.s3),
                TextField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  enableSuggestions: false,
                  style: TextStyle(color: t.text1),
                  decoration: _decoration(context,
                      label: l.settingsEmailLabel, hint: 'you@example.com'),
                ),
                const SizedBox(height: AppSpacing.s2),
                InkWell(
                  onTap: _saving
                      ? null
                      : () => setState(() => _consent = !_consent),
                  borderRadius: AppRadii.sm,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      AppCheckbox(
                        value: _consent,
                        onChanged: _saving
                            ? null
                            : (v) => setState(() => _consent = v),
                      ),
                      const SizedBox(width: AppSpacing.s2),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            l.emailPromptConsent,
                            style: TextStyle(
                                color: t.text2, fontSize: AppTextSizes.sm),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.s3),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    AppButton(
                      label: l.buttonCancel,
                      variant: AppButtonVariant.ghost,
                      size: AppButtonSize.sm,
                      onPressed: _saving ? null : _cancel,
                    ),
                    const SizedBox(width: AppSpacing.s2),
                    AppButton(
                      label: l.buttonSave,
                      variant: AppButtonVariant.secondary,
                      size: AppButtonSize.sm,
                      loading: _saving,
                      onPressed: _saving ? null : _save,
                    ),
                  ],
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.data.business.name,
                  style: TextStyle(
                      fontWeight: AppFontWeights.bold,
                      fontSize: AppTextSizes.base,
                      color: t.text1),
                ),
                if (widget.data.business.description != null &&
                    widget.data.business.description!.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.s1),
                  Text(
                    widget.data.business.description!,
                    style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
                  ),
                ],
                if (widget.data.business.address != null &&
                    widget.data.business.address!.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.s1),
                  Text(
                    widget.data.business.address!,
                    style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
                  ),
                ],
                if (widget.data.business.ownerEmail != null &&
                    widget.data.business.ownerEmail!.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.s1),
                  Text(
                    widget.data.business.ownerEmail!,
                    style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
                  ),
                ],
              ],
            ),
    );
  }
}

// ── Payment card section ─────────────────────────────────────────────
// Only built when the GLOBAL business.cardPaymentsEnabled flag is on (see the
// build list). Owner sets the P2P card (number + holder name) shown to customers
// in the Telegram bot; saved via PATCH /business/payment. Always-editable form.

class _PaymentSection extends ConsumerStatefulWidget {
  final SettingsState data;
  const _PaymentSection({required this.data});

  @override
  ConsumerState<_PaymentSection> createState() => _PaymentSectionState();
}

class _PaymentSectionState extends ConsumerState<_PaymentSection> {
  late final TextEditingController _cardCtrl;
  late final TextEditingController _holderCtrl;
  bool _saving = false;
  String? _cardError;

  @override
  void initState() {
    super.initState();
    _cardCtrl =
        TextEditingController(text: widget.data.business.cardNumber ?? '');
    _holderCtrl =
        TextEditingController(text: widget.data.business.cardHolderName ?? '');
  }

  @override
  void dispose() {
    _cardCtrl.dispose();
    _holderCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    // Guard the money route: a mistyped card silently misroutes every future
    // customer payment, so the number must be a full Uzcard/Humo card before
    // it can be saved. Empty clears the card.
    final validation = validateCardNumber(_cardCtrl.text);
    if (validation != null) {
      final l = AppLocalizations.of(context)!;
      setState(() => _cardError = validation == CardValidationError.length
          ? l.settingsCardInvalidLength
          : l.settingsCardInvalidPrefix);
      return;
    }
    setState(() {
      _saving = true;
      _cardError = null;
    });
    try {
      // An empty card number clears the card (no holder without a number).
      final number = _cardCtrl.text.trim();
      final holder = _holderCtrl.text.trim();
      await ref.read(settingsProvider.notifier).savePayment(
            cardNumber: number.isEmpty ? null : number,
            cardHolderName: number.isEmpty || holder.isEmpty ? null : holder,
          );
      if (!mounted) return;
      setState(() => _saving = false);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      _snackErr(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return _SectionCard(
      icon: AppIconName.payment,
      title: l.settingsPaymentCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l.settingsPaymentHint,
            style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
          ),
          const SizedBox(height: AppSpacing.s3),
          TextField(
            controller: _cardCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [CardNumberInputFormatter()],
            onChanged: (_) {
              if (_cardError != null) setState(() => _cardError = null);
            },
            style: TextStyle(color: t.text1),
            decoration: _decoration(
              context,
              label: l.settingsCardNumberLabel,
              hint: '8600 1234 5678 9012',
              errorText: _cardError,
            ),
          ),
          const SizedBox(height: AppSpacing.s3),
          TextField(
            controller: _holderCtrl,
            textCapitalization: TextCapitalization.words,
            style: TextStyle(color: t.text1),
            decoration: _decoration(
              context,
              label: l.settingsCardHolderLabel,
              hint: 'KARIMOV AZIZ',
            ),
          ),
          const SizedBox(height: AppSpacing.s3),
          Align(
            alignment: Alignment.centerRight,
            child: AppButton(
              label: l.buttonSave,
              variant: AppButtonVariant.secondary,
              size: AppButtonSize.sm,
              loading: _saving,
              onPressed: _saving ? null : _save,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Business mode section ────────────────────────────────────────────

class _BusinessModeSection extends ConsumerWidget {
  final SettingsState data;
  const _BusinessModeSection({required this.data});

  String _modeName(AppLocalizations l, String m) => m == 'SERVICES'
      ? l.settingsModeNameServices
      : m == 'PRODUCTS'
          ? l.navOrders
          : l.settingsModeNameFreelance;
  String _modeData(AppLocalizations l, String m) => m == 'SERVICES'
      ? l.settingsModeDataServices
      : m == 'PRODUCTS'
          ? l.settingsModeDataProducts
          : l.settingsModeDataFreelance;

  // Single-select with a HARD WARNING: picking the other mode opens a
  // confirmation dialog. Only on confirm do we save the new scalar mode;
  // on cancel nothing changes (no API call). No data is deleted on switch.
  Future<void> _select(
      BuildContext context, WidgetRef ref, String mode, String current) async {
    if (mode == current) return;
    final l = AppLocalizations.of(context)!;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: l.settingsModeSwitchTitle,
        content: Text(
          l.settingsModeSwitchBody(
              _modeName(l, current), _modeName(l, mode), _modeData(l, current)),
        ),
        actions: [
          AppButton(
            label: l.buttonCancel,
            variant: AppButtonVariant.ghost,
            size: AppButtonSize.sm,
            onPressed: () => Navigator.pop(ctx, false),
          ),
          AppButton(
            label: l.settingsModeSwitchConfirm(_modeName(l, mode)),
            variant: AppButtonVariant.danger,
            size: AppButtonSize.sm,
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    try {
      await ref.read(settingsProvider.notifier).saveMode(mode);
    } catch (e) {
      if (context.mounted) _snackErr(context, e);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final current = data.business.mode;

    // Pill segmented control. Tapping another mode opens the hard-warning dialog
    // via _select; it does NOT save until confirmed, and the control stays bound
    // to `current` so Cancel reverts it.
    Widget seg(String mode, String label) {
      final active = current == mode;
      return GestureDetector(
        onTap: () => _select(context, ref, mode, current),
        child: AnimatedContainer(
          duration: AppMotion.durFast,
          curve: AppMotion.ease,
          padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.s2, vertical: AppSpacing.s2),
          decoration: BoxDecoration(
            color: active ? t.surface : Colors.transparent,
            borderRadius: AppRadii.sm,
            boxShadow: active ? t.shadowSm : null,
          ),
          // Labels vary by language (e.g. uz "Buyurtmalar"); scaleDown shrinks a
          // long label to fit its third instead of overflowing the row.
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              maxLines: 1,
              style: TextStyle(
                fontSize: AppTextSizes.sm,
                fontWeight: AppFontWeights.semibold,
                color: active ? t.text1 : t.text2,
              ),
            ),
          ),
        ),
      );
    }

    return _SectionCard(
      icon: AppIconName.catalog,
      title: l.settingsBusinessMode,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: t.surface2,
          borderRadius: AppRadii.md,
        ),
        child: Row(
          children: [
            Expanded(child: seg('SERVICES', l.settingsModeNameServices)),
            const SizedBox(width: 2),
            Expanded(child: seg('FREELANCE', l.settingsModeNameFreelance)),
            // PRODUCTS mode is parked for launch: hide the option unless the
            // flag is on or this business is already in PRODUCTS mode.
            if (AppConfig.productsModeEnabled || current == 'PRODUCTS') ...[
              const SizedBox(width: 2),
              Expanded(child: seg('PRODUCTS', l.navOrders)),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Calendar sync section ────────────────────────────────────────────

class _CalendarSection extends ConsumerStatefulWidget {
  final SettingsState data;
  const _CalendarSection({required this.data});

  @override
  ConsumerState<_CalendarSection> createState() => _CalendarSectionState();
}

class _CalendarSectionState extends ConsumerState<_CalendarSection> {
  bool _loading = false;

  String? get _token => widget.data.business.calendarToken;

  String get _calendarUrl {
    final token = _token;
    if (token == null) return '';
    return '${ApiService.calendarBaseUrl}/calendar/$token.ics';
  }

  Future<void> _toggleCalendar(bool value) async {
    setState(() => _loading = true);
    try {
      final notifier = ref.read(settingsProvider.notifier);
      if (value) {
        await notifier.enableCalendarSync();
      } else {
        await notifier.disableCalendarSync();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  AppLocalizations.of(context)!.settingsCalendarSyncFailed)),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _copyCalendarUrl() {
    Clipboard.setData(ClipboardData(text: _calendarUrl));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(AppLocalizations.of(context)!.settingsCalendarLinkCopied),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _addToGoogleCalendar() async {
    final googleUrl = 'https://calendar.google.com/calendar/r/settings/addbyurl'
        '?url=${Uri.encodeComponent(_calendarUrl)}';
    final uri = Uri.parse(googleUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _addToAppleCalendar() async {
    final webcalUrl = _calendarUrl
        .replaceFirst('https://', 'webcal://')
        .replaceFirst('http://', 'webcal://');
    final uri = Uri.parse(webcalUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      final httpsUri = Uri.parse(_calendarUrl);
      if (await canLaunchUrl(httpsUri)) {
        await launchUrl(httpsUri, mode: LaunchMode.externalApplication);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final enabled = _token != null;

    return _SectionCard(
      icon: AppIconName.calendar,
      title: l.settingsCalendarSync,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.settingsCalendarSyncTitle,
                      style: TextStyle(
                        fontSize: AppTextSizes.base,
                        fontWeight: AppFontWeights.semibold,
                        color: t.text1,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      l.settingsCalendarSyncSubtitle,
                      style: TextStyle(
                          fontSize: AppTextSizes.caption, color: t.text2),
                    ),
                  ],
                ),
              ),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: AppSpacing.s3),
                  child: AppSpinner(),
                )
              else
                AppSwitch(
                  value: enabled,
                  onChanged: _toggleCalendar,
                ),
            ],
          ),
          if (enabled) ...[
            const SizedBox(height: AppSpacing.s4),
            Divider(height: 1, color: t.border),
            const SizedBox(height: AppSpacing.s4),
            Text(
              l.settingsCalendarLinkLabel,
              style: TextStyle(
                fontSize: AppTextSizes.caption,
                fontWeight: AppFontWeights.semibold,
                color: t.text2,
              ),
            ),
            const SizedBox(height: AppSpacing.s2),
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.s3, vertical: AppSpacing.s3),
              decoration: BoxDecoration(
                color: t.surface2,
                borderRadius: AppRadii.md,
                border: Border.all(color: t.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _calendarUrl,
                      style: TextStyle(
                        fontSize: AppTextSizes.caption,
                        color: t.text2,
                        fontFamily: 'monospace',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  GestureDetector(
                    onTap: _copyCalendarUrl,
                    child: AppIcon(
                        name: AppIconName.add, size: 18, color: t.accent),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.s4),
            AppButton(
              label: l.settingsAddToGoogleCalendar,
              variant: AppButtonVariant.secondary,
              leftIcon: AppIconName.calendar,
              fullWidth: true,
              onPressed: _addToGoogleCalendar,
            ),
            const SizedBox(height: AppSpacing.s2),
            AppButton(
              label: l.settingsAddToAppleCalendar,
              variant: AppButtonVariant.secondary,
              leftIcon: AppIconName.calendar,
              fullWidth: true,
              onPressed: _addToAppleCalendar,
            ),
            const SizedBox(height: AppSpacing.s2),
            Text(
              l.settingsCalendarSamsungNote,
              style: TextStyle(fontSize: AppTextSizes.caption, color: t.text3),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Reminders section ────────────────────────────────────────────────

class _RemindersSection extends ConsumerWidget {
  final SettingsState data;
  const _RemindersSection({required this.data});

  Future<void> _update(
    BuildContext context,
    WidgetRef ref,
    String key,
    Object value,
  ) async {
    try {
      await ref
          .read(reminderSettingsProvider.notifier)
          .updateSetting(key, value);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  AppLocalizations.of(context)!.settingsReminderSaveFailed)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final mode = data.business.mode;
    final settingsAsync = ref.watch(reminderSettingsProvider);

    return _SectionCard(
      icon: AppIconName.bell,
      title: l.settingsReminders,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.settingsRemindersSubtitle,
            style: TextStyle(fontSize: AppTextSizes.caption, color: t.text2),
          ),
          const SizedBox(height: AppSpacing.s2),
          settingsAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.s2),
              child: LinearProgressIndicator(),
            ),
            error: (e, _) => Padding(
              padding: const EdgeInsets.only(top: AppSpacing.s1),
              child: Text(
                l.settingsRemindersLoadFailed,
                style:
                    TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
              ),
            ),
            data: (s) {
              final tiles = <Widget>[];

              if (mode == 'SERVICES') {
                final apptEnabled = s['appointmentEnabled'] as bool? ?? true;
                tiles.add(_ReminderToggle(
                  title: l.settingsReminderAppointmentTitle,
                  subtitle: l.settingsReminderAppointmentSubtitle,
                  enabled: apptEnabled,
                  hoursBefore: s['appointmentHoursBefore'] as int? ?? 24,
                  onToggle: (v) =>
                      _update(context, ref, 'appointmentEnabled', v),
                  onTimingChange: (h) =>
                      _update(context, ref, 'appointmentHoursBefore', h),
                  timingOptions: const [1, 2, 3, 6, 12, 24, 48],
                ));
                if (apptEnabled) {
                  tiles.add(_ReminderToggle(
                    title: l.settingsReminderSecondTitle,
                    subtitle: l.settingsReminderSecondSubtitle,
                    enabled: s['appointmentSecondEnabled'] as bool? ?? true,
                    hoursBefore: s['appointmentSecondHoursBefore'] as int? ?? 1,
                    onToggle: (v) =>
                        _update(context, ref, 'appointmentSecondEnabled', v),
                    onTimingChange: (h) => _update(
                        context, ref, 'appointmentSecondHoursBefore', h),
                    timingOptions: const [1, 2, 3, 6],
                  ));
                }
              }

              // PRODUCTS dormant — never true now (mode is a scalar).
              if (mode == 'PRODUCTS') {
                tiles.add(_ReminderToggle(
                  title: l.settingsReminderDeliveryTitle,
                  subtitle: l.settingsReminderDeliverySubtitle,
                  enabled: s['deliveryEnabled'] as bool? ?? true,
                  hoursBefore: s['deliveryHoursBefore'] as int? ?? 24,
                  onToggle: (v) => _update(context, ref, 'deliveryEnabled', v),
                  onTimingChange: (h) =>
                      _update(context, ref, 'deliveryHoursBefore', h),
                  timingOptions: const [3, 6, 12, 24, 48],
                ));
              }

              if (mode == 'FREELANCE') {
                tiles.add(_ReminderToggle(
                  title: l.settingsReminderDeadlineTitle,
                  subtitle: l.settingsReminderDeadlineSubtitle,
                  enabled: s['deadlineEnabled'] as bool? ?? true,
                  hoursBefore: s['deadlineHoursBefore'] as int? ?? 48,
                  onToggle: (v) => _update(context, ref, 'deadlineEnabled', v),
                  onTimingChange: (h) =>
                      _update(context, ref, 'deadlineHoursBefore', h),
                  timingOptions: const [12, 24, 48, 72, 168],
                ));
              }

              return Column(children: tiles);
            },
          ),
          const SizedBox(height: AppSpacing.s2),
          Text(
            l.settingsRemindersFootnote,
            style: TextStyle(fontSize: AppTextSizes.caption, color: t.text3),
          ),
        ],
      ),
    );
  }
}

class _ReminderToggle extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool enabled;
  final int hoursBefore;
  final ValueChanged<bool> onToggle;
  final ValueChanged<int> onTimingChange;
  final List<int> timingOptions;

  const _ReminderToggle({
    required this.title,
    required this.subtitle,
    required this.enabled,
    required this.hoursBefore,
    required this.onToggle,
    required this.onTimingChange,
    required this.timingOptions,
  });

  String _label(AppLocalizations l, int hours) {
    if (hours < 24) return l.settingsReminderHoursBefore(hours);
    final days = hours ~/ 24;
    return l.settingsReminderDaysBefore(days);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final dropdownValue =
        timingOptions.contains(hoursBefore) ? hoursBefore : timingOptions.first;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: TextStyle(
                            fontSize: AppTextSizes.sm,
                            fontWeight: AppFontWeights.semibold,
                            color: t.text1)),
                    Text(subtitle,
                        style: TextStyle(
                            fontSize: AppTextSizes.caption, color: t.text2)),
                  ],
                ),
              ),
              AppSwitch(value: enabled, onChanged: onToggle),
            ],
          ),
          if (enabled) ...[
            const SizedBox(height: AppSpacing.s2),
            DropdownButtonFormField<int>(
              // ignore: deprecated_member_use
              value: dropdownValue,
              dropdownColor: t.surface,
              borderRadius: AppRadii.md,
              style: TextStyle(color: t.text1),
              decoration: _decoration(context),
              items: timingOptions
                  .map((h) =>
                      DropdownMenuItem(value: h, child: Text(_label(l, h))))
                  .toList(),
              onChanged: (v) {
                if (v != null) onTimingChange(v);
              },
            ),
          ],
        ],
      ),
    );
  }
}

// ── Bot section ──────────────────────────────────────────────────────

class _BotSection extends ConsumerStatefulWidget {
  final SettingsState data;
  const _BotSection({required this.data});

  @override
  ConsumerState<_BotSection> createState() => _BotSectionState();
}

class _BotSectionState extends ConsumerState<_BotSection> {
  final _tokenCtrl = TextEditingController();
  bool _editing = false;
  bool _saving = false;

  @override
  void dispose() {
    _tokenCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final token = _tokenCtrl.text.trim();
    if (token.isEmpty) return;
    setState(() => _saving = true);
    try {
      await ref.read(settingsProvider.notifier).saveBotToken(token);
      if (!mounted) return;
      setState(() {
        _editing = false;
        _saving = false;
        _tokenCtrl.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content:
                Text(AppLocalizations.of(context)!.settingsBotTokenUpdated)),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      _snackErr(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final data = widget.data;
    final hasBot = data.botUsername != null && data.botUsername!.isNotEmpty;
    // No bot yet → show the editor directly; otherwise show details + an edit
    // affordance to change the token (after revoking/replacing the bot).
    final editing = _editing || !hasBot;

    return _SectionCard(
      icon: AppIconName.inbox,
      title: l.settingsTelegramBot,
      trailing: editing
          ? null
          : _EditButton(
              onPressed: () => setState(() => _editing = true),
              tooltip: l.settingsChangeBot,
            ),
      child: editing
          ? _editor(context, l, t, hasBot)
          : _display(context, l, t, data),
    );
  }

  Widget _editor(
      BuildContext context, AppLocalizations l, AppTokens t, bool hasBot) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _tokenCtrl,
          autofocus: true,
          style: TextStyle(color: t.text1),
          decoration: _decoration(context,
              label: l.onboardingBotPasteToken, hint: '1234567890:AAHxyz...'),
        ),
        const SizedBox(height: AppSpacing.s2),
        Text(
          l.settingsBotTokenHint,
          style: TextStyle(fontSize: AppTextSizes.caption, color: t.text3),
        ),
        const SizedBox(height: AppSpacing.s3),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            if (hasBot) ...[
              AppButton(
                label: l.buttonCancel,
                variant: AppButtonVariant.ghost,
                size: AppButtonSize.sm,
                onPressed: _saving
                    ? null
                    : () => setState(() {
                          _editing = false;
                          _tokenCtrl.clear();
                        }),
              ),
              const SizedBox(width: AppSpacing.s2),
            ],
            AppButton(
              label: l.buttonSave,
              variant: AppButtonVariant.secondary,
              size: AppButtonSize.sm,
              loading: _saving,
              onPressed: _saving ? null : _save,
            ),
          ],
        ),
      ],
    );
  }

  Widget _display(BuildContext context, AppLocalizations l, AppTokens t,
      SettingsState data) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            AppIcon(name: AppIconName.inbox, size: 18, color: t.accent),
            const SizedBox(width: AppSpacing.s1),
            Text(
              '@${data.botUsername}',
              style: TextStyle(
                  fontWeight: AppFontWeights.medium,
                  fontSize: AppTextSizes.sm,
                  color: t.text1),
            ),
          ],
        ),
        if (data.botLink != null) ...[
          const SizedBox(height: AppSpacing.s2),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.s3, vertical: AppSpacing.s2),
                  decoration: BoxDecoration(
                    color: t.surface2,
                    borderRadius: AppRadii.sm,
                    border: Border.all(color: t.border),
                  ),
                  child: Text(
                    data.botLink!,
                    style: TextStyle(
                      fontSize: AppTextSizes.caption,
                      color: t.text2,
                      fontFamily: 'monospace',
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              IconButton(
                icon: AppIcon(name: AppIconName.add, size: 18, color: t.accent),
                tooltip: l.settingsCopyLinkTooltip,
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: data.botLink!));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(l.settingsBotLinkCopied),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ],
      ],
    );
  }
}

// ── Language section ─────────────────────────────────────────────────

class _LanguageSection extends ConsumerWidget {
  final SettingsState data;
  const _LanguageSection({required this.data});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    // Reflect the app locale (what the user currently sees).
    final currentCode = ref.watch(localeProvider).languageCode;

    return _SectionCard(
      icon: AppIconName.settings,
      title: l.settingsLanguage,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SegmentedButton<String>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: 'uz', label: Text("O'zbek")),
              ButtonSegment(value: 'ru', label: Text('Русский')),
              ButtonSegment(value: 'en', label: Text('English')),
            ],
            selected: {currentCode},
            onSelectionChanged: (s) async {
              final code = s.first;
              // Update the UI immediately.
              await ref.read(localeProvider.notifier).setLocale(code);
              try {
                // Persist on the business so the bot uses it too.
                await ref
                    .read(settingsProvider.notifier)
                    .saveLanguage(LocaleNotifier.codeToEnum(code));
              } catch (e) {
                if (context.mounted) _snackErr(context, e);
              }
            },
          ),
          const SizedBox(height: AppSpacing.s2),
          Text(
            l.settingsLanguageFootnote,
            style: TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
          ),
        ],
      ),
    );
  }
}

// ── Customer fields section ──────────────────────────────────────────

class _CustomerFieldsSection extends ConsumerStatefulWidget {
  const _CustomerFieldsSection();

  @override
  ConsumerState<_CustomerFieldsSection> createState() =>
      _CustomerFieldsSectionState();
}

class _CustomerFieldsSectionState
    extends ConsumerState<_CustomerFieldsSection> {
  static const _typeIcons = {
    'TEXT': AppIconName.settings,
    'NUMBER': AppIconName.analytics,
    'DATE': AppIconName.calendar,
    'YESNO': AppIconName.paid,
  };

  Future<void> _addField() async {
    final result = await showDialog<({String name, String fieldType})>(
      context: context,
      builder: (_) => const _AddFieldDialog(),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(customFieldsProvider.notifier)
          .add(result.name, result.fieldType);
    } catch (e) {
      if (mounted) _snackErr(context, e);
    }
  }

  Future<void> _removeField(String fieldId) async {
    try {
      await ref.read(customFieldsProvider.notifier).remove(fieldId);
    } catch (e) {
      if (mounted) _snackErr(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final fieldsAsync = ref.watch(customFieldsProvider);

    return _SectionCard(
      icon: AppIconName.customers,
      title: l.settingsCustomerFields,
      trailing:
          _AddButton(onPressed: _addField, tooltip: l.settingsAddFieldTooltip),
      child: fieldsAsync.when(
        loading: () => const Padding(
          padding: EdgeInsets.symmetric(vertical: AppSpacing.s2),
          child: LinearProgressIndicator(),
        ),
        error: (e, _) => Text(l.errorWithMessage(e.toString()),
            style: TextStyle(color: t.errorStrong, fontSize: AppTextSizes.sm)),
        data: (fields) {
          if (fields.isEmpty) {
            return Text(
              l.settingsNoCustomFields,
              style: TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
            );
          }
          return Column(
            children: fields
                .map((f) => _FieldTile(
                      field: f,
                      icon: _typeIcons[f.fieldType] ?? AppIconName.settings,
                      onDelete: () => _removeField(f.id),
                    ))
                .toList(),
          );
        },
      ),
    );
  }
}

class _AddFieldDialog extends StatefulWidget {
  const _AddFieldDialog();

  @override
  State<_AddFieldDialog> createState() => _AddFieldDialogState();
}

class _AddFieldDialogState extends State<_AddFieldDialog> {
  final _nameCtrl = TextEditingController();
  String _selectedType = 'TEXT';

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final fieldTypes = [
      ('TEXT', l.settingsFieldTypeText),
      ('NUMBER', l.settingsFieldTypeNumber),
      ('DATE', l.settingsFieldTypeDate),
      ('YESNO', l.settingsFieldTypeYesNo),
    ];
    return AppDialog(
      title: l.settingsAddCustomerField,
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameCtrl,
            autofocus: true,
            style: TextStyle(color: t.text1),
            decoration: _decoration(context,
                label: l.settingsFieldNameLabel, hint: l.settingsFieldNameHint),
          ),
          const SizedBox(height: AppSpacing.s4),
          Text(l.settingsFieldTypeLabel,
              style: TextStyle(fontSize: AppTextSizes.caption, color: t.text2)),
          const SizedBox(height: AppSpacing.s2),
          Wrap(
            spacing: AppSpacing.s2,
            children: fieldTypes.map((entry) {
              final (value, label) = entry;
              return ChoiceChip(
                label: Text(label),
                selected: _selectedType == value,
                onSelected: (_) => setState(() => _selectedType = value),
              );
            }).toList(),
          ),
        ],
      ),
      actions: [
        AppButton(
          label: l.buttonCancel,
          variant: AppButtonVariant.ghost,
          size: AppButtonSize.sm,
          onPressed: () => Navigator.pop(context),
        ),
        AppButton(
          label: l.buttonAdd,
          size: AppButtonSize.sm,
          onPressed: () {
            final name = _nameCtrl.text.trim();
            if (name.isEmpty) return;
            Navigator.pop(context, (name: name, fieldType: _selectedType));
          },
        ),
      ],
    );
  }
}

class _FieldTile extends StatelessWidget {
  final BusinessCustomField field;
  final AppIconName icon;
  final VoidCallback onDelete;
  const _FieldTile(
      {required this.field, required this.icon, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: AppIcon(name: icon, size: 18, color: t.text2),
      title: Text(field.name,
          style: TextStyle(fontSize: AppTextSizes.sm, color: t.text1)),
      subtitle: Text(field.fieldType.toLowerCase(),
          style: TextStyle(fontSize: AppTextSizes.caption, color: t.text3)),
      trailing: IconButton(
        icon: AppIcon(name: AppIconName.close, size: 18, color: t.errorStrong),
        visualDensity: VisualDensity.compact,
        onPressed: onDelete,
      ),
    );
  }
}

// ── Stages section ────────────────────────────────────────────────────

class _StagesSection extends ConsumerStatefulWidget {
  const _StagesSection();

  @override
  ConsumerState<_StagesSection> createState() => _StagesSectionState();
}

class _StagesSectionState extends ConsumerState<_StagesSection> {
  Future<void> _addStage() async {
    final result = await showDialog<({String name, String color})>(
      context: context,
      builder: (_) => const _AddStageDialog(),
    );
    if (result == null || !mounted) return;
    try {
      await ref.read(stagesProvider.notifier).add(result.name, result.color);
    } catch (e) {
      if (mounted) _snackErr(context, e);
    }
  }

  Future<void> _removeStage(String stageId) async {
    try {
      await ref.read(stagesProvider.notifier).remove(stageId);
    } catch (e) {
      if (mounted) _snackErr(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final stagesAsync = ref.watch(stagesProvider);

    return _SectionCard(
      icon: AppIconName.growth,
      title: l.settingsPipelineStages,
      trailing:
          _AddButton(onPressed: _addStage, tooltip: l.settingsAddStageTooltip),
      child: stagesAsync.when(
        loading: () => const Padding(
          padding: EdgeInsets.symmetric(vertical: AppSpacing.s2),
          child: LinearProgressIndicator(),
        ),
        error: (e, _) => Text(l.errorWithMessage(e.toString()),
            style: TextStyle(color: t.errorStrong, fontSize: AppTextSizes.sm)),
        data: (stages) {
          if (stages.isEmpty) {
            return Text(
              l.settingsNoStages,
              style: TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
            );
          }
          return Column(
            children: stages
                .map((s) =>
                    _StageTile(stage: s, onDelete: () => _removeStage(s.id)))
                .toList(),
          );
        },
      ),
    );
  }
}

class _AddStageDialog extends StatefulWidget {
  const _AddStageDialog();

  @override
  State<_AddStageDialog> createState() => _AddStageDialogState();
}

class _AddStageDialogState extends State<_AddStageDialog> {
  static const _palette = [
    '#6366F1',
    '#8B5CF6',
    '#EC4899',
    '#EF4444',
    '#F97316',
    '#EAB308',
    '#22C55E',
    '#14B8A6',
    '#3C83F6',
    '#6B7280',
  ];

  final _nameCtrl = TextEditingController();
  String _selectedColor = _palette[0];

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return AppDialog(
      title: l.settingsAddStage,
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameCtrl,
            autofocus: true,
            style: TextStyle(color: t.text1),
            decoration: _decoration(context,
                label: l.settingsStageNameLabel, hint: l.settingsStageNameHint),
          ),
          const SizedBox(height: AppSpacing.s4),
          Text(l.settingsColorLabel,
              style: TextStyle(fontSize: AppTextSizes.caption, color: t.text2)),
          const SizedBox(height: AppSpacing.s2),
          Wrap(
            spacing: AppSpacing.s2,
            runSpacing: AppSpacing.s2,
            children: _palette.map((hex) {
              final color =
                  Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
              return GestureDetector(
                onTap: () => setState(() => _selectedColor = hex),
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: _selectedColor == hex
                        ? Border.all(color: t.text1, width: 2)
                        : null,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
      actions: [
        AppButton(
          label: l.buttonCancel,
          variant: AppButtonVariant.ghost,
          size: AppButtonSize.sm,
          onPressed: () => Navigator.pop(context),
        ),
        AppButton(
          label: l.buttonAdd,
          size: AppButtonSize.sm,
          onPressed: () {
            final name = _nameCtrl.text.trim();
            if (name.isEmpty) return;
            Navigator.pop(context, (name: name, color: _selectedColor));
          },
        ),
      ],
    );
  }
}

class _StageTile extends StatelessWidget {
  final CustomerStage stage;
  final VoidCallback onDelete;
  const _StageTile({required this.stage, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final color =
        Color(int.parse('FF${stage.color.replaceFirst('#', '')}', radix: 16));
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      title: Text(stage.name,
          style: TextStyle(fontSize: AppTextSizes.sm, color: t.text1)),
      trailing: IconButton(
        icon: AppIcon(name: AppIconName.close, size: 18, color: t.errorStrong),
        visualDensity: VisualDensity.compact,
        onPressed: onDelete,
      ),
    );
  }
}

// ── Checkout questions section ────────────────────────────────────────

class _CheckoutQuestionsSection extends ConsumerStatefulWidget {
  const _CheckoutQuestionsSection();

  @override
  ConsumerState<_CheckoutQuestionsSection> createState() =>
      _CheckoutQuestionsSectionState();
}

class _CheckoutQuestionsSectionState
    extends ConsumerState<_CheckoutQuestionsSection> {
  Future<void> _addQuestion() async {
    final result = await showDialog<({String question, bool required})>(
      context: context,
      builder: (_) => const _AddQuestionDialog(),
    );
    if (result == null || !mounted) return;
    try {
      await ref
          .read(checkoutQuestionsProvider.notifier)
          .add(result.question, result.required);
    } catch (e) {
      if (mounted) _snackErr(context, e);
    }
  }

  Future<void> _removeQuestion(String id) async {
    try {
      await ref.read(checkoutQuestionsProvider.notifier).remove(id);
    } catch (e) {
      if (mounted) _snackErr(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final questionsAsync = ref.watch(checkoutQuestionsProvider);

    return _SectionCard(
      icon: AppIconName.orders,
      title: l.settingsCheckoutQuestions,
      trailing: _AddButton(
          onPressed: _addQuestion, tooltip: l.settingsAddQuestionTooltip),
      child: questionsAsync.when(
        loading: () => const Padding(
          padding: EdgeInsets.symmetric(vertical: AppSpacing.s2),
          child: LinearProgressIndicator(),
        ),
        error: (e, _) => Text(l.errorWithMessage(e.toString()),
            style: TextStyle(color: t.errorStrong, fontSize: AppTextSizes.sm)),
        data: (questions) {
          if (questions.isEmpty) {
            return Text(
              l.settingsNoCheckoutQuestions,
              style: TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
            );
          }
          return Column(
            children: questions
                .map((q) => _QuestionTile(
                      question: q,
                      onDelete: () => _removeQuestion(q.id),
                    ))
                .toList(),
          );
        },
      ),
    );
  }
}

class _AddQuestionDialog extends StatefulWidget {
  const _AddQuestionDialog();

  @override
  State<_AddQuestionDialog> createState() => _AddQuestionDialogState();
}

class _AddQuestionDialogState extends State<_AddQuestionDialog> {
  final _questionCtrl = TextEditingController();
  bool _isRequired = false;

  @override
  void dispose() {
    _questionCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return AppDialog(
      title: l.settingsAddCheckoutQuestion,
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _questionCtrl,
            autofocus: true,
            maxLines: 3,
            style: TextStyle(color: t.text1),
            decoration: _decoration(context,
                label: l.settingsQuestionLabel, hint: l.settingsQuestionHint),
          ),
          const SizedBox(height: AppSpacing.s3),
          Row(
            children: [
              Expanded(
                child: Text(l.commonRequired,
                    style:
                        TextStyle(fontSize: AppTextSizes.sm, color: t.text1)),
              ),
              AppSwitch(
                value: _isRequired,
                onChanged: (v) => setState(() => _isRequired = v),
              ),
            ],
          ),
        ],
      ),
      actions: [
        AppButton(
          label: l.buttonCancel,
          variant: AppButtonVariant.ghost,
          size: AppButtonSize.sm,
          onPressed: () => Navigator.pop(context),
        ),
        AppButton(
          label: l.buttonAdd,
          size: AppButtonSize.sm,
          onPressed: () {
            final text = _questionCtrl.text.trim();
            if (text.isEmpty) return;
            Navigator.pop(context, (question: text, required: _isRequired));
          },
        ),
      ],
    );
  }
}

class _QuestionTile extends StatelessWidget {
  final CheckoutQuestion question;
  final VoidCallback onDelete;
  const _QuestionTile({required this.question, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final reqColor = question.required ? t.warningStrong : t.text3;
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: AppIcon(name: AppIconName.orders, size: 18, color: reqColor),
      title: Text(question.question,
          style: TextStyle(fontSize: AppTextSizes.sm, color: t.text1),
          maxLines: 2),
      subtitle: Text(
        question.required ? l.commonRequired : l.commonOptionalLabel,
        style: TextStyle(fontSize: AppTextSizes.caption, color: reqColor),
      ),
      trailing: IconButton(
        icon: AppIcon(name: AppIconName.close, size: 18, color: t.errorStrong),
        visualDensity: VisualDensity.compact,
        onPressed: onDelete,
      ),
    );
  }
}

// ── Services / Staff links ────────────────────────────────────────────

class _ServicesSection extends StatelessWidget {
  const _ServicesSection();

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return _SectionCard(
      icon: AppIconName.calendar,
      title: l.settingsServices,
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l.settingsManageServices, style: TextStyle(color: t.text1)),
        trailing: Icon(Icons.chevron_right, size: 20, color: t.text3),
        dense: true,
        onTap: () => context.push('/services'),
      ),
    );
  }
}

class _StaffSection extends StatelessWidget {
  const _StaffSection();

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return _SectionCard(
      icon: AppIconName.staff,
      title: l.settingsStaff,
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(l.settingsManageStaff, style: TextStyle(color: t.text1)),
        trailing: Icon(Icons.chevron_right, size: 20, color: t.text3),
        dense: true,
        onTap: () => context.push('/staff'),
      ),
    );
  }
}

// ── Working hours section ────────────────────────────────────────────

// UI renders Monday → Sunday, but each row carries its BACKEND key: the
// backend convention is 0=Sunday … 6=Saturday, so Sunday is "0", Monday "1".
// Never write Monday as "0".
const _kDayKeys = <String>['1', '2', '3', '4', '5', '6', '0'];

// One open interval within a day. A day with several intervals has breaks/lunch
// in the gaps between them; an empty list = closed.
class _Interval {
  final TimeOfDay start;
  final TimeOfDay end;
  const _Interval(this.start, this.end);
}

int _todMinutes(TimeOfDay t) => t.hour * 60 + t.minute;

TimeOfDay _parseHHMM(String s, TimeOfDay fallback) {
  final parts = s.split(':');
  if (parts.length != 2) return fallback;
  final h = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  if (h == null || m == null) return fallback;
  return TimeOfDay(hour: h, minute: m);
}

class _WorkingHoursSection extends ConsumerStatefulWidget {
  final SettingsState data;
  const _WorkingHoursSection({required this.data});

  @override
  ConsumerState<_WorkingHoursSection> createState() =>
      _WorkingHoursSectionState();
}

class _WorkingHoursSectionState extends ConsumerState<_WorkingHoursSection> {
  // Per backend day key → list of open intervals. Empty list = closed.
  late final Map<String, List<_Interval>> _days;
  late final TextEditingController _bufferCtrl;
  bool _saving = false;
  String? _error;

  static const _defaultInterval =
      _Interval(TimeOfDay(hour: 9, minute: 0), TimeOfDay(hour: 18, minute: 0));

  @override
  void initState() {
    super.initState();
    final wh = widget.data.business.workingHours;
    final configured = wh != null && wh.isNotEmpty;
    _days = {
      for (final key in _kDayKeys)
        key: !configured ? [_defaultInterval] : _parseDay(wh[key]),
    };
    _bufferCtrl = TextEditingController(
        text: widget.data.business.bufferMinutes.toString());
  }

  // Parse a stored day value: a list of intervals (new), a single { start,end }
  // object (legacy), or null/absent (closed → empty list).
  List<_Interval> _parseDay(dynamic v) {
    if (v is List) {
      return v.whereType<Map>().map(_intervalFromMap).toList();
    }
    if (v is Map) {
      return [_intervalFromMap(v)];
    }
    return []; // null or absent = closed
  }

  _Interval _intervalFromMap(Map v) => _Interval(
        _parseHHMM(v['start']?.toString() ?? '09:00', _defaultInterval.start),
        _parseHHMM(v['end']?.toString() ?? '18:00', _defaultInterval.end),
      );

  @override
  void dispose() {
    _bufferCtrl.dispose();
    super.dispose();
  }

  String _dayLabel(AppLocalizations l, String key) {
    switch (key) {
      case '1':
        return l.schedulingDayMon;
      case '2':
        return l.schedulingDayTue;
      case '3':
        return l.schedulingDayWed;
      case '4':
        return l.schedulingDayThu;
      case '5':
        return l.schedulingDayFri;
      case '6':
        return l.schedulingDaySat;
      default:
        return l.schedulingDaySun;
    }
  }

  void _setDayOpen(String key, bool open) {
    setState(() {
      _error = null;
      _days[key] =
          open ? (_days[key]!.isEmpty ? [_defaultInterval] : _days[key]!) : [];
    });
  }

  void _setTime(String key, int idx, bool isStart, TimeOfDay picked) {
    setState(() {
      _error = null;
      final list = _days[key]!;
      final iv = list[idx];
      list[idx] =
          isStart ? _Interval(picked, iv.end) : _Interval(iv.start, picked);
    });
  }

  void _addInterval(String key) {
    setState(() {
      _error = null;
      final list = _days[key]!;
      // New interval starts where the last ends (a 1h block); the owner then
      // moves its start later to leave a break between them.
      final lastEnd = list.isNotEmpty ? _todMinutes(list.last.end) : 9 * 60;
      final startMin = lastEnd > 22 * 60 ? 22 * 60 : lastEnd;
      final endMin = startMin + 60;
      list.add(_Interval(
        TimeOfDay(hour: startMin ~/ 60, minute: startMin % 60),
        TimeOfDay(hour: endMin ~/ 60, minute: endMin % 60),
      ));
    });
  }

  void _removeInterval(String key, int idx) {
    setState(() {
      _error = null;
      _days[key]!.removeAt(idx);
    });
  }

  Future<void> _save() async {
    final l = AppLocalizations.of(context)!;
    // Validate: each interval start < end, and a day's intervals don't overlap.
    for (final key in _kDayKeys) {
      final list = _days[key]!;
      for (final iv in list) {
        if (_todMinutes(iv.start) >= _todMinutes(iv.end)) {
          setState(() => _error = l.schedulingTimeInvalid);
          return;
        }
      }
      final sorted = [...list]
        ..sort((a, b) => _todMinutes(a.start).compareTo(_todMinutes(b.start)));
      for (var i = 1; i < sorted.length; i++) {
        if (_todMinutes(sorted[i].start) < _todMinutes(sorted[i - 1].end)) {
          setState(() => _error = l.schedulingOverlap);
          return;
        }
      }
    }
    // Assemble the backend map keyed "0".."6". Closed = null; open = intervals.
    final workingHours = <String, dynamic>{
      for (final key in _kDayKeys)
        key: _days[key]!.isEmpty
            ? null
            : [
                for (final iv in _days[key]!)
                  {
                    'start': formatTimeOfDay(iv.start),
                    'end': formatTimeOfDay(iv.end),
                  }
              ],
    };
    final buffer = (int.tryParse(_bufferCtrl.text.trim()) ?? 0).clamp(0, 120);

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(settingsProvider.notifier)
          .saveWorkingHours(workingHours, buffer);
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l.schedulingWorkingHoursSaved)),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      _snackErr(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    return _SectionCard(
      icon: AppIconName.calendar,
      title: l.schedulingWorkingHours,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.schedulingWorkingHoursHint,
            style: TextStyle(fontSize: AppTextSizes.caption, color: t.text2),
          ),
          const SizedBox(height: AppSpacing.s2),
          for (final key in _kDayKeys) _dayRow(context, l, t, key),
          const SizedBox(height: AppSpacing.s3),
          Divider(height: 1, color: t.border),
          const SizedBox(height: AppSpacing.s3),
          Text(
            l.schedulingBuffer,
            style: TextStyle(
                fontSize: AppTextSizes.sm,
                fontWeight: AppFontWeights.semibold,
                color: t.text1),
          ),
          const SizedBox(height: AppSpacing.s2),
          Row(
            children: [
              SizedBox(
                width: 88,
                child: TextField(
                  controller: _bufferCtrl,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  style: TextStyle(color: t.text1),
                  textAlign: TextAlign.center,
                  decoration: _decoration(context),
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              Text(l.schedulingBufferUnit,
                  style: TextStyle(fontSize: AppTextSizes.sm, color: t.text2)),
            ],
          ),
          const SizedBox(height: AppSpacing.s1),
          Text(
            l.schedulingBufferHint,
            style: TextStyle(fontSize: AppTextSizes.caption, color: t.text3),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.s3),
            Text(_error!,
                style:
                    TextStyle(color: t.errorStrong, fontSize: AppTextSizes.sm)),
          ],
          const SizedBox(height: AppSpacing.s3),
          Align(
            alignment: Alignment.centerRight,
            child: AppButton(
              label: l.buttonSave,
              variant: AppButtonVariant.secondary,
              size: AppButtonSize.sm,
              loading: _saving,
              onPressed: _saving ? null : _save,
            ),
          ),
        ],
      ),
    );
  }

  Widget _dayRow(
      BuildContext context, AppLocalizations l, AppTokens t, String key) {
    final list = _days[key]!;
    final open = list.isNotEmpty;
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.s2),
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.s3, vertical: AppSpacing.s3),
      decoration: BoxDecoration(
        color: open ? t.surface : t.surface2,
        borderRadius: AppRadii.md,
        border: Border.all(color: t.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Toggle + day on the left; "Unavailable" when closed.
          Row(
            children: [
              AppSwitch(value: open, onChanged: (v) => _setDayOpen(key, v)),
              const SizedBox(width: AppSpacing.s3),
              Text(
                _dayLabel(l, key),
                style: TextStyle(
                    fontSize: AppTextSizes.sm,
                    fontWeight: AppFontWeights.bold,
                    color: t.text1),
              ),
              const Spacer(),
              if (!open)
                Text(
                  l.schedulingUnavailable,
                  style: TextStyle(
                      fontSize: AppTextSizes.sm,
                      fontStyle: FontStyle.italic,
                      color: t.text3),
                ),
            ],
          ),
          if (open) ...[
            // One row per open interval; gaps between them are breaks/lunch.
            for (var i = 0; i < list.length; i++) ...[
              const SizedBox(height: AppSpacing.s2),
              Row(
                children: [
                  Expanded(
                    child: _TimeDropdown(
                      value: list[i].start,
                      onChanged: (v) => _setTime(key, i, true, v),
                    ),
                  ),
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: AppSpacing.s2),
                    child: Text('–', style: TextStyle(color: t.text3)),
                  ),
                  Expanded(
                    child: _TimeDropdown(
                      value: list[i].end,
                      onChanged: (v) => _setTime(key, i, false, v),
                    ),
                  ),
                  // Remove this interval (only when there's more than one; to
                  // close the day entirely, use the toggle).
                  if (list.length > 1)
                    IconButton(
                      icon: Icon(Icons.close, size: 18, color: t.text3),
                      visualDensity: VisualDensity.compact,
                      tooltip: l.schedulingRemoveSlot,
                      onPressed: () => _removeInterval(key, i),
                    )
                  else
                    const SizedBox(width: 40),
                ],
              ),
            ],
            const SizedBox(height: AppSpacing.s2),
            GestureDetector(
              onTap: () => _addInterval(key),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.add, size: 16, color: t.accent),
                  const SizedBox(width: AppSpacing.s1),
                  Text(
                    l.schedulingAddHours,
                    style: TextStyle(
                        fontSize: AppTextSizes.caption,
                        fontWeight: AppFontWeights.semibold,
                        color: t.accent),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TimeChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _TimeChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.s3, vertical: AppSpacing.s2),
        decoration: BoxDecoration(
          color: t.surface,
          borderRadius: AppRadii.sm,
          border: Border.all(color: t.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: AppTextSizes.sm,
            fontWeight: AppFontWeights.semibold,
            color: t.text1,
          ),
        ),
      ),
    );
  }
}

/// 24h "HH:mm" dropdown in 30-minute steps, styled as a pill — mirrors the web
/// TimeSelect so the owner always picks Tashkent 24h time (locale-independent).
class _TimeDropdown extends StatelessWidget {
  final TimeOfDay value;
  final ValueChanged<TimeOfDay> onChanged;
  const _TimeDropdown({required this.value, required this.onChanged});

  static final List<String> _options = [
    for (var h = 0; h < 24; h++)
      for (final m in const [0, 30])
        '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}',
  ];

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    final current = formatTimeOfDay(value);
    // Keep an off-grid stored value selectable.
    final options =
        _options.contains(current) ? _options : [current, ..._options];
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.s3, vertical: 2),
      decoration: BoxDecoration(
        color: t.surface2,
        borderRadius: AppRadii.pill,
        border: Border.all(color: t.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: current,
          isExpanded: true,
          isDense: true,
          dropdownColor: t.surface,
          borderRadius: AppRadii.md,
          iconEnabledColor: t.text3,
          style: TextStyle(
            fontSize: AppTextSizes.sm,
            fontWeight: AppFontWeights.semibold,
            color: t.text1,
          ),
          items: [
            for (final o in options) DropdownMenuItem(value: o, child: Text(o)),
          ],
          onChanged: (v) {
            if (v != null) onChanged(_parseHHMM(v, value));
          },
        ),
      ),
    );
  }
}

// ── Blocked time section ─────────────────────────────────────────────

class _BlockedTimeSection extends ConsumerWidget {
  const _BlockedTimeSection();

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final result = await showDialog<_BlockedDraft>(
      context: context,
      builder: (_) => const _AddBlockedDialog(),
    );
    if (result == null || !context.mounted) return;
    try {
      await ref.read(blockedTimeProvider.notifier).add(
            staffId: result.staffId,
            startTime: tashkentWallClockToIso(result.date, result.start),
            endTime: tashkentWallClockToIso(result.date, result.end),
            reason: result.reason,
          );
    } catch (e) {
      if (context.mounted) _snackErr(context, e);
    }
  }

  Future<void> _delete(
      BuildContext context, WidgetRef ref, BlockedSlot slot) async {
    final l = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppDialog(
        title: l.schedulingDeleteBlockedTitle,
        content: Text(l.schedulingDeleteBlockedConfirm),
        actions: [
          AppButton(
            label: l.buttonCancel,
            variant: AppButtonVariant.ghost,
            size: AppButtonSize.sm,
            onPressed: () => Navigator.pop(ctx, false),
          ),
          AppButton(
            label: l.buttonDelete,
            variant: AppButtonVariant.danger,
            size: AppButtonSize.sm,
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ref.read(blockedTimeProvider.notifier).remove(slot.id);
    } catch (e) {
      if (context.mounted) _snackErr(context, e);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final blockedAsync = ref.watch(blockedTimeProvider);

    return _SectionCard(
      icon: AppIconName.calendar,
      title: l.schedulingBlockedTime,
      trailing: _AddButton(
        onPressed: () => _add(context, ref),
        tooltip: l.schedulingAddBlocked,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.schedulingBlockedTimeHint,
            style: TextStyle(fontSize: AppTextSizes.caption, color: t.text2),
          ),
          const SizedBox(height: AppSpacing.s2),
          blockedAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.s2),
              child: LinearProgressIndicator(),
            ),
            error: (e, _) => Text(l.errorWithMessage(e.toString()),
                style:
                    TextStyle(color: t.errorStrong, fontSize: AppTextSizes.sm)),
            data: (slots) {
              if (slots.isEmpty) {
                return Text(
                  l.schedulingNoBlocked,
                  style:
                      TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
                );
              }
              return Column(
                children: slots
                    .map((s) => _BlockedTile(
                          slot: s,
                          onDelete: () => _delete(context, ref, s),
                        ))
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _BlockedTile extends StatelessWidget {
  final BlockedSlot slot;
  final VoidCallback onDelete;
  const _BlockedTile({required this.slot, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final scope = slot.staffName ?? l.schedulingWholeBusiness;
    final subtitle = slot.reason != null && slot.reason!.isNotEmpty
        ? '$scope · ${slot.reason}'
        : scope;
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      title: Text(
        '${formatTashkentDate(slot.startTime)} · '
        '${formatTashkentTime(slot.startTime)}–${formatTashkentTime(slot.endTime)}',
        style: TextStyle(
            fontSize: AppTextSizes.sm,
            fontWeight: AppFontWeights.semibold,
            color: t.text1),
      ),
      subtitle: Text(subtitle,
          style: TextStyle(fontSize: AppTextSizes.caption, color: t.text2)),
      trailing: IconButton(
        icon: AppIcon(name: AppIconName.close, size: 18, color: t.errorStrong),
        visualDensity: VisualDensity.compact,
        onPressed: onDelete,
      ),
    );
  }
}

class _BlockedDraft {
  final DateTime date;
  final TimeOfDay start;
  final TimeOfDay end;
  final String? staffId;
  final String? reason;
  const _BlockedDraft({
    required this.date,
    required this.start,
    required this.end,
    this.staffId,
    this.reason,
  });
}

class _AddBlockedDialog extends ConsumerStatefulWidget {
  const _AddBlockedDialog();

  @override
  ConsumerState<_AddBlockedDialog> createState() => _AddBlockedDialogState();
}

class _AddBlockedDialogState extends ConsumerState<_AddBlockedDialog> {
  // Tashkent "today" as the initial/min date (device-tz independent).
  DateTime get _tashkentToday {
    final n = DateTime.now().toUtc().add(const Duration(hours: 5));
    return DateTime(n.year, n.month, n.day);
  }

  late DateTime _date = _tashkentToday;
  TimeOfDay _start = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _end = const TimeOfDay(hour: 18, minute: 0);
  String? _staffId; // null = whole business
  final _reasonCtrl = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: _tashkentToday,
      lastDate: DateTime(_tashkentToday.year + 2),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _start : _end,
    );
    if (picked == null) return;
    setState(() {
      _error = null;
      if (isStart) {
        _start = picked;
      } else {
        _end = picked;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final staffAsync = ref.watch(staffProvider);
    final staff = staffAsync.valueOrNull ?? const <Staff>[];

    return AppDialog(
      title: l.schedulingAddBlocked,
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Date
            Text(l.schedulingDate,
                style:
                    TextStyle(fontSize: AppTextSizes.caption, color: t.text2)),
            const SizedBox(height: AppSpacing.s1),
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.s3, vertical: AppSpacing.s3),
                decoration: BoxDecoration(
                  color: t.surface,
                  borderRadius: AppRadii.sm,
                  border: Border.all(color: t.border),
                ),
                child:
                    Text(formatDate(_date), style: TextStyle(color: t.text1)),
              ),
            ),
            const SizedBox(height: AppSpacing.s3),
            // Start / End
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l.schedulingStart,
                          style: TextStyle(
                              fontSize: AppTextSizes.caption, color: t.text2)),
                      const SizedBox(height: AppSpacing.s1),
                      _TimeChip(
                          label: formatTimeOfDay(_start),
                          onTap: () => _pickTime(true)),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.s3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l.schedulingEnd,
                          style: TextStyle(
                              fontSize: AppTextSizes.caption, color: t.text2)),
                      const SizedBox(height: AppSpacing.s1),
                      _TimeChip(
                          label: formatTimeOfDay(_end),
                          onTap: () => _pickTime(false)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.s3),
            // Scope
            Text(l.schedulingScope,
                style:
                    TextStyle(fontSize: AppTextSizes.caption, color: t.text2)),
            const SizedBox(height: AppSpacing.s1),
            DropdownButtonFormField<String?>(
              // ignore: deprecated_member_use
              value: _staffId,
              dropdownColor: t.surface,
              borderRadius: AppRadii.md,
              style: TextStyle(color: t.text1),
              decoration: _decoration(context),
              items: [
                DropdownMenuItem<String?>(
                  value: null,
                  child: Text(l.schedulingWholeBusiness),
                ),
                ...staff.map((m) => DropdownMenuItem<String?>(
                      value: m.id,
                      child: Text(m.name),
                    )),
              ],
              onChanged: (v) => setState(() => _staffId = v),
            ),
            const SizedBox(height: AppSpacing.s3),
            // Reason
            TextField(
              controller: _reasonCtrl,
              style: TextStyle(color: t.text1),
              decoration: _decoration(context,
                  label: l.schedulingReason, hint: l.schedulingReasonHint),
            ),
            if (_error != null) ...[
              const SizedBox(height: AppSpacing.s2),
              Text(_error!,
                  style: TextStyle(
                      color: t.errorStrong, fontSize: AppTextSizes.caption)),
            ],
          ],
        ),
      ),
      actions: [
        AppButton(
          label: l.buttonCancel,
          variant: AppButtonVariant.ghost,
          size: AppButtonSize.sm,
          onPressed: () => Navigator.pop(context),
        ),
        AppButton(
          label: l.schedulingAddBlockedSubmit,
          size: AppButtonSize.sm,
          onPressed: () {
            if (_todMinutes(_start) >= _todMinutes(_end)) {
              setState(() => _error = l.schedulingTimeInvalid);
              return;
            }
            Navigator.pop(
              context,
              _BlockedDraft(
                date: _date,
                start: _start,
                end: _end,
                staffId: _staffId,
                reason: _reasonCtrl.text.trim().isEmpty
                    ? null
                    : _reasonCtrl.text.trim(),
              ),
            );
          },
        ),
      ],
    );
  }
}

// ── Error view ───────────────────────────────────────────────────────
