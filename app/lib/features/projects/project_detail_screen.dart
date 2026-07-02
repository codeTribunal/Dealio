import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_service.dart';
import '../../core/config/app_config.dart';
import '../../core/icons/app_icon.dart';
import '../../core/models/project.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/utils/status_labels.dart';
import '../../shared/widgets/app_badge.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/app_dialog.dart';
import '../../shared/widgets/app_spinner.dart';
import 'projects_provider.dart';

const _nextStatusCodes = ['IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'];

String _nextStatusLabel(AppLocalizations l, String code) {
  switch (code) {
    case 'IN_PROGRESS':
      return l.projectMarkInProgress;
    case 'REVIEW':
      return l.projectSendForReview;
    case 'COMPLETED':
      return l.projectMarkCompleted;
    case 'CANCELLED':
      return l.projectCancelProject;
    default:
      return code;
  }
}

class ProjectDetailScreen extends ConsumerWidget {
  final String projectId;
  const ProjectDetailScreen({super.key, required this.projectId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final projectAsync = ref.watch(projectDetailProvider(projectId));

    return Scaffold(
      appBar: AppBar(
        title: Text(l.projectDetailTitle),
        actions: [
          projectAsync.when(
            data: (p) => PopupMenuButton<String>(
              onSelected: (v) => _onStatusSelected(context, ref, p, v),
              itemBuilder: (_) => _nextStatusCodes
                  .where((code) => code != p.status)
                  .map((code) => PopupMenuItem(
                      value: code, child: Text(_nextStatusLabel(l, code))))
                  .toList(),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s3),
                child: AppIcon(name: AppIconName.menu, color: t.text1),
              ),
            ),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: projectAsync.when(
        loading: () => const Center(child: AppSpinner(size: 32)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.s5),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppIcon(
                    name: AppIconName.close, size: 48, color: t.errorStrong),
                const SizedBox(height: AppSpacing.s3),
                Text(e.toString(),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: t.text2)),
                const SizedBox(height: AppSpacing.s4),
                AppButton(
                  label: l.buttonRetry,
                  variant: AppButtonVariant.secondary,
                  size: AppButtonSize.sm,
                  onPressed: () => ref
                      .read(projectDetailProvider(projectId).notifier)
                      .refresh(),
                ),
              ],
            ),
          ),
        ),
        data: (project) => RefreshIndicator(
          color: t.accent,
          onRefresh: () =>
              ref.read(projectDetailProvider(projectId).notifier).refresh(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
                AppSpacing.s4, AppSpacing.s4, AppSpacing.s4, AppSpacing.s6),
            children: [
              _HeaderCard(project: project),
              const SizedBox(height: AppSpacing.s3),
              _ShareProposalButton(project: project),
              const SizedBox(height: AppSpacing.s5),
              _MilestonesSection(project: project),
              const SizedBox(height: AppSpacing.s5),
              _InvoicesSection(project: project),
            ],
          ),
        ),
      ),
    );
  }

  void _onStatusSelected(BuildContext context, WidgetRef ref, Project project,
      String status) async {
    await ref
        .read(projectDetailProvider(projectId).notifier)
        .updateStatus(status);
    if (context.mounted) {
      final l = AppLocalizations.of(context)!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                l.projectStatusUpdated(projectStatusLabel(l, status)))),
      );
    }
  }
}

class _HeaderCard extends StatelessWidget {
  final Project project;
  const _HeaderCard({required this.project});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  project.name,
                  style: TextStyle(
                    fontSize: AppTextSizes.lg,
                    fontWeight: AppFontWeights.bold,
                    color: t.text1,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.s2),
              AppBadge(status: project.status, type: AppBadgeType.project),
            ],
          ),
          const SizedBox(height: AppSpacing.s3),
          _InfoRow(
            icon: AppIconName.customers,
            label: l.projectClient,
            value: project.customer.name,
          ),
          if (project.customer.phone != null)
            _InfoRow(
              icon: AppIconName.customers,
              label: l.projectPhone,
              value: project.customer.phone!,
            ),
          _InfoRow(
            icon: AppIconName.revenue,
            label: l.commonTotal,
            value: formatUZS(project.totalPrice),
            bold: true,
          ),
          if (project.startDate != null)
            _InfoRow(
              icon: AppIconName.calendar,
              label: l.projectStart,
              value: formatDate(project.startDate!),
            ),
          if (project.deadline != null)
            _InfoRow(
              icon: AppIconName.calendar,
              label: l.projectDeadline,
              value: formatDate(project.deadline!),
            ),
          if (project.description != null &&
              project.description!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.s3),
            _FieldLabel(l.projectScope),
            const SizedBox(height: AppSpacing.s1),
            Text(project.description!,
                style: TextStyle(fontSize: AppTextSizes.sm, color: t.text1)),
          ],
          if (project.paymentTerms != null &&
              project.paymentTerms!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.s3),
            _FieldLabel(l.projectPaymentTerms),
            const SizedBox(height: AppSpacing.s1),
            Text(project.paymentTerms!,
                style: TextStyle(fontSize: AppTextSizes.sm, color: t.text1)),
          ],
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Text(
      text,
      style: TextStyle(
        fontSize: AppTextSizes.caption,
        fontWeight: AppFontWeights.semibold,
        color: t.text2,
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final AppIconName icon;
  final String label;
  final String value;
  final bool bold;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.bold = false,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.s1),
      child: Row(
        children: [
          AppIcon(name: icon, size: 16, color: t.text2),
          const SizedBox(width: AppSpacing.s2),
          Text(
            '$label: ',
            style: TextStyle(color: t.text2, fontSize: AppTextSizes.sm),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: AppTextSizes.sm,
                color: t.text1,
                fontWeight: bold ? AppFontWeights.bold : AppFontWeights.regular,
                fontFeatures:
                    bold ? const [FontFeature.tabularFigures()] : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ShareProposalButton extends StatelessWidget {
  final Project project;
  const _ShareProposalButton({required this.project});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    return AppButton(
      label: l.projectShareProposal,
      variant: AppButtonVariant.secondary,
      leftIcon: AppIconName.inbox,
      fullWidth: true,
      onPressed: () {
        // Built from the configured backend so the copied link works for
        // clients (never a hardcoded localhost).
        final link = '${AppConfig.apiBaseUrl}/proposals/${project.id}';
        Clipboard.setData(ClipboardData(text: link));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l.projectProposalCopied)),
        );
      },
    );
  }
}

// ── Milestones ────────────────────────────────────────────────────────

class _MilestonesSection extends ConsumerWidget {
  final Project project;
  const _MilestonesSection({required this.project});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCardHeader(
            title: l.projectMilestones,
            trailing: AppButton(
              label: l.buttonAdd,
              variant: AppButtonVariant.ghost,
              size: AppButtonSize.sm,
              leftIcon: AppIconName.add,
              onPressed: () =>
                  context.push('/projects/${project.id}/milestone/new'),
            ),
          ),
          const SizedBox(height: AppSpacing.s2),
          if (project.milestones.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
              child: Text(
                l.projectNoMilestones,
                style: TextStyle(color: t.text3, fontSize: AppTextSizes.sm),
              ),
            )
          else
            ...project.milestones.map(
              (m) => _MilestoneRow(projectId: project.id, milestone: m),
            ),
        ],
      ),
    );
  }
}

class _MilestoneRow extends ConsumerWidget {
  final String projectId;
  final Milestone milestone;
  const _MilestoneRow({required this.projectId, required this.milestone});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.s2),
      padding: const EdgeInsets.all(AppSpacing.s3),
      decoration: BoxDecoration(
        color: t.surface2,
        borderRadius: AppRadii.md,
        border: Border.all(color: t.border),
      ),
      child: GestureDetector(
        onLongPress: milestone.status != 'PENDING'
            ? () => _showResetDialog(context, ref)
            : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    milestone.name,
                    style: TextStyle(
                        fontWeight: AppFontWeights.semibold,
                        fontSize: AppTextSizes.sm,
                        color: t.text1),
                  ),
                ),
                Text(
                  formatUZS(milestone.amount),
                  style: TextStyle(
                    fontWeight: AppFontWeights.bold,
                    fontSize: AppTextSizes.sm,
                    color: t.text1,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.s1),
            Row(
              children: [
                _MilestoneChip(status: milestone.status),
                if (milestone.dueDate != null) ...[
                  const SizedBox(width: AppSpacing.s2),
                  Text(
                    l.projectDuePrefix(
                        formatDayMonthShort(milestone.dueDate!)),
                    style: TextStyle(
                        fontSize: AppTextSizes.caption, color: t.text3),
                  ),
                ],
              ],
            ),
            const SizedBox(height: AppSpacing.s3),
            _MilestoneActions(projectId: projectId, milestone: milestone),
          ],
        ),
      ),
    );
  }

  void _showResetDialog(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    showDialog<void>(
      context: context,
      builder: (ctx) => AppDialog(
        title: l.projectResetMilestone,
        content: Text(l.projectResetMilestoneBody(milestone.name)),
        actions: [
          AppButton(
            label: l.buttonCancel,
            variant: AppButtonVariant.ghost,
            size: AppButtonSize.sm,
            onPressed: () => Navigator.pop(ctx),
          ),
          AppButton(
            label: l.projectResetToPending,
            size: AppButtonSize.sm,
            onPressed: () {
              Navigator.pop(ctx);
              ref
                  .read(projectDetailProvider(projectId).notifier)
                  .resetMilestoneToPending(milestone.id);
            },
          ),
        ],
      ),
    );
  }
}

/// Milestone status chip preserving the original 4-state colour design,
/// mapped to tokens: pending → neutral, submitted → warning, approved →
/// accent, payment received → success. (The shared [AppBadge] only has 3
/// semantic tones, which would flatten approved/received into amber.)
class _MilestoneChip extends StatelessWidget {
  final String status;
  const _MilestoneChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final (Color bg, Color fg, String label) = switch (status) {
      'PENDING' => (t.surface2, t.text2, l.milestoneStatusPending),
      'SUBMITTED_FOR_REVIEW' => (
          t.warningSoft,
          t.warningStrong,
          l.milestoneAwaitingReview
        ),
      'APPROVED' => (t.accentSoft, t.accent, l.milestoneApprovedByClient),
      'PAYMENT_RECEIVED' => (
          t.successSoft,
          t.successStrong,
          l.milestoneStatusPaymentReceived
        ),
      _ => (t.surface2, t.text2, status),
    };
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.s2, vertical: 2),
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
}

class _MilestoneActions extends ConsumerStatefulWidget {
  final String projectId;
  final Milestone milestone;
  const _MilestoneActions({required this.projectId, required this.milestone});

  @override
  ConsumerState<_MilestoneActions> createState() => _MilestoneActionsState();
}

class _MilestoneActionsState extends ConsumerState<_MilestoneActions> {
  // Double-submit guard: disable the button while its mutation is in flight so
  // a repeat tap cannot fire a duplicate PATCH before the provider refreshes.
  bool _busy = false;

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final notifier = ref.read(projectDetailProvider(widget.projectId).notifier);

    switch (widget.milestone.status) {
      case 'PENDING':
        return AppButton(
          label: l.projectSubmitForReview,
          variant: AppButtonVariant.secondary,
          size: AppButtonSize.sm,
          fullWidth: true,
          loading: _busy,
          onPressed: _busy
              ? null
              : () => _run(() => notifier.submitMilestone(widget.milestone.id)),
        );
      case 'SUBMITTED_FOR_REVIEW':
        return Align(
          alignment: Alignment.centerLeft,
          child: Container(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.s3, vertical: AppSpacing.s1),
            decoration: BoxDecoration(
              color: t.warningSoft,
              borderRadius: AppRadii.sm,
            ),
            child: Text(
              l.projectWaitingApproval,
              style: TextStyle(
                  fontSize: AppTextSizes.caption, color: t.warningStrong),
            ),
          ),
        );
      case 'APPROVED':
        return AppButton(
          label: l.projectMarkPaymentReceived,
          size: AppButtonSize.sm,
          fullWidth: true,
          loading: _busy,
          onPressed: _busy
              ? null
              : () => _run(() =>
                  notifier.markMilestonePaymentReceived(widget.milestone.id)),
        );
      case 'PAYMENT_RECEIVED':
        return const SizedBox.shrink();
      default:
        return const SizedBox.shrink();
    }
  }
}

// ── Invoices ──────────────────────────────────────────────────────────

class _InvoicesSection extends ConsumerWidget {
  final Project project;
  const _InvoicesSection({required this.project});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCardHeader(
            title: l.projectInvoices,
            trailing: AppButton(
              label: l.projectGenerate,
              variant: AppButtonVariant.ghost,
              size: AppButtonSize.sm,
              leftIcon: AppIconName.add,
              onPressed: () => _showGenerateInvoiceDialog(context, ref),
            ),
          ),
          const SizedBox(height: AppSpacing.s2),
          if (project.invoices.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.s2),
              child: Text(
                l.projectNoInvoices,
                style: TextStyle(color: t.text3, fontSize: AppTextSizes.sm),
              ),
            )
          else
            ...project.invoices.map(
              (inv) => _InvoiceRow(projectId: project.id, invoice: inv),
            ),
        ],
      ),
    );
  }

  void _showGenerateInvoiceDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => _GenerateInvoiceDialog(projectId: project.id),
    );
  }
}

class _InvoiceRow extends ConsumerStatefulWidget {
  final String projectId;
  final Invoice invoice;
  const _InvoiceRow({required this.projectId, required this.invoice});

  @override
  ConsumerState<_InvoiceRow> createState() => _InvoiceRowState();
}

class _InvoiceRowState extends ConsumerState<_InvoiceRow> {
  // Double-submit guard for the "Mark paid" action.
  bool _markingPaid = false;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final invoice = widget.invoice;
    final isPaid = invoice.status == 'PAID';

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.s2),
      padding: const EdgeInsets.all(AppSpacing.s3),
      decoration: BoxDecoration(
        color: t.surface2,
        borderRadius: AppRadii.md,
        border: Border.all(color: t.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  invoice.invoiceNumber,
                  style: TextStyle(
                      fontWeight: AppFontWeights.bold,
                      fontSize: AppTextSizes.sm,
                      color: t.text1),
                ),
              ),
              AppBadge(status: invoice.status, type: AppBadgeType.invoice),
            ],
          ),
          const SizedBox(height: AppSpacing.s1),
          Text(
            formatUZS(invoice.total),
            style: TextStyle(
              fontWeight: AppFontWeights.bold,
              fontSize: AppTextSizes.base,
              color: t.text1,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          if (invoice.dueDate != null)
            Text(
              l.projectDuePrefix(
                  formatDate(invoice.dueDate!)),
              style:
                  TextStyle(fontSize: AppTextSizes.caption, color: t.text3),
            ),
          const SizedBox(height: AppSpacing.s3),
          Row(
            children: [
              AppButton(
                label: l.buttonShare,
                variant: AppButtonVariant.secondary,
                size: AppButtonSize.sm,
                leftIcon: AppIconName.inbox,
                onPressed: () {
                  final link = '${AppConfig.apiBaseUrl}/invoices/${invoice.id}';
                  Clipboard.setData(ClipboardData(text: link));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(l.projectInvoiceCopied)),
                  );
                },
              ),
              if (!isPaid) ...[
                const SizedBox(width: AppSpacing.s2),
                AppButton(
                  label: l.projectMarkPaid,
                  size: AppButtonSize.sm,
                  loading: _markingPaid,
                  onPressed: _markingPaid
                      ? null
                      : () async {
                          setState(() => _markingPaid = true);
                          try {
                            await ref
                                .read(projectDetailProvider(widget.projectId)
                                    .notifier)
                                .markInvoicePaid(invoice.id);
                          } finally {
                            if (mounted) setState(() => _markingPaid = false);
                          }
                        },
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _GenerateInvoiceDialog extends ConsumerStatefulWidget {
  final String projectId;
  const _GenerateInvoiceDialog({required this.projectId});

  @override
  ConsumerState<_GenerateInvoiceDialog> createState() =>
      _GenerateInvoiceDialogState();
}

class _GenerateInvoiceDialogState extends ConsumerState<_GenerateInvoiceDialog> {
  final _descCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController(text: '1');
  final _priceCtrl = TextEditingController();
  final _dueDateCtrl = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _descCtrl.dispose();
    _qtyCtrl.dispose();
    _priceCtrl.dispose();
    _dueDateCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    return AppDialog(
      title: l.projectGenerateInvoice,
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _descCtrl,
              style: TextStyle(color: t.text1),
              decoration: _dialogDecoration(context, l.productFormDescLabel),
            ),
            const SizedBox(height: AppSpacing.s2),
            Row(
              children: [
                SizedBox(
                  width: 70,
                  child: TextField(
                    controller: _qtyCtrl,
                    style: TextStyle(color: t.text1),
                    decoration: _dialogDecoration(context, l.projectQty),
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: AppSpacing.s3),
                Expanded(
                  child: TextField(
                    controller: _priceCtrl,
                    style: TextStyle(color: t.text1),
                    decoration: _dialogDecoration(context, l.projectUnitPrice),
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.s2),
            TextField(
              controller: _dueDateCtrl,
              style: TextStyle(color: t.text1),
              decoration: _dialogDecoration(context, l.projectDueDateLabel,
                  hint: l.commonOptionalLabel),
            ),
          ],
        ),
      ),
      actions: [
        AppButton(
          label: l.buttonCancel,
          variant: AppButtonVariant.ghost,
          size: AppButtonSize.sm,
          onPressed: _saving ? null : () => Navigator.pop(context),
        ),
        AppButton(
          label: l.projectGenerate,
          size: AppButtonSize.sm,
          loading: _saving,
          onPressed: _saving ? null : _submit,
        ),
      ],
    );
  }

  Future<void> _submit() async {
    final desc = _descCtrl.text.trim();
    final qty = int.tryParse(_qtyCtrl.text.trim()) ?? 1;
    final price = int.tryParse(_priceCtrl.text.trim()) ?? 0;
    if (desc.isEmpty || price <= 0) return;

    setState(() => _saving = true);
    try {
      final data = <String, dynamic>{
        'lineItems': [
          {'description': desc, 'quantity': qty, 'unitPrice': price},
        ],
        if (_dueDateCtrl.text.trim().isNotEmpty)
          'dueDate': '${_dueDateCtrl.text.trim()}T00:00:00.000Z',
      };
      await ref
          .read(apiServiceProvider)
          .createInvoice(widget.projectId, data);
      await ref
          .read(projectDetailProvider(widget.projectId).notifier)
          .refresh();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() => _saving = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    }
  }
}

InputDecoration _dialogDecoration(BuildContext context, String label,
    {String? hint}) {
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
    border: border(t.border),
    enabledBorder: border(t.border),
    focusedBorder: border(t.accent, 2),
  );
}
