import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/locale/locale_provider.dart';
import '../../l10n/app_localizations.dart';
import 'customization_provider.dart';
import 'reminder_settings_provider.dart';
import 'settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final settingsAsync = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.settingsTitle)),
      body: settingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(
          message: e.toString(),
          onRetry: () => ref.read(settingsProvider.notifier).refresh(),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () => ref.read(settingsProvider.notifier).refresh(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _ProfileSection(data: data),
              const SizedBox(height: 12),
              _BusinessModeSection(data: data),
              if (data.business.mode.contains('SERVICES')) ...[
                const SizedBox(height: 12),
                const _ServicesSection(),
                const SizedBox(height: 12),
                const _StaffSection(),
              ],
              const SizedBox(height: 12),
              _PaymentSection(data: data),
              const SizedBox(height: 12),
              _CalendarSection(data: data),
              const SizedBox(height: 12),
              _RemindersSection(data: data),
              const SizedBox(height: 12),
              _BotSection(data: data),
              const SizedBox(height: 12),
              const _CustomerFieldsSection(),
              const SizedBox(height: 12),
              const _StagesSection(),
              const SizedBox(height: 12),
              const _CheckoutQuestionsSection(),
              const SizedBox(height: 12),
              _LanguageSection(data: data),
              const SizedBox(height: 12),
              _AccountSection(),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
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
    _descCtrl = TextEditingController(text: widget.data.business.description ?? '');
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
          backgroundColor: Colors.red,
        ),
      );
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
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  l.settingsBusinessProfile,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                if (!_editing)
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    onPressed: () => setState(() => _editing = true),
                    tooltip: l.settingsEditProfileTooltip,
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (_editing) ...[
              TextField(
                controller: _nameCtrl,
                decoration: InputDecoration(
                  labelText: l.onboardingBusinessNameLabel,
                  isDense: true,
                ),
                autofocus: true,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descCtrl,
                decoration: InputDecoration(
                  labelText: l.settingsDescriptionLabel(l.commonOptional),
                  isDense: true,
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _saving ? null : _cancel,
                    child: Text(l.buttonCancel),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(l.buttonSave),
                  ),
                ],
              ),
            ] else ...[
              Text(
                widget.data.business.name,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              if (widget.data.business.description != null &&
                  widget.data.business.description!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  widget.data.business.description!,
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

// ── Business mode section ────────────────────────────────────────────

class _BusinessModeSection extends ConsumerWidget {
  final SettingsState data;
  const _BusinessModeSection({required this.data});

  Future<void> _toggle(BuildContext context, WidgetRef ref, String mode, List<String> current) async {
    final l = AppLocalizations.of(context)!;
    final isOn = current.contains(mode);
    if (isOn && current.length == 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l.settingsModeAtLeastOne)),
      );
      return;
    }
    final updated = isOn
        ? current.where((m) => m != mode).toList()
        : [...current, mode];
    try {
      await ref.read(settingsProvider.notifier).saveMode(updated);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l.errorWithMessage(e.toString())), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final current = data.business.mode;
    final modes = [
      ('PRODUCTS', l.settingsModeProductsLabel, l.settingsModeProductsDesc),
      ('SERVICES', l.settingsModeServicesLabel, l.settingsModeServicesDesc),
      ('FREELANCE', l.settingsModeFreelanceLabel, l.settingsModeFreelanceDesc),
    ];

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l.settingsBusinessMode,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 4),
            for (final (value, label, subtitle) in modes)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(label, style: const TextStyle(fontSize: 14)),
                subtitle: Text(subtitle,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                value: current.contains(value),
                onChanged: (_) => _toggle(context, ref, value, current),
                dense: true,
              ),
          ],
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
    _cardCtrl = TextEditingController(text: widget.data.business.cardNumber ?? '');
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
          backgroundColor: Colors.red,
        ),
      );
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
    final hasCard = widget.data.business.cardNumber != null &&
        widget.data.business.cardNumber!.isNotEmpty;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  l.settingsPaymentMethod,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                if (!_editing)
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    onPressed: () => setState(() => _editing = true),
                    tooltip: l.settingsEditPaymentTooltip,
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (_editing) ...[
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'UZCARD', label: Text('Uzcard')),
                  ButtonSegment(value: 'HUMO', label: Text('Humo')),
                ],
                selected: {_selectedBank},
                onSelectionChanged: (s) => setState(() => _selectedBank = s.first),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _cardCtrl,
                decoration: InputDecoration(
                  labelText: l.settingsCardNumberLabel,
                  hintText: '8600 0000 0000 0000',
                  isDense: true,
                ),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                maxLength: 16,
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: _saving ? null : _cancel,
                    child: Text(l.buttonCancel),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(l.buttonSave),
                  ),
                ],
              ),
            ] else if (hasCard) ...[
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      widget.data.business.cardBank ?? 'UZCARD',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _formatCardNumber(widget.data.business.cardNumber!),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ] else ...[
              Text(
                l.settingsNoCardWarning,
                style: TextStyle(color: Colors.orange[700], fontSize: 13),
              ),
            ],
          ],
        ),
      ),
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

// ── Bot section ──────────────────────────────────────────────────────

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
          SnackBar(content: Text(AppLocalizations.of(context)!.settingsCalendarSyncFailed)),
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
    final googleUrl =
        'https://calendar.google.com/calendar/r/settings/addbyurl'
        '?url=${Uri.encodeComponent(_calendarUrl)}';
    final uri = Uri.parse(googleUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _addToAppleCalendar() async {
    // Apple Calendar subscribes via the webcal:// protocol
    final webcalUrl = _calendarUrl
        .replaceFirst('https://', 'webcal://')
        .replaceFirst('http://', 'webcal://');
    final uri = Uri.parse(webcalUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      // Fallback: open the https URL directly
      final httpsUri = Uri.parse(_calendarUrl);
      if (await canLaunchUrl(httpsUri)) {
        await launchUrl(httpsUri, mode: LaunchMode.externalApplication);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final enabled = _token != null;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l.settingsCalendarSync,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l.settingsCalendarSyncTitle,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        l.settingsCalendarSyncSubtitle,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                else
                  Switch(
                    value: enabled,
                    onChanged: _toggleCalendar,
                  ),
              ],
            ),
            if (enabled) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              Text(
                l.settingsCalendarLinkLabel,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[700],
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _calendarUrl,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[700],
                          fontFamily: 'monospace',
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    GestureDetector(
                      onTap: _copyCalendarUrl,
                      child: Icon(
                        Icons.copy,
                        size: 18,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _addToGoogleCalendar,
                  icon: const Icon(Icons.calendar_today, size: 18),
                  label: Text(l.settingsAddToGoogleCalendar),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _addToAppleCalendar,
                  icon: const Icon(Icons.apple, size: 18),
                  label: Text(l.settingsAddToAppleCalendar),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                l.settingsCalendarSamsungNote,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ],
        ),
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
      await ref.read(reminderSettingsProvider.notifier).updateSetting(key, value);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.settingsReminderSaveFailed)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final modes = data.business.mode;
    final settingsAsync = ref.watch(reminderSettingsProvider);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l.settingsReminders,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              l.settingsRemindersSubtitle,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            settingsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  l.settingsRemindersLoadFailed,
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
              ),
              data: (s) {
                final tiles = <Widget>[];

                // SERVICES → appointment reminders
                if (modes.contains('SERVICES')) {
                  final apptEnabled = s['appointmentEnabled'] as bool? ?? true;
                  tiles.add(_ReminderToggle(
                    title: l.settingsReminderAppointmentTitle,
                    subtitle: l.settingsReminderAppointmentSubtitle,
                    enabled: apptEnabled,
                    hoursBefore: s['appointmentHoursBefore'] as int? ?? 24,
                    onToggle: (v) => _update(context, ref, 'appointmentEnabled', v),
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

                // PRODUCTS → delivery reminders
                if (modes.contains('PRODUCTS')) {
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

                // FREELANCE → deadline reminders
                if (modes.contains('FREELANCE')) {
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
            const SizedBox(height: 8),
            Text(
              l.settingsRemindersFootnote,
              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
            ),
          ],
        ),
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
    // Guard against a stored value that isn't in this type's option list so the
    // dropdown never throws on a duplicate/absent value.
    final dropdownValue =
        timingOptions.contains(hoursBefore) ? hoursBefore : timingOptions.first;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
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
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w600)),
                    Text(subtitle,
                        style:
                            TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
              ),
              Switch(value: enabled, onChanged: onToggle),
            ],
          ),
          if (enabled) ...[
            const SizedBox(height: 8),
            DropdownButtonFormField<int>(
              // ignore: deprecated_member_use
              value: dropdownValue,
              decoration: InputDecoration(
                isDense: true,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              items: timingOptions
                  .map((h) => DropdownMenuItem(value: h, child: Text(_label(l, h))))
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

class _BotSection extends StatelessWidget {
  final SettingsState data;
  const _BotSection({required this.data});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final hasBot = data.botUsername != null && data.botUsername!.isNotEmpty;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l.settingsTelegramBot,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            if (!hasBot)
              Text(
                l.settingsNoBotConfigured,
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              )
            else ...[
              Row(
                children: [
                  const Icon(Icons.telegram, size: 18, color: Color(0xFF229ED9)),
                  const SizedBox(width: 6),
                  Text(
                    '@${data.botUsername}',
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                  ),
                ],
              ),
              if (data.botLink != null) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey[300]!),
                        ),
                        child: Text(
                          data.botLink!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[700],
                            fontFamily: 'monospace',
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.copy_outlined, size: 18),
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
          ],
        ),
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
    // Reflect the app locale (what the user currently sees), not just the
    // stored business language, so the highlighted option matches the UI.
    final currentCode = ref.watch(localeProvider).languageCode;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l.settingsLanguage,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              showSelectedIcon: false,
              segments: const [
                // Language names are always shown in their own language.
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
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(l.errorWithMessage(e.toString())),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
            ),
            const SizedBox(height: 8),
            Text(
              l.settingsLanguageFootnote,
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Account section ──────────────────────────────────────────────────

class _AccountSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l.settingsAccount,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.logout, size: 18, color: Colors.red),
                label: Text(
                  l.settingsLogOut,
                  style: const TextStyle(color: Colors.red),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  alignment: Alignment.centerLeft,
                ),
                onPressed: () async {
                  await ref.read(authNotifierProvider).logout();
                  if (context.mounted) context.go('/login');
                },
              ),
            ),
          ],
        ),
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
    'TEXT': Icons.text_fields,
    'NUMBER': Icons.pin_outlined,
    'DATE': Icons.calendar_today_outlined,
    'YESNO': Icons.toggle_on_outlined,
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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _removeField(String fieldId) async {
    try {
      await ref.read(customFieldsProvider.notifier).remove(fieldId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final fieldsAsync = ref.watch(customFieldsProvider);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  l.settingsCustomerFields,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.add, size: 20),
                  tooltip: l.settingsAddFieldTooltip,
                  visualDensity: VisualDensity.compact,
                  onPressed: _addField,
                ),
              ],
            ),
            fieldsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(),
              ),
              error: (e, _) => Text(l.errorWithMessage(e.toString()),
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
              data: (fields) {
                if (fields.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      l.settingsNoCustomFields,
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  );
                }
                return Column(
                  children: fields
                      .map((f) => _FieldTile(
                            field: f,
                            typeIcons: _typeIcons,
                            onDelete: () => _removeField(f.id),
                          ))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// Dialog returns typed data — no Riverpod inside
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
    final fieldTypes = [
      ('TEXT', l.settingsFieldTypeText),
      ('NUMBER', l.settingsFieldTypeNumber),
      ('DATE', l.settingsFieldTypeDate),
      ('YESNO', l.settingsFieldTypeYesNo),
    ];
    return AlertDialog(
      title: Text(l.settingsAddCustomerField),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameCtrl,
            decoration: InputDecoration(
              labelText: l.settingsFieldNameLabel,
              hintText: l.settingsFieldNameHint,
              isDense: true,
            ),
            autofocus: true,
          ),
          const SizedBox(height: 16),
          Text(l.settingsFieldTypeLabel,
              style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
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
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(l.buttonCancel),
        ),
        FilledButton(
          onPressed: () {
            final name = _nameCtrl.text.trim();
            if (name.isEmpty) return;
            Navigator.pop(context, (name: name, fieldType: _selectedType));
          },
          child: Text(l.buttonAdd),
        ),
      ],
    );
  }
}

class _FieldTile extends StatelessWidget {
  final BusinessCustomField field;
  final Map<String, IconData> typeIcons;
  final VoidCallback onDelete;
  const _FieldTile(
      {required this.field, required this.typeIcons, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: Icon(typeIcons[field.fieldType] ?? Icons.text_fields,
          size: 18, color: Colors.grey[600]),
      title: Text(field.name, style: const TextStyle(fontSize: 14)),
      subtitle: Text(field.fieldType.toLowerCase(),
          style: TextStyle(fontSize: 11, color: Colors.grey[500])),
      trailing: IconButton(
        icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _removeStage(String stageId) async {
    try {
      await ref.read(stagesProvider.notifier).remove(stageId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final stagesAsync = ref.watch(stagesProvider);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  l.settingsPipelineStages,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.add, size: 20),
                  tooltip: l.settingsAddStageTooltip,
                  visualDensity: VisualDensity.compact,
                  onPressed: _addStage,
                ),
              ],
            ),
            stagesAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(),
              ),
              error: (e, _) => Text(l.errorWithMessage(e.toString()),
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
              data: (stages) {
                if (stages.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      l.settingsNoStages,
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  );
                }
                return Column(
                  children: stages
                      .map((s) => _StageTile(
                            stage: s,
                            onDelete: () => _removeStage(s.id),
                          ))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// Dialog returns typed data — no Riverpod inside
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
    return AlertDialog(
      title: Text(l.settingsAddStage),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameCtrl,
            decoration: InputDecoration(
              labelText: l.settingsStageNameLabel,
              hintText: l.settingsStageNameHint,
              isDense: true,
            ),
            autofocus: true,
          ),
          const SizedBox(height: 16),
          Text(l.settingsColorLabel,
              style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
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
                        ? Border.all(color: Colors.black, width: 2)
                        : null,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(l.buttonCancel),
        ),
        FilledButton(
          onPressed: () {
            final name = _nameCtrl.text.trim();
            if (name.isEmpty) return;
            Navigator.pop(context, (name: name, color: _selectedColor));
          },
          child: Text(l.buttonAdd),
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
    final color = Color(
        int.parse('FF${stage.color.replaceFirst('#', '')}', radix: 16));
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      title: Text(stage.name, style: const TextStyle(fontSize: 14)),
      trailing: IconButton(
        icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _removeQuestion(String id) async {
    try {
      await ref.read(checkoutQuestionsProvider.notifier).remove(id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.errorWithMessage(e.toString())),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final questionsAsync = ref.watch(checkoutQuestionsProvider);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  l.settingsCheckoutQuestions,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: Colors.grey[600],
                        letterSpacing: 0.5,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.add, size: 20),
                  tooltip: l.settingsAddQuestionTooltip,
                  visualDensity: VisualDensity.compact,
                  onPressed: _addQuestion,
                ),
              ],
            ),
            questionsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(),
              ),
              error: (e, _) => Text(l.errorWithMessage(e.toString()),
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
              data: (questions) {
                if (questions.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      l.settingsNoCheckoutQuestions,
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
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
          ],
        ),
      ),
    );
  }
}

// Dialog returns typed data — no Riverpod inside
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
    return AlertDialog(
      title: Text(l.settingsAddCheckoutQuestion),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _questionCtrl,
            decoration: InputDecoration(
              labelText: l.settingsQuestionLabel,
              hintText: l.settingsQuestionHint,
              isDense: true,
            ),
            autofocus: true,
            maxLines: 3,
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l.commonRequired, style: const TextStyle(fontSize: 14)),
            value: _isRequired,
            onChanged: (v) => setState(() => _isRequired = v),
            dense: true,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(l.buttonCancel),
        ),
        FilledButton(
          onPressed: () {
            final text = _questionCtrl.text.trim();
            if (text.isEmpty) return;
            Navigator.pop(context, (question: text, required: _isRequired));
          },
          child: Text(l.buttonAdd),
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
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: Icon(
        question.required
            ? Icons.help_outline
            : Icons.help_center_outlined,
        size: 18,
        color: question.required ? Colors.orange[700] : Colors.grey[400],
      ),
      title: Text(question.question,
          style: const TextStyle(fontSize: 13), maxLines: 2),
      subtitle: Text(
        question.required ? l.commonRequired : l.commonOptionalLabel,
        style: TextStyle(
            fontSize: 11,
            color:
                question.required ? Colors.orange[700] : Colors.grey[500]),
      ),
      trailing: IconButton(
        icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
        visualDensity: VisualDensity.compact,
        onPressed: onDelete,
      ),
    );
  }
}

// ── Services section ─────────────────────────────────────────────────

class _ServicesSection extends StatelessWidget {
  const _ServicesSection();

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l.settingsServices,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(l.settingsManageServices),
              trailing: const Icon(Icons.chevron_right),
              dense: true,
              onTap: () => context.push('/services'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Staff section ─────────────────────────────────────────────────────

class _StaffSection extends StatelessWidget {
  const _StaffSection();

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l.settingsStaff,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey[600],
                    letterSpacing: 0.5,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(l.settingsManageStaff),
              trailing: const Icon(Icons.chevron_right),
              dense: true,
              onTap: () => context.push('/staff'),
            ),
          ],
        ),
      ),
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
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            TextButton(onPressed: onRetry, child: Text(l.buttonRetry)),
          ],
        ),
      ),
    );
  }
}
