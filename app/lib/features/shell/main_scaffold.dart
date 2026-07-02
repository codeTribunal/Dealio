import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/icons/app_icon.dart';
import '../../core/router/route_observers.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/floating_tab_bar.dart';
import '../home/home_provider.dart';

/// Persistent tab shell for the 4 top-level destinations. The body is the
/// go_router [StatefulNavigationShell] (an IndexedStack of branches, so each
/// tab keeps its own navigation/scroll state), with the floating tab bar
/// overlaid on top. Pushed detail screens live on the root navigator and so
/// cover this shell — the tab bar is hidden on them.
///
/// The shell also drives the home-dashboard refresh-on-focus. Home is branch 0,
/// living in its own nested navigator, so a [RouteAware] on the home screen
/// itself would never see the root-navigator detail screens push/pop over it —
/// only THIS shell route (on the root navigator) does. So the refresh triggers
/// all live here and invalidate [homeProvider] (which the home screen watches),
/// gated to when Home is the visible tab:
///   • return to Home by popping a detail screen  → [didPopNext]
///   • app resumed from background                → [didChangeAppLifecycleState]
///   • switching back to the Home tab             → branch-index transition in [build]
/// Pull-to-refresh on the home screen is separate and intentionally unthrottled.
class MainScaffold extends ConsumerStatefulWidget {
  final StatefulNavigationShell navigationShell;
  const MainScaffold({super.key, required this.navigationShell});

  @override
  ConsumerState<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends ConsumerState<MainScaffold>
    with WidgetsBindingObserver, RouteAware {
  /// Minimum spacing between focus-driven refreshes. A single timestamp shared
  /// by every trigger (pop, resume, tab re-selection) so rapid focus changes
  /// don't hammer the API. Pull-to-refresh does not go through here.
  static const _refreshThrottle = Duration(seconds: 15);
  DateTime? _lastHomeRefresh;

  /// The shell's own root-navigator route, subscribed to [rootRouteObserver].
  ModalRoute<void>? _subscribedRoute;

  /// Previous shell branch index, to detect transitions back INTO Home (0).
  int? _lastIndex;

  bool get _homeIsActive => widget.navigationShell.currentIndex == 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Subscribe to the SHELL route on the root navigator (not the home branch
    // route). Re-subscribe only if the route identity actually changed, since
    // didChangeDependencies can fire on unrelated inherited-widget changes.
    final ModalRoute<void>? route = ModalRoute.of(context);
    if (route != null && route != _subscribedRoute) {
      if (_subscribedRoute != null) rootRouteObserver.unsubscribe(this);
      _subscribedRoute = route;
      rootRouteObserver.subscribe(this, route);
    }
  }

  @override
  void dispose() {
    if (_subscribedRoute != null) rootRouteObserver.unsubscribe(this);
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Invalidate the /home provider, throttled. The home screen watches
  /// [homeProvider], so this refetches the hero counts (and, via the provider's
  /// build, the business used by mode-aware widgets) without a spinner flash —
  /// Riverpod keeps showing the previous value while refreshing.
  void _refreshHome() {
    final now = DateTime.now();
    if (_lastHomeRefresh != null &&
        now.difference(_lastHomeRefresh!) < _refreshThrottle) {
      return;
    }
    _lastHomeRefresh = now;
    ref.invalidate(homeProvider);
  }

  /// Only refresh when Home is the visible tab — returning to any other tab, or
  /// resuming on it, must not fetch /home.
  void _refreshHomeIfActive() {
    if (_homeIsActive) _refreshHome();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refreshHomeIfActive();
  }

  @override
  void didPopNext() {
    // A root-navigator detail screen above the shell was popped, revealing the
    // shell again (e.g. back from an order after confirming payment).
    _refreshHomeIfActive();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;

    // Tab re-selection back to Home does NOT push/pop a route (the IndexedStack
    // just swaps its visible child), so didPopNext never fires for it — detect
    // the index transition INTO Home here instead. Guard on a non-null previous
    // index so the initial mount on Home doesn't count as a re-selection.
    final index = widget.navigationShell.currentIndex;
    if (index == 0 && _lastIndex != null && _lastIndex != 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _refreshHome();
      });
    }
    _lastIndex = index;

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
      canPop: index == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        widget.navigationShell.goBranch(0);
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
              child: widget.navigationShell,
            ),
            Align(
              alignment: Alignment.bottomCenter,
              child: FloatingTabBar(
                items: items,
                currentIndex: index,
                onTap: (i) {
                  if (i == 2) {
                    // Mode-dependent destination — all live in branch 2.
                    context.go(modeTabRoute);
                  } else {
                    widget.navigationShell.goBranch(
                      i,
                      initialLocation: i == widget.navigationShell.currentIndex,
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
