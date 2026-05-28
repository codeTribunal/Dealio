import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_service.dart';
import '../../core/models/project.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/utils/format.dart';
import '../../shared/utils/status_labels.dart';
import 'projects_provider.dart';

const _statusColor = {
  'PROPOSAL_SENT': Color(0xFF6366F1),
  'IN_PROGRESS': Color(0xFF2563EB),
  'REVIEW': Color(0xFFD97706),
  'COMPLETED': Color(0xFF059669),
  'CANCELLED': Color(0xFFDC2626),
};

String _milestoneStatusDetailLabel(AppLocalizations l, String status) {
  switch (status) {
    case 'PENDING':
      return l.milestoneStatusPending;
    case 'SUBMITTED_FOR_REVIEW':
      return l.milestoneAwaitingReview;
    case 'APPROVED':
      return l.milestoneApprovedByClient;
    case 'PAYMENT_RECEIVED':
      return l.milestoneStatusPaymentReceived;
    default:
      return status;
  }
}

const _milestoneStatusColor = {
  'PENDING': Color(0xFF6B7280),
  'SUBMITTED_FOR_REVIEW': Color(0xFFD97706),
  'APPROVED': Color(0xFF2563EB),
  'PAYMENT_RECEIVED': Color(0xFF059669),
};

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
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: Icon(Icons.more_vert),
              ),
            ),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: projectAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(e.toString()),
              TextButton(
                onPressed: () => ref.read(projectDetailProvider(projectId).notifier).refresh(),
                child: Text(l.buttonRetry),
              ),
            ],
          ),
        ),
        data: (project) => RefreshIndicator(
          onRefresh: () =>
              ref.read(projectDetailProvider(projectId).notifier).refresh(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            children: [
              _HeaderCard(project: project),
              const SizedBox(height: 16),
              _ShareProposalButton(project: project),
              const SizedBox(height: 24),
              _MilestonesSection(project: project),
              const SizedBox(height: 24),
              _InvoicesSection(project: project),
            ],
          ),
        ),
      ),
    );
  }

  void _onStatusSelected(
      BuildContext context, WidgetRef ref, Project project, String status) async {
    await ref.read(projectDetailProvider(projectId).notifier).updateStatus(status);
    if (context.mounted) {
      final l = AppLocalizations.of(context)!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l.projectStatusUpdated(projectStatusLabel(l, status)))),
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
    final color = _statusColor[project.status] ?? Colors.grey;
    final label = projectStatusLabel(l, project.status);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    project.name,
                    style: Theme.of(context)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600, color: color),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _InfoRow(
              icon: Icons.person_outline,
              label: l.projectClient,
              value: project.customer.name,
            ),
            if (project.customer.phone != null)
              _InfoRow(
                icon: Icons.phone_outlined,
                label: l.projectPhone,
                value: project.customer.phone!,
              ),
            _InfoRow(
              icon: Icons.payments_outlined,
              label: l.commonTotal,
              value: formatUZS(project.totalPrice),
              bold: true,
            ),
            if (project.startDate != null)
              _InfoRow(
                icon: Icons.play_arrow_outlined,
                label: l.projectStart,
                value: DateFormat('d MMM yyyy').format(project.startDate!),
              ),
            if (project.deadline != null)
              _InfoRow(
                icon: Icons.flag_outlined,
                label: l.projectDeadline,
                value: DateFormat('d MMM yyyy').format(project.deadline!),
              ),
            if (project.description != null && project.description!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                l.projectScope,
                style: Theme.of(context)
                    .textTheme
                    .labelSmall
                    ?.copyWith(color: Colors.grey[600]),
              ),
              const SizedBox(height: 4),
              Text(project.description!, style: const TextStyle(fontSize: 14)),
            ],
            if (project.paymentTerms != null &&
                project.paymentTerms!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                l.projectPaymentTerms,
                style: Theme.of(context)
                    .textTheme
                    .labelSmall
                    ?.copyWith(color: Colors.grey[600]),
              ),
              const SizedBox(height: 4),
              Text(project.paymentTerms!, style: const TextStyle(fontSize: 14)),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[500]),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: bold ? FontWeight.bold : FontWeight.normal,
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
    return OutlinedButton.icon(
      onPressed: () {
        // In production this would be the deployed backend URL
        const baseUrl = 'http://localhost:3000/api/v1/proposals';
        final link = '$baseUrl/${project.id}';
        Clipboard.setData(ClipboardData(text: link));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l.projectProposalCopied)),
        );
      },
      icon: const Icon(Icons.share_outlined, size: 18),
      label: Text(l.projectShareProposal),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              l.projectMilestones,
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const Spacer(),
            TextButton.icon(
              onPressed: () => context.push('/projects/${project.id}/milestone/new'),
              icon: const Icon(Icons.add, size: 16),
              label: Text(l.buttonAdd),
              style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (project.milestones.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              l.projectNoMilestones,
              style: TextStyle(color: Colors.grey[500], fontSize: 13),
            ),
          )
        else
          ...project.milestones.map(
            (m) => _MilestoneCard(projectId: project.id, milestone: m),
          ),
      ],
    );
  }
}

class _MilestoneCard extends ConsumerWidget {
  final String projectId;
  final Milestone milestone;
  const _MilestoneCard({required this.projectId, required this.milestone});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final color = _milestoneStatusColor[milestone.status] ?? Colors.grey;
    final label = _milestoneStatusDetailLabel(l, milestone.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {},
        onLongPress: milestone.status != 'PENDING'
            ? () => _showResetDialog(context, ref)
            : null,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      milestone.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                  ),
                  Text(
                    formatUZS(milestone.amount),
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      label,
                      style: TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w600, color: color),
                    ),
                  ),
                  if (milestone.dueDate != null) ...[
                    const SizedBox(width: 8),
                    Text(
                      l.projectDuePrefix(DateFormat('d MMM').format(milestone.dueDate!)),
                      style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 10),
              _MilestoneActions(projectId: projectId, milestone: milestone),
            ],
          ),
        ),
      ),
    );
  }

  void _showResetDialog(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.projectResetMilestone),
        content: Text(l.projectResetMilestoneBody(milestone.name)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(l.buttonCancel),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref
                  .read(projectDetailProvider(projectId).notifier)
                  .resetMilestoneToPending(milestone.id);
            },
            child: Text(l.projectResetToPending),
          ),
        ],
      ),
    );
  }
}

class _MilestoneActions extends ConsumerWidget {
  final String projectId;
  final Milestone milestone;
  const _MilestoneActions({required this.projectId, required this.milestone});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final notifier = ref.read(projectDetailProvider(projectId).notifier);

    switch (milestone.status) {
      case 'PENDING':
        return SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: () async {
              await notifier.submitMilestone(milestone.id);
            },
            child: Text(l.projectSubmitForReview),
          ),
        );
      case 'SUBMITTED_FOR_REVIEW':
        return Align(
          alignment: Alignment.centerLeft,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.orange.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              l.projectWaitingApproval,
              style: const TextStyle(fontSize: 12, color: Colors.orange),
            ),
          ),
        );
      case 'APPROVED':
        return SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: () async {
              await notifier.markMilestonePaymentReceived(milestone.id);
            },
            child: Text(l.projectMarkPaymentReceived),
          ),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              l.projectInvoices,
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const Spacer(),
            TextButton.icon(
              onPressed: () => _showGenerateInvoiceDialog(context, ref),
              icon: const Icon(Icons.add, size: 16),
              label: Text(l.projectGenerate),
              style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (project.invoices.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              l.projectNoInvoices,
              style: TextStyle(color: Colors.grey[500], fontSize: 13),
            ),
          )
        else
          ...project.invoices.map(
            (inv) => _InvoiceCard(projectId: project.id, invoice: inv),
          ),
      ],
    );
  }

  void _showGenerateInvoiceDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => _GenerateInvoiceDialog(projectId: project.id),
    );
  }
}

class _InvoiceCard extends ConsumerWidget {
  final String projectId;
  final Invoice invoice;
  const _InvoiceCard({required this.projectId, required this.invoice});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final isPaid = invoice.status == 'PAID';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    invoice.invoiceNumber,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: isPaid
                        ? Colors.green.withValues(alpha: 0.12)
                        : Colors.orange.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isPaid ? l.invoiceStatusPaid : l.invoiceStatusUnpaid,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isPaid ? Colors.green[700] : Colors.orange[700],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              formatUZS(invoice.total),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            if (invoice.dueDate != null)
              Text(
                l.projectDuePrefix(DateFormat('d MMM yyyy').format(invoice.dueDate!)),
                style: TextStyle(fontSize: 12, color: Colors.grey[500]),
              ),
            const SizedBox(height: 10),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: () {
                    const baseUrl = 'http://localhost:3000/api/v1/invoices';
                    final link = '$baseUrl/${invoice.id}';
                    Clipboard.setData(ClipboardData(text: link));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(l.projectInvoiceCopied)),
                    );
                  },
                  icon: const Icon(Icons.share_outlined, size: 16),
                  label: Text(l.buttonShare),
                  style: OutlinedButton.styleFrom(
                      visualDensity: VisualDensity.compact),
                ),
                if (!isPaid) ...[
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () async {
                      await ref
                          .read(projectDetailProvider(projectId).notifier)
                          .markInvoicePaid(invoice.id);
                    },
                    style: FilledButton.styleFrom(
                        visualDensity: VisualDensity.compact),
                    child: Text(l.projectMarkPaid),
                  ),
                ],
              ],
            ),
          ],
        ),
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
    return AlertDialog(
      title: Text(l.projectGenerateInvoice),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _descCtrl,
              decoration: InputDecoration(labelText: l.productFormDescLabel),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                SizedBox(
                  width: 70,
                  child: TextField(
                    controller: _qtyCtrl,
                    decoration: InputDecoration(labelText: l.projectQty),
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _priceCtrl,
                    decoration: InputDecoration(labelText: l.projectUnitPrice),
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _dueDateCtrl,
              decoration: InputDecoration(
                  labelText: l.projectDueDateLabel,
                  hintText: l.commonOptionalLabel),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context),
          child: Text(l.buttonCancel),
        ),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: Text(l.projectGenerate),
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
