import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_service.dart';
import '../../core/auth/auth_notifier.dart';

/// Loading/error state for the account-deletion and reactivation actions. All
/// logic lives here, not in the widgets.
class AccountDeletionState {
  final bool loading;
  final String? error;

  const AccountDeletionState({this.loading = false, this.error});
}

class AccountDeletionNotifier extends Notifier<AccountDeletionState> {
  @override
  AccountDeletionState build() => const AccountDeletionState();

  /// Request account deletion. Returns true on success; the caller then signs
  /// out and routes to login. Sets [accountDeletionScheduledProvider] so the
  /// login screen can show the scheduled-deletion notice.
  Future<bool> requestDeletion() async {
    state = const AccountDeletionState(loading: true);
    try {
      await ref.read(apiServiceProvider).requestAccountDeletion();
      ref.read(accountDeletionScheduledProvider.notifier).state = true;
      state = const AccountDeletionState();
      return true;
    } on ApiException catch (e) {
      state = AccountDeletionState(error: e.message);
      return false;
    } catch (_) {
      state = const AccountDeletionState(error: 'unknown');
      return false;
    }
  }

  /// Cancel a pending deletion and restore the account. Refreshes the business
  /// so the app leaves the grace state. Returns true on success.
  Future<bool> reactivate() async {
    state = const AccountDeletionState(loading: true);
    try {
      final api = ref.read(apiServiceProvider);
      await api.reactivateAccount();
      final business = await api.getBusiness();
      ref.read(authNotifierProvider).setBusiness(business);
      state = const AccountDeletionState();
      return true;
    } on ApiException catch (e) {
      state = AccountDeletionState(error: e.message);
      return false;
    } catch (_) {
      state = const AccountDeletionState(error: 'unknown');
      return false;
    }
  }
}

final accountDeletionProvider =
    NotifierProvider<AccountDeletionNotifier, AccountDeletionState>(
  AccountDeletionNotifier.new,
);

/// Set true right after a deletion is scheduled so the login screen shows the
/// scheduled-deletion notice once. The login screen clears it when dismissed.
final accountDeletionScheduledProvider = StateProvider<bool>((ref) => false);
