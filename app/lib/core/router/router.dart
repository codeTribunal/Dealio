import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_notifier.dart';
import '../api/api_service.dart';
import '../locale/locale_provider.dart';
import '../services/fcm_service.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/otp_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/orders/order_list_screen.dart';
import '../../features/orders/order_detail_screen.dart';
import '../../features/catalog/catalog_screen.dart';
import '../../features/catalog/product_form_screen.dart';
import '../../features/customers/customers_screen.dart';
import '../../features/customers/customer_detail_screen.dart';
import '../../features/analytics/analytics_screen.dart';
import '../../features/settings/settings_screen.dart';
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
      // Wait until startup check (token + business fetch) is complete
      if (!authNotifier.isStartupComplete) return null;

      final loggedIn = authNotifier.isAuthenticated;
      final hasBusiness = authNotifier.hasBusiness;
      final loc = state.matchedLocation;

      // Leave splash: send to login, onboarding, or home
      if (loc == '/splash') {
        if (!loggedIn) return '/login';
        return hasBusiness ? '/home' : '/onboarding';
      }

      // Unauthenticated users can only access login/otp
      const publicRoutes = {'/login', '/otp'};
      if (!loggedIn && !publicRoutes.contains(loc)) return '/login';

      if (loggedIn) {
        // Bounce away from auth screens
        if (loc == '/login' || loc == '/otp') {
          return hasBusiness ? '/home' : '/onboarding';
        }
        // Prevent re-entering onboarding once business is set
        if (loc == '/onboarding' && hasBusiness) return '/home';
        // Redirect authenticated users without a business to onboarding
        // (allow /onboarding itself to stay)
        if (!hasBusiness && loc != '/onboarding') return '/onboarding';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (ctx, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (ctx, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/otp',
        builder: (ctx, state) {
          final phone = state.extra as String? ?? '';
          return OtpScreen(phone: phone);
        },
      ),
      GoRoute(
        path: '/onboarding',
        builder: (ctx, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (ctx, state) => const HomeScreen(),
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
        path: '/customers',
        builder: (ctx, state) => const CustomersScreen(),
      ),
      GoRoute(
        path: '/customers/:id',
        builder: (ctx, state) {
          final id = state.pathParameters['id']!;
          return CustomerDetailScreen(customerId: id);
        },
      ),
      GoRoute(
        path: '/settings',
        builder: (ctx, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/analytics',
        builder: (ctx, state) => const AnalyticsScreen(),
      ),
      GoRoute(
        path: '/appointments',
        builder: (ctx, state) => const AppointmentCalendarScreen(),
      ),
      GoRoute(
        path: '/appointments/new',
        builder: (ctx, state) => const AppointmentFormScreen(),
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
        path: '/projects',
        builder: (ctx, state) => const ProjectsScreen(),
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
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
