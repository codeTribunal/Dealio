import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../auth/auth_notifier.dart';
import '../api/api_service.dart';
import '../locale/locale_provider.dart';
import '../services/fcm_service.dart';
import '../../features/auth/arrival_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/orders/order_list_screen.dart';
import '../../features/orders/order_detail_screen.dart';
import '../../features/catalog/catalog_screen.dart';
import '../../features/catalog/product_form_screen.dart';
import '../../features/customers/customers_screen.dart';
import '../../features/customers/customer_detail_screen.dart';
import '../../features/analytics/analytics_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../models/appointment.dart';
import '../../features/appointments/appointment_calendar_screen.dart';
import '../../features/appointments/appointment_detail_screen.dart';
import '../../features/appointments/appointment_form_screen.dart';
import '../../features/services/services_screen.dart';
import '../../features/services/service_form_screen.dart';
import '../../features/staff/staff_screen.dart';
import '../../features/staff/staff_form_screen.dart';
import '../../features/projects/projects_screen.dart';
import '../../features/projects/project_detail_screen.dart';
import '../../features/projects/project_form_screen.dart';
import '../../features/projects/milestone_form_screen.dart';
import '../../features/_design/design_tokens_screen.dart';
import '../../features/_design/design_icons_screen.dart';
import '../../features/_design/design_components_screen.dart';
import '../../features/shell/main_scaffold.dart';
import '../../shared/widgets/app_spinner.dart';

/// Exposed so FCM tap handlers can navigate without a BuildContext.
final rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final routerProvider = Provider<GoRouter>((ref) {
  // READ not WATCH — the router is created once; refreshListenable handles updates.
  // Using watch would recreate the GoRouter on every auth change, wiping nav state.
  final authNotifier = ref.read(authNotifierProvider);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: authNotifier,
    redirect: (BuildContext context, GoRouterState state) {
      // Dev-only design reference screens are always reachable (not gated by
      // auth). Debug builds only — these routes don't exist in release.
      if (kDebugMode &&
          (state.matchedLocation == '/design-tokens' ||
              state.matchedLocation == '/design-icons' ||
              state.matchedLocation == '/design-components')) {
        return null;
      }

      // Wait until startup check (token + business fetch) is complete
      if (!authNotifier.isStartupComplete) return null;

      final loggedIn = authNotifier.isAuthenticated;
      final hasBusiness = authNotifier.hasBusiness;
      final loc = state.matchedLocation;

      // Public auth screens a user may freely move between. Onboarding is
      // public because its Telegram step is what authenticates the user.
      const publicRoutes = {'/welcome', '/login', '/onboarding'};

      // Leave the splash screen once startup is known. Only a fully set-up user
      // (valid token + business) goes straight to /home. Everyone else — no
      // token, OR a token without a business (signup not finished, or the
      // business was removed) — starts at the arrival screen so they can always
      // choose Log in or Sign up. (Previously a token-but-no-business user was
      // sent straight to /onboarding and then bounced off the auth screens,
      // leaving an existing user with no way to log in.)
      if (loc == '/splash') {
        return (loggedIn && hasBusiness) ? '/home' : '/welcome';
      }

      // Logged-out users may only see the public auth screens.
      if (!loggedIn) {
        return publicRoutes.contains(loc) ? null : '/welcome';
      }

      // Logged in WITH a business: an active user has no place on the auth
      // screens — send them home.
      if (hasBusiness) {
        return publicRoutes.contains(loc) ? '/home' : null;
      }

      // Logged in but WITHOUT a business yet: keep them out of the in-app
      // screens, but let them reach the public auth screens (Log in / Sign up /
      // onboarding). Never trap them in onboarding with no way to log in.
      return publicRoutes.contains(loc) ? null : '/welcome';
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (ctx, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/welcome',
        builder: (ctx, state) => const ArrivalScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (ctx, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (ctx, state) => const OnboardingScreen(),
      ),
      // Persistent tab shell — the 4 top-level destinations. Each branch is an
      // IndexedStack child so switching tabs preserves state/scroll. Branch 2
      // holds BOTH /appointments and /projects; the tab (mode-dependent) goes
      // to whichever matches business.mode. Detail/secondary screens below are
      // top-level (root navigator) so they push OVER this shell and hide the bar.
      StatefulShellRoute.indexedStack(
        builder: (ctx, state, navigationShell) =>
            MainScaffold(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/home', builder: (ctx, state) => const HomeScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/customers',
                builder: (ctx, state) => const CustomersScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/appointments',
                builder: (ctx, state) => const AppointmentCalendarScreen()),
            GoRoute(
                path: '/projects',
                builder: (ctx, state) => const ProjectsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
                path: '/settings',
                builder: (ctx, state) => const SettingsScreen()),
          ]),
        ],
      ),
      GoRoute(
        path: '/orders',
        builder: (ctx, state) => const OrderListScreen(),
      ),
      GoRoute(
        path: '/orders/:id',
        builder: (ctx, state) {
          final id = state.pathParameters['id']!;
          return OrderDetailScreen(orderId: id);
        },
      ),
      GoRoute(
        path: '/catalog',
        builder: (ctx, state) => const CatalogScreen(),
      ),
      GoRoute(
        path: '/catalog/new',
        builder: (ctx, state) => const ProductFormScreen(),
      ),
      GoRoute(
        path: '/catalog/:id',
        builder: (ctx, state) {
          final id = state.pathParameters['id']!;
          return ProductFormScreen(productId: id);
        },
      ),
      GoRoute(
        path: '/customers/:id',
        builder: (ctx, state) {
          final id = state.pathParameters['id']!;
          return CustomerDetailScreen(customerId: id);
        },
      ),
      GoRoute(
        path: '/analytics',
        builder: (ctx, state) => const AnalyticsScreen(),
      ),
      GoRoute(
        path: '/profile',
        builder: (ctx, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/appointments/new',
        builder: (ctx, state) => const AppointmentFormScreen(),
      ),
      GoRoute(
        path: '/appointments/:id/edit',
        builder: (ctx, state) {
          // The appointment to edit is passed via `extra` from the detail
          // screen. If absent (e.g. deep-link/reload), the form falls back to
          // create mode.
          final existing = state.extra as Appointment?;
          return AppointmentFormScreen(existing: existing);
        },
      ),
      GoRoute(
        path: '/appointments/:id',
        builder: (ctx, state) {
          final id = state.pathParameters['id']!;
          return AppointmentDetailScreen(appointmentId: id);
        },
      ),
      GoRoute(
        path: '/services',
        builder: (ctx, state) => const ServicesScreen(),
      ),
      GoRoute(
        path: '/services/new',
        builder: (ctx, state) => const ServiceFormScreen(),
      ),
      GoRoute(
        path: '/services/:id',
        builder: (ctx, state) {
          final id = state.pathParameters['id']!;
          return ServiceFormScreen(serviceId: id);
        },
      ),
      GoRoute(
        path: '/staff',
        builder: (ctx, state) => const StaffScreen(),
      ),
      GoRoute(
        path: '/staff/new',
        builder: (ctx, state) => const StaffFormScreen(),
      ),
      GoRoute(
        path: '/staff/:id',
        builder: (ctx, state) {
          final id = state.pathParameters['id']!;
          return StaffFormScreen(staffId: id);
        },
      ),
      GoRoute(
        path: '/projects/new',
        builder: (ctx, state) => const ProjectFormScreen(),
      ),
      GoRoute(
        path: '/projects/:id',
        builder: (ctx, state) {
          final id = state.pathParameters['id']!;
          return ProjectDetailScreen(projectId: id);
        },
      ),
      GoRoute(
        path: '/projects/:id/milestone/new',
        builder: (ctx, state) {
          final id = state.pathParameters['id']!;
          return MilestoneFormScreen(projectId: id);
        },
      ),
      // Dev-only: design reference screens. Debug builds only — these routes
      // do not exist in release (gated on kDebugMode).
      if (kDebugMode) ...[
        GoRoute(
          path: '/design-tokens',
          builder: (ctx, state) => const DesignTokensScreen(),
        ),
        GoRoute(
          path: '/design-icons',
          builder: (ctx, state) => const DesignIconsScreen(),
        ),
        GoRoute(
          path: '/design-components',
          builder: (ctx, state) => const DesignComponentsScreen(),
        ),
      ],
    ],
  );
});

// Shown while checking stored token
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // Defer so the widget tree is built before navigation
    WidgetsBinding.instance.addPostFrameCallback((_) => _init());
  }

  Future<void> _init() async {
    await ref.read(authNotifierProvider).initialize();

    if (ref.read(authNotifierProvider).isAuthenticated) {
      // Fetch business so the router knows whether to go to /onboarding or /home
      try {
        final business = await ref.read(apiServiceProvider).getBusiness();
        ref.read(authNotifierProvider).finishStartup(business);
        // Sync app language to the business language on first launch (only
        // when the user has not manually picked a language in Settings).
        ref
            .read(localeProvider.notifier)
            .syncFromBusinessLanguage(business.language)
            .ignore();
      } catch (_) {
        // 404 = no business yet; any other error treated the same way
        ref.read(authNotifierProvider).finishStartup(null);
      }
      // Best-effort FCM token refresh after reinstall
      registerFcmToken(ref.read(apiServiceProvider)).ignore();
    }
    // Navigation is handled by the router's refreshListenable — no manual go() needed.
  }

  @override
  Widget build(BuildContext context) {
    // Branding surface colors (the splash uses the paper lockup palette, not the
    // app's bluish surface tokens): paper hsl(60,20%,98%), slate hsl(222,47%,11%).
    const paper = Color(0xFFFBFBF9);
    const slate = Color(0xFF0F172A);
    const brandBlue = Color(0xFF3B82F6); // hsl(217,91%,60%) — matches the mark's wedge/dot

    final screenW = MediaQuery.of(context).size.width;
    final markW = screenW * 0.28; // mark ~28% of screen width
    final gap = markW * 0.30; // 24:80 native ratio between mark and wordmark
    final wordSize = markW * 0.45; // sizes "Dealio." to ~40% width (the lockup)

    return Scaffold(
      backgroundColor: paper,
      body: Stack(
        children: [
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Mark (unchanged geometry; slate D-stroke + blue wedge + dot)
                SvgPicture.asset(
                  'assets/branding/splash_mark.svg',
                  width: markW,
                ),
                SizedBox(height: gap),
                // Wordmark "Dealio." — Inter Bold, slate with a brand-blue period
                Text.rich(
                  const TextSpan(
                    text: 'Dealio',
                    children: [
                      TextSpan(
                        text: '.',
                        style: TextStyle(color: brandBlue),
                      ),
                    ],
                  ),
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w700,
                    fontSize: wordSize,
                    color: slate,
                    height: 1.0,
                  ),
                ),
              ],
            ),
          ),
          // Subtle loading indicator while auth/business resolves.
          const Align(
            alignment: Alignment(0, 0.78),
            child: AppSpinner(size: 24),
          ),
        ],
      ),
    );
  }
}
