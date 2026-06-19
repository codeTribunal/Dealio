import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/icons/app_icon.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/floating_tab_bar.dart';

/// Persistent tab shell for the 4 top-level destinations. The body is the
/// go_router [StatefulNavigationShell] (an IndexedStack of branches, so each
/// tab keeps its own navigation/scroll state), with the floating tab bar
/// overlaid on top. Pushed detail screens live on the root navigator and so
/// cover this shell — the tab bar is hidden on them.
class MainScaffold extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;
  const MainScaffold({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    // Tab 3 follows business.mode: Appointments (SERVICES) vs Projects (FREELANCE).
    final mode = ref.watch(authNotifierProvider).state?.business?.mode ?? 'SERVICES';
    final isFreelance = mode == 'FREELANCE';

    final items = <FloatingTabItem>[
      FloatingTabItem(icon: AppIconName.home, label: l.navHome),
      FloatingTabItem(icon: AppIconName.customers, label: l.navCustomers),
      FloatingTabItem(
        icon: isFreelance ? AppIconName.projects : AppIconName.calendar,
        label: isFreelance ? l.navProjects : l.navAppointments,
      ),
      FloatingTabItem(icon: AppIconName.settings, label: l.navSettings),
    ];

    final media = MediaQuery.of(context);

    return Scaffold(
      // Each tab screen has its own Scaffold that already insets for the
      // keyboard. Without this, the inset is applied twice (nested Scaffolds),
      // which pushes a focused field up under the app bar and leaves a large
      // empty gap below. Let the inner screen handle the keyboard.
      resizeToAvoidBottomInset: false,
      body: Stack(
        children: [
          // Extra bottom inset so each tab's scrollables (and any FAB) clear
          // the floating bar; the translucent glass still reveals content
          // scrolling beneath it.
          MediaQuery(
            data: media.copyWith(
              padding:
                  media.padding.copyWith(bottom: media.padding.bottom + 76),
            ),
            child: navigationShell,
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: FloatingTabBar(
              items: items,
              currentIndex: navigationShell.currentIndex,
              onTap: (i) {
                if (i == 2) {
                  // Mode-dependent destination — both live in branch 2.
                  context.go(isFreelance ? '/projects' : '/appointments');
                } else {
                  navigationShell.goBranch(
                    i,
                    initialLocation: i == navigationShell.currentIndex,
                  );
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
