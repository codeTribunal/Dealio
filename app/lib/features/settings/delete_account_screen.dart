import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/theme/app_tokens.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_dialog.dart';
import '../../shared/widgets/app_text_field.dart';
import 'account_deletion_provider.dart';

/// Full-screen confirmation for self-serve account deletion. Explains what is
/// deleted, the 30-day recovery window (log in again + Restore account), and
/// that after 30 days deletion is permanent. The destructive primary button
/// opens a final typed-confirmation dialog.
class DeleteAccountScreen extends ConsumerWidget {
  const DeleteAccountScreen({super.key});

  Future<void> _openConfirmGate(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => const _DeleteConfirmDialog(),
    );
    if (confirmed != true || !context.mounted) return;

    // Success: reuse the existing sign-out path to clear local auth/session,
    // then route to login where the scheduled-deletion notice is shown. Capture
    // the router before logout, since signing out redirects and disposes this
    // screen's context.
    final router = GoRouter.of(context);
    await ref.read(authNotifierProvider).logout();
    router.go('/login');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.deleteAccountTitle)),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.s5),
                children: [
                  Text(
                    l.deleteAccountHeading,
                    style: TextStyle(
                      fontSize: AppTextSizes.h2,
                      fontWeight: AppFontWeights.extra,
                      color: t.text1,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s2),
                  Text(
                    l.deleteAccountIntro,
                    style:
                        TextStyle(fontSize: AppTextSizes.base, color: t.text2),
                  ),
                  const SizedBox(height: AppSpacing.s5),
                  _InfoBlock(
                    title: l.deleteAccountWhatTitle,
                    body: l.deleteAccountWhatBody,
                  ),
                  _InfoBlock(
                    title: l.deleteAccountBotTitle,
                    body: l.deleteAccountBotBody,
                  ),
                  _InfoBlock(
                    title: l.deleteAccountRecoveryTitle,
                    body: l.deleteAccountRecoveryBody,
                  ),
                  _InfoBlock(
                    title: l.deleteAccountPermanentTitle,
                    body: l.deleteAccountPermanentBody,
                    emphasize: true,
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.s5, 0, AppSpacing.s5, AppSpacing.s4),
              child: Column(
                children: [
                  AppButton(
                    label: l.deleteAccountContinueButton,
                    variant: AppButtonVariant.danger,
                    fullWidth: true,
                    onPressed: () => _openConfirmGate(context, ref),
                  ),
                  const SizedBox(height: AppSpacing.s2),
                  AppButton(
                    label: l.deleteAccountCancelButton,
                    variant: AppButtonVariant.ghost,
                    fullWidth: true,
                    onPressed: () => context.pop(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoBlock extends StatelessWidget {
  final String title;
  final String body;
  final bool emphasize;
  const _InfoBlock({
    required this.title,
    required this.body,
    this.emphasize = false,
  });

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: AppTextSizes.base,
              fontWeight: AppFontWeights.bold,
              color: emphasize ? t.errorStrong : t.text1,
            ),
          ),
          const SizedBox(height: AppSpacing.s1),
          Text(
            body,
            style: TextStyle(
              fontSize: AppTextSizes.sm,
              color: t.text2,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

/// Final gate: the destructive button stays disabled until the user types the
/// localized confirmation word. Loading/error come from [accountDeletionProvider].
class _DeleteConfirmDialog extends ConsumerStatefulWidget {
  const _DeleteConfirmDialog();

  @override
  ConsumerState<_DeleteConfirmDialog> createState() =>
      _DeleteConfirmDialogState();
}

class _DeleteConfirmDialogState extends ConsumerState<_DeleteConfirmDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    final ok =
        await ref.read(accountDeletionProvider.notifier).requestDeletion();
    if (ok && mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final t = AppTokens.of(context);
    final state = ref.watch(accountDeletionProvider);

    final word = l.deleteAccountConfirmWord;
    final matches =
        _controller.text.trim().toLowerCase() == word.toLowerCase();

    return AppDialog(
      title: l.deleteAccountDialogTitle,
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l.deleteAccountDialogBody),
          const SizedBox(height: AppSpacing.s2),
          Text(
            word,
            style: TextStyle(
              fontSize: AppTextSizes.lg,
              fontWeight: AppFontWeights.extra,
              color: t.errorStrong,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: AppSpacing.s3),
          AppTextField(
            label: l.deleteAccountConfirmFieldLabel,
            controller: _controller,
            onChanged: (_) => setState(() {}),
          ),
          if (state.error != null) ...[
            const SizedBox(height: AppSpacing.s2),
            Text(
              l.deleteAccountError,
              style: TextStyle(color: t.errorStrong, fontSize: AppTextSizes.sm),
            ),
          ],
        ],
      ),
      actions: [
        AppButton(
          label: l.deleteAccountCancelButton,
          variant: AppButtonVariant.ghost,
          onPressed:
              state.loading ? null : () => Navigator.of(context).pop(false),
        ),
        AppButton(
          label: l.deleteAccountConfirmButton,
          variant: AppButtonVariant.danger,
          loading: state.loading,
          onPressed: matches && !state.loading ? _confirm : null,
        ),
      ],
    );
  }
}
