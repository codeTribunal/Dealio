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
    // Tab 3 follows business.mode: Appointments (SERVICES) / Projects (FREELANCE)
    // / Orders (PRODUCTS). All three live in shell branch 2.
    final mode =
        ref.watch(authNotifierProvider).state?.business?.mode ?? 'SERVICES';
    final isFreelance = mode == 'FREELANCE';
    final isProducts = mode == 'PRODUCTS';
    final modeTabIcon = isFreelance
        ? AppIconName.projects
        : isProducts
            ? AppIconName.orders
            : AppIconName.calendar;
    final modeTabLabel = isFreelance
        ? l.navProjects
        : isProducts
            ? l.navOrders
            : l.navAppointments;
    final modeTabRoute = isFreelance
        ? '/projects'
        : isProducts
            ? '/orders'
            : '/appointments';

    final items = <FloatingTabItem>[
      FloatingTabItem(icon: AppIconName.home, label: l.navHome),
      FloatingTabItem(icon: AppIconName.customers, label: l.navCustomers),
      FloatingTabItem(icon: modeTabIcon, label: modeTabLabel),
      FloatingTabItem(icon: AppIconName.settings, label: l.navSettings),
    ];

    final media = MediaQuery.of(context);

    // Hardware back behavior on a bare tab root (no pushed route on top):
    //  - Home tab → allow the pop so Android exits the app.
    //  - any other tab → intercept and switch to the Home tab first.
    // Pushed detail/form screens sit above this shell on the root navigator, so
    // their own back pops them normally before this PopScope is ever consulted.
    return PopScope(
      canPop: navigationShell.currentIndex == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        navigationShell.goBranch(0);
      },
      child: Scaffold(
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
                    // Mode-dependent destination — all live in branch 2.
                    context.go(modeTabRoute);
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
      ),
    );
  }
}
