import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/icons/app_icon.dart';
import '../../core/locale/locale_provider.dart';
import '../../core/models/blocked_slot.dart';
import '../../core/models/staff.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_spinner.dart';
import '../staff/staff_provider.dart';
import 'blocked_time_provider.dart';
import 'customization_provider.dart';
import 'reminder_settings_provider.dart';
import 'settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final settingsAsync = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.settingsTitle)),
      body: settingsAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(settingsProvider.notifier).refresh(),
        ),
        data: (data) => RefreshIndicator(
          color: t.accent,
          onRefresh: () => ref.read(settingsProvider.notifier).refresh(),
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.s4),
            children: [
              _ProfileSection(data: data),
              const SizedBox(height: AppSpacing.s3),
              _BusinessModeSection(data: data),
              if (data.business.mode == 'SERVICES') ...[
                const SizedBox(height: AppSpacing.s3),
                const _ServicesSection(),
                const SizedBox(height: AppSpacing.s3),
                const _StaffSection(),
                const SizedBox(height: AppSpacing.s3),
                _WorkingHoursSection(data: data),
                const SizedBox(height: AppSpacing.s3),
                const _BlockedTimeSection(),
              ],
              const SizedBox(height: AppSpacing.s3),
              _PaymentSection(data: data),
              const SizedBox(height: AppSpacing.s3),
              _CalendarSection(data: data),
              const SizedBox(height: AppSpacing.s3),
              _RemindersSection(data: data),
              const SizedBox(height: AppSpacing.s3),
              _BotSection(data: data),
              const SizedBox(height: AppSpacing.s3),
              const _CustomerFieldsSection(),
              const SizedBox(height: AppSpacing.s3),
              const _StagesSection(),
              const SizedBox(height: AppSpacing.s3),
              const _CheckoutQuestionsSection(),
              const SizedBox(height: AppSpacing.s3),
              _LanguageSection(data: data),
              const SizedBox(height: AppSpacing.s3),
              _AccountSection(),
              const SizedBox(height: AppSpacing.s6),
            ],
          ),
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
      icon: AppIcon(name: AppIconName.settings, size: 18, color: t.text2),
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
  bool _editing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.data.business.name);
    _descCtrl =
        TextEditingController(text: widget.data.business.description ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await ref.read(settingsProvider.notifier).saveProfile(
            name: _nameCtrl.text.trim(),
            description: _descCtrl.text.trim(),
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
      _editing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return _SectionCard(
      icon: AppIconName.settings,
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
                  decoration:
                      _decoration(context, label: l.onboardingBusinessNameLabel),
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
                    style:
                        TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
                  ),
                ],
              ],
            ),
    );
  }
}

// ── Business mode section ────────────────────────────────────────────

class _BusinessModeSection extends ConsumerWidget {
  final SettingsState data;
  const _BusinessModeSection({required this.data});

  String _modeName(AppLocalizations l, String m) =>
      m == 'SERVICES' ? l.settingsModeNameServices : l.settingsModeNameFreelance;
  String _modeData(AppLocalizations l, String m) =>
      m == 'SERVICES' ? l.settingsModeDataServices : l.settingsModeDataFreelance;

  // Single-select with a HARD WARNING: picking the other mode opens a
  // confirmation dialog. Only on confirm do we save the new scalar mode;
  // on cancel nothing changes (no API call). No data is deleted on switch.
  Future<void> _select(BuildContext context, WidgetRef ref, String mode,
      String current) async {
    if (mode == current) return;
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: t.surface,
        title: Text(l.settingsModeSwitchTitle, style: TextStyle(color: t.text1)),
        content: Text(
          l.settingsModeSwitchBody(
              _modeName(l, current), _modeName(l, mode), _modeData(l, current)),
          style: TextStyle(color: t.text2),
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

    // Single-select dropdown (PRODUCTS disabled — only SERVICES/FREELANCE).
    // Picking the other mode opens the hard-warning dialog via _select; it does
    // NOT save until confirmed. The dropdown is bound to `current` (the saved
    // mode) and a plain DropdownButton holds no internal selection state, so on
    // Cancel it reverts to the current mode with no API call.
    return _SectionCard(
      icon: AppIconName.catalog,
      title: l.settingsBusinessMode,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4),
        decoration: BoxDecoration(
          color: t.surface,
          borderRadius: AppRadii.md,
          border: Border.all(color: t.border),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            // ignore: deprecated_member_use
            value: current,
            isExpanded: true,
            dropdownColor: t.surface,
            borderRadius: AppRadii.md,
            iconEnabledColor: t.text3,
            style: TextStyle(fontSize: AppTextSizes.sm, color: t.text1),
            items: [
              DropdownMenuItem(
                value: 'SERVICES',
                child: Text(l.settingsModeNameServices,
                    style: TextStyle(color: t.text1)),
              ),
              DropdownMenuItem(
                value: 'FREELANCE',
                child: Text(l.settingsModeNameFreelance,
                    style: TextStyle(color: t.text1)),
              ),
            ],
            onChanged: (v) {
              if (v != null && v != current) _select(context, ref, v, current);
            },
          ),
        ),
      ),
    );
  }
}

// ── Payment section ──────────────────────────────────────────────────

class _PaymentSection extends ConsumerStatefulWidget {
  final SettingsState data;
  const _PaymentSection({required this.data});

  @override
  ConsumerState<_PaymentSection> createState() => _PaymentSectionState();
}

class _PaymentSectionState extends ConsumerState<_PaymentSection> {
  late final TextEditingController _cardCtrl;
  String _selectedBank = 'UZCARD';
  bool _editing = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _cardCtrl =
        TextEditingController(text: widget.data.business.cardNumber ?? '');
    _selectedBank = widget.data.business.cardBank ?? 'UZCARD';
  }

  @override
  void dispose() {
    _cardCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_cardCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await ref.read(settingsProvider.notifier).savePayment(
            cardNumber: _cardCtrl.text.trim(),
            cardBank: _selectedBank,
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
      _cardCtrl.text = widget.data.business.cardNumber ?? '';
      _selectedBank = widget.data.business.cardBank ?? 'UZCARD';
      _editing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final hasCard = widget.data.business.cardNumber != null &&
        widget.data.business.cardNumber!.isNotEmpty;

    Widget body;
    if (_editing) {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'UZCARD', label: Text('Uzcard')),
              ButtonSegment(value: 'HUMO', label: Text('Humo')),
            ],
            selected: {_selectedBank},
            onSelectionChanged: (s) => setState(() => _selectedBank = s.first),
          ),
          const SizedBox(height: AppSpacing.s3),
          TextField(
            controller: _cardCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            maxLength: 16,
            style: TextStyle(color: t.text1),
            decoration: _decoration(context,
                    label: l.settingsCardNumberLabel,
                    hint: '8600 0000 0000 0000')
                .copyWith(counterText: ''),
          ),
          const SizedBox(height: AppSpacing.s2),
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
      );
    } else if (hasCard) {
      body = Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.s2, vertical: 3),
            decoration: BoxDecoration(
              color: t.accentSoft,
              borderRadius: AppRadii.sm,
            ),
            child: Text(
              widget.data.business.cardBank ?? 'UZCARD',
              style: TextStyle(
                fontSize: AppTextSizes.caption,
                fontWeight: AppFontWeights.bold,
                color: t.accent,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.s2),
          Text(
            _formatCardNumber(widget.data.business.cardNumber!),
            style: TextStyle(
              fontSize: AppTextSizes.base,
              fontWeight: AppFontWeights.medium,
              letterSpacing: 1,
              color: t.text1,
            ),
          ),
        ],
      );
    } else {
      body = Text(
        l.settingsNoCardWarning,
        style: TextStyle(color: t.warningStrong, fontSize: AppTextSizes.sm),
      );
    }

    return _SectionCard(
      icon: AppIconName.payment,
      title: l.settingsPaymentMethod,
      trailing: _editing
          ? null
          : _EditButton(
              onPressed: () => setState(() => _editing = true),
              tooltip: l.settingsEditPaymentTooltip,
            ),
      child: body,
    );
  }

  String _formatCardNumber(String raw) {
    final digits = raw.replaceAll(' ', '');
    final buf = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 == 0) buf.write(' ');
      buf.write(digits[i]);
    }
    return buf.toString();
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
        content:
            Text(AppLocalizations.of(context)!.settingsCalendarLinkCopied),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _addToGoogleCalendar() async {
    final googleUrl =
        'https://calendar.google.com/calendar/r/settings/addbyurl'
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
                Switch(
                  value: enabled,
                  activeThumbColor: t.accent,
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
                    child:
                        AppIcon(name: AppIconName.add, size: 18, color: t.accent),
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
                style: TextStyle(color: t.text3, fontSize: AppTextSizes.caption),
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
              Switch(
                  value: enabled,
                  activeThumbColor: t.accent,
                  onChanged: onToggle),
            ],
          ),
          if (enabled) ...[
            const SizedBox(height: AppSpacing.s2),
            DropdownButtonFormField<int>(
              // ignore: deprecated_member_use
              value: dropdownValue,
              dropdownColor: t.surface,
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

class _BotSection extends StatelessWidget {
  final SettingsState data;
  const _BotSection({required this.data});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final hasBot = data.botUsername != null && data.botUsername!.isNotEmpty;

    return _SectionCard(
      icon: AppIconName.inbox,
      title: l.settingsTelegramBot,
      child: !hasBot
          ? Text(
              l.settingsNoBotConfigured,
              style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
            )
          : Column(
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
                        icon: AppIcon(
                            name: AppIconName.add, size: 18, color: t.accent),
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
            ),
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

// ── Account section ──────────────────────────────────────────────────

class _AccountSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    return _SectionCard(
      icon: AppIconName.logout,
      title: l.settingsAccount,
      child: AppButton(
        label: l.settingsLogOut,
        variant: AppButtonVariant.danger,
        leftIcon: AppIconName.logout,
        fullWidth: true,
        onPressed: () async {
          await ref.read(authNotifierProvider).logout();
          if (context.mounted) context.go('/welcome');
        },
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
      trailing: _AddButton(
          onPressed: _addField, tooltip: l.settingsAddFieldTooltip),
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
    return AlertDialog(
      backgroundColor: t.surface,
      title: Text(l.settingsAddCustomerField, style: TextStyle(color: t.text1)),
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
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
    '#F97316', '#EAB308', '#22C55E', '#14B8A6',
    '#3B82F6', '#6B7280',
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
    return AlertDialog(
      backgroundColor: t.surface,
      title: Text(l.settingsAddStage, style: TextStyle(color: t.text1)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameCtrl,
            autofocus: true,
            style: TextStyle(color: t.text1),
            decoration: _decoration(context,
                label: l.settingsStageNameLabel,
                hint: l.settingsStageNameHint),
          ),
          const SizedBox(height: AppSpacing.s4),
          Text(l.settingsColorLabel,
              style: TextStyle(fontSize: AppTextSizes.caption, color: t.text2)),
          const SizedBox(height: AppSpacing.s2),
          Wrap(
            spacing: AppSpacing.s2,
            runSpacing: AppSpacing.s2,
            children: _palette.map((hex) {
              final color = Color(
                  int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
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
    return AlertDialog(
      backgroundColor: t.surface,
      title:
          Text(l.settingsAddCheckoutQuestion, style: TextStyle(color: t.text1)),
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
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l.commonRequired,
                style: TextStyle(fontSize: AppTextSizes.sm, color: t.text1)),
            value: _isRequired,
            activeThumbColor: t.accent,
            onChanged: (v) => setState(() => _isRequired = v),
            dense: true,
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
        trailing: AppIcon(name: AppIconName.menu, size: 18, color: t.text3),
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
        trailing: AppIcon(name: AppIconName.menu, size: 18, color: t.text3),
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

class _DayHours {
  final TimeOfDay start;
  final TimeOfDay end;
  const _DayHours(this.start, this.end);
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
  // Per backend day key → hours, or null = closed.
  late final Map<String, _DayHours?> _days;
  late final TextEditingController _bufferCtrl;
  bool _saving = false;
  String? _error;

  static const _defaultOpen =
      _DayHours(TimeOfDay(hour: 9, minute: 0), TimeOfDay(hour: 18, minute: 0));

  @override
  void initState() {
    super.initState();
    final wh = widget.data.business.workingHours;
    final configured = wh != null && wh.isNotEmpty;
    _days = {
      for (final key in _kDayKeys)
        key: !configured
            ? _defaultOpen
            : _parseDay(wh[key]),
    };
    _bufferCtrl =
        TextEditingController(text: widget.data.business.bufferMinutes.toString());
  }

  _DayHours? _parseDay(dynamic v) {
    if (v is Map) {
      return _DayHours(
        _parseHHMM(v['start']?.toString() ?? '09:00', _defaultOpen.start),
        _parseHHMM(v['end']?.toString() ?? '18:00', _defaultOpen.end),
      );
    }
    return null; // null or absent = closed
  }

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

  Future<void> _pickTime(String key, bool isStart) async {
    final current = _days[key];
    if (current == null) return;
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? current.start : current.end,
    );
    if (picked == null) return;
    setState(() {
      _error = null;
      _days[key] = isStart
          ? _DayHours(picked, current.end)
          : _DayHours(current.start, picked);
    });
  }

  Future<void> _save() async {
    final l = AppLocalizations.of(context)!;
    // Validate open days: start < end.
    for (final key in _kDayKeys) {
      final d = _days[key];
      if (d != null && _todMinutes(d.start) >= _todMinutes(d.end)) {
        setState(() => _error = l.schedulingTimeInvalid);
        return;
      }
    }
    // Assemble the backend map keyed "0".."6" (Sunday="0"). Closed = null.
    final workingHours = <String, dynamic>{
      for (final key in _kDayKeys)
        key: _days[key] == null
            ? null
            : {
                'start': formatTimeOfDay(_days[key]!.start),
                'end': formatTimeOfDay(_days[key]!.end),
              },
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
    final hours = _days[key];
    final open = hours != null;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.s1),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(_dayLabel(l, key),
                    style:
                        TextStyle(fontSize: AppTextSizes.sm, color: t.text1)),
              ),
              Text(
                open ? l.schedulingOpen : l.schedulingClosed,
                style: TextStyle(
                    fontSize: AppTextSizes.caption,
                    color: open ? t.text2 : t.text3),
              ),
              Switch(
                value: open,
                activeThumbColor: t.accent,
                onChanged: (v) => setState(() {
                  _error = null;
                  _days[key] = v ? _defaultOpen : null;
                }),
              ),
            ],
          ),
          if (open)
            Padding(
              padding: const EdgeInsets.only(
                  left: AppSpacing.s1, bottom: AppSpacing.s2),
              child: Row(
                children: [
                  _TimeChip(
                    label: formatTimeOfDay(hours.start),
                    onTap: () => _pickTime(key, true),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.s2),
                    child: Text('–', style: TextStyle(color: t.text3)),
                  ),
                  _TimeChip(
                    label: formatTimeOfDay(hours.end),
                    onTap: () => _pickTime(key, false),
                  ),
                ],
              ),
            ),
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
    final t = AppTokens.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: t.surface,
        title: Text(l.schedulingDeleteBlockedTitle,
            style: TextStyle(color: t.text1)),
        content: Text(l.schedulingDeleteBlockedConfirm,
            style: TextStyle(color: t.text2)),
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
                style: TextStyle(
                    color: t.errorStrong, fontSize: AppTextSizes.sm)),
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

    return AlertDialog(
      backgroundColor: t.surface,
      title: Text(l.schedulingAddBlocked, style: TextStyle(color: t.text1)),
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
                child: Text(formatDate(_date),
                    style: TextStyle(color: t.text1)),
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

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

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
            Text(message,
                textAlign: TextAlign.center,
                style: TextStyle(color: t.text2)),
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
