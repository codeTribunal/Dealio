# Flutter App
Audience: internal
Last updated: 2026-07-03
Verified against: 64a177a

---

The owner-facing mobile app (`app/`, package name `dealio`, version 1.0.0+1, app/pubspec.yaml:1-3). Flutter + Riverpod + Dio. Entry point `void main()` (app/lib/main.dart:107). This document covers navigation, providers, push handling, local storage, and API configuration. Source: functionality inventory section F, spot-verified against the code files cited below.

---

## 1. Navigation (go_router)

The router is built in `routerProvider` (app/lib/core/router/router.dart:76) with `initialLocation: '/splash'` (:83). It is created once and reads (not watches) `authNotifierProvider`; navigation updates come through `refreshListenable` so tab state is not wiped on auth changes (:77-84).

### 1.1 Route and screen map

| Route | Screen | Evidence (router.dart) |
|---|---|---|
| /splash | SplashScreen (defined in router.dart) | :157-160 |
| /welcome | ArrivalScreen | :161-164 |
| /login | LoginScreen (single 2-step phone/code screen; there is no `/otp` route) | :165-168 |
| /onboarding | OnboardingScreen | :169-172 |
| /home | HomeScreen (shell branch 0) | :182-184 |
| /customers | CustomersScreen (shell branch 1) | :185-189 |
| /appointments | AppointmentCalendarScreen (shell branch 2) | :190-193 |
| /projects | ProjectsScreen (shell branch 2) | :194-196 |
| /orders | OrderListScreen (shell branch 2) | :197-199 |
| /settings | SettingsScreen (shell branch 3) | :201-205 |
| /orders/new | OrderFormScreen (declared before `/orders/:id` so "new" is not captured as an id, :208-210) | :211-214 |
| /orders/:id | OrderDetailScreen | :215-221 |
| /catalog | CatalogScreen | :222-225 |
| /catalog/new | ProductFormScreen (create) | :226-229 |
| /catalog/:id | ProductFormScreen (edit) | :230-236 |
| /customers/:id | CustomerDetailScreen | :237-243 |
| /analytics | AnalyticsScreen | :244-247 |
| /calendar | CalendarScreen (mode-aware schedule list) | :250-253 |
| /profile | ProfileScreen | :254-257 |
| /appointments/new | AppointmentFormScreen | :258-261 |
| /appointments/:id/edit | AppointmentFormScreen (existing passed via `extra`; falls back to create mode on deep-link/reload, :263-270) | :262-271 |
| /appointments/:id | AppointmentDetailScreen | :272-278 |
| /services | ServicesScreen | :279-282 |
| /services/new | ServiceFormScreen (create) | :283-286 |
| /services/:id | ServiceFormScreen (edit) | :287-293 |
| /staff | StaffScreen | :294-297 |
| /staff/new | StaffFormScreen (create) | :298-301 |
| /staff/:id | StaffFormScreen (edit) | :302-308 |
| /projects/new | ProjectFormScreen | :309-312 |
| /projects/:id | ProjectDetailScreen | :313-319 |
| /projects/:id/milestone/new | MilestoneFormScreen | :320-326 |
| /design-tokens, /design-icons, /design-components | Design reference screens, `kDebugMode` only (do not exist in release) | :329-341 |

There is no `/messages` route. See section 3 for the FCM tap path that can nonetheless target it.

### 1.2 StatefulShellRoute (the persistent tab shell)

`StatefulShellRoute.indexedStack` builds `MainScaffold` and holds the four top-level destinations, each an `IndexedStack` child so tab switches preserve scroll and state (:178-207). Branches:

| Branch | Route(s) | Note |
|---|---|---|
| 0 | /home | :182-184 |
| 1 | /customers | :185-189 |
| 2 | /appointments, /projects, /orders | The visible tab is mode-dependent: it routes to whichever of the three matches `business.mode` (comment :173-177) |
| 3 | /settings | :201-205 |

Detail and secondary screens (section 1.1 rows below `/settings`) are top-level routes on the root navigator, so they push over the shell and hide the tab bar (:176-177).

### 1.3 Redirect and mode-guard logic

The `redirect` callback (:88-155) runs in this order:

1. `kDebugMode` design routes (`/design-tokens`, `/design-icons`, `/design-components`) are always reachable, not gated by auth (:91-96).
2. Returns null (no redirect) until `authNotifier.isStartupComplete` (:99), that is, until the stored-token check and the business fetch resolve.
3. From `/splash`: go to `/home` only if `loggedIn && hasBusiness`, otherwise `/welcome` (:116-118).
4. Logged out: only the public routes `{/welcome, /login, /onboarding}` are allowed; anything else redirects to `/welcome` (:121-123). Onboarding is public because its Telegram step is what authenticates the user (:105-107).
5. Logged in with a business: public routes redirect to `/home` (:127-128); otherwise the mode guard applies (below); otherwise pass through.
6. Logged in without a business yet: only the public routes are allowed, else `/welcome` (:151-154).

Mode guard (:134-147, map `_allowedModesForRoute` :64-74). Off-mode access via deep link, `go()`, or a push tap redirects to `/home` and shows a brief snackbar through the app-level `rootScaffoldMessengerKey` (:138-145). This mirrors the web `useModeGuard`. The map:

| Route prefix | Allowed mode(s) |
|---|---|
| /orders, /catalog | PRODUCTS |
| /appointments, /services | SERVICES |
| /projects | FREELANCE |
| /calendar | PRODUCTS or FREELANCE (not SERVICES, which uses the real appointments calendar) |
| home, customers, staff, analytics, settings, profile | all modes (map returns null, passes through) |

The mode is read from `authNotifier.state?.business?.mode` and defaults to `SERVICES` when absent (:136).

---

## 2. Provider inventory

| Provider | Type | File:line | Manages |
|---|---|---|---|
| routerProvider | Provider\<GoRouter> | core/router/router.dart:76 | The router instance |
| dioProvider | Provider\<Dio> | core/api/api_client.dart:8 | Dio: baseUrl, 10s connect/receive timeouts, AuthInterceptor, plus a debug-only LogInterceptor (:8-29) |
| apiServiceProvider | Provider\<ApiService> | core/api/api_service.dart:1229 | Typed wrapper over all backend endpoints |
| authNotifierProvider | ChangeNotifierProvider | core/auth/auth_notifier.dart:140 | JWT in SharedPreferences, User, Business, startup gating, logout |
| localeProvider | StateNotifierProvider | core/locale/locale_provider.dart:72 | uz/ru/en locale; persisted as `app_locale`; syncs from `business.language` if the user never picked one manually |
| businessProvider | AsyncNotifierProvider | core/providers/business_provider.dart:20 | GET /business |
| homeProvider | AsyncNotifierProvider | features/home/home_provider.dart:24 | Dashboard data; syncs business into authNotifier |
| analyticsProvider | AsyncNotifierProvider | features/analytics/analytics_provider.dart:18 | GET /analytics |
| ordersProvider | AsyncNotifierProvider | features/orders/orders_provider.dart:85 | Order list: status filter, client-side search, showDeleted, delete/restore |
| orderDetailProvider | AsyncNotifierProvider.family | features/orders/order_detail_provider.dart:42 | Single order; confirmPayment, updateStatus |
| _orderFormProductsProvider | FutureProvider.autoDispose (private) | features/orders/order_form_screen.dart:20 | Active products for the line-item picker |
| catalogProvider | AsyncNotifierProvider | features/catalog/catalog_provider.dart:50 | Products; optimistic toggle; delete |
| customersProvider | AsyncNotifierProvider | features/customers/customers_provider.dart:73 | Customers: search, showDeleted, create/delete/restore |
| customerDetailProvider | AsyncNotifierProvider.family | features/customers/customer_detail_provider.dart:96 | Detail: notes, custom fields, tags, reminders, message send, stage |
| customerSearchQueryProvider / customerSearchProvider | StateProvider / FutureProvider.family | features/customers/customer_search_provider.dart:6-13 | Server-side customer search (min 2 chars) |
| appointmentsProvider | AsyncNotifierProvider | features/appointments/appointments_provider.dart:210 | Per-date appointments, in-memory cache plus 14-day prefetch, staff/status filters |
| appointmentDetailProvider | FutureProvider.family | features/appointments/appointments_provider.dart:215 | Single appointment |
| servicesProvider | AsyncNotifierProvider | features/services/services_provider.dart:48 | Services CRUD plus toggle |
| staffProvider | AsyncNotifierProvider | features/staff/staff_provider.dart:49 | Staff CRUD |
| projectsProvider / projectDetailProvider | AsyncNotifierProvider (plus family) | features/projects/projects_provider.dart:18, :91 | Projects list / detail incl. milestones, markInvoicePaid |
| settingsProvider | AsyncNotifierProvider | features/settings/settings_provider.dart:164 | Business plus bot link; saveProfile/saveMode sync into authNotifier |
| reminderSettingsProvider | AsyncNotifierProvider | features/settings/reminder_settings_provider.dart:33 | Reminder toggles/timing; optimistic with rollback |
| customFieldsProvider / stagesProvider / checkoutQuestionsProvider | AsyncNotifierProvider | features/settings/customization_provider.dart:34 / :63 / :106 | Custom fields / stages / checkout questions |
| blockedTimeProvider | AsyncNotifierProvider | features/settings/blocked_time_provider.dart:44 | Blocked slots |
| onboardingProvider | StateNotifierProvider.autoDispose | features/onboarding/onboarding_provider.dart:272 | Signup wizard: name, mode (SERVICES/FREELANCE only), bot-token verify, Telegram enrollment plus consents |
| emailConsentActionsProvider | Provider | features/settings/email_consent_actions.dart:11 | Owner email/newsletter consent save/dismiss |

---

## 3. Push notifications (FCM)

### 3.1 Initialization

In `main()` (app/lib/main.dart:107-124): `Firebase.initializeApp()` (:113), then `FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler)` (:115), then `FirebaseMessaging.instance.requestPermission(alert, badge, sound)` (:117-121). The background handler is a top-level `@pragma('vm:entry-point')` function that re-inits Firebase (:18-21). Foreground/tap listeners are wired in `_AppState._setupFcmHandlers` (:140-154).

### 3.2 Token registration

`registerFcmToken(api)` (core/services/fcm_service.dart:8-17) reads `FirebaseMessaging.instance.getToken()` and calls `api.registerDeviceToken`, which does `POST /device-token` (api_service.dart:254-260). Errors are swallowed (push is best-effort). It is called after login verify (features/auth/login_screen.dart:92) and on cold-start splash (router.dart:382). There is no `onTokenRefresh` listener (NOT FOUND), so a token that rotates while the app is not doing a login or cold start is not re-registered until the next such event.

A legacy `registerFcmToken` ApiService method doing `PATCH /business/fcm-token` also exists (api_service.dart:246-252) but has no callers, matching the vestigial `Business.fcmToken` column.

### 3.3 Foreground banner

`onMessage` triggers `_showForegroundBanner` (main.dart:50-105). It shows a `MaterialBanner` with the notification title/body, a View action (when a route resolves) and a Dismiss action, auto-dismissed after 4 seconds (:102-104). It returns early when `message.notification` is null (:51-52), so data-only messages show no banner.

### 3.4 Tap navigation and the `/messages` dead route

`onMessageOpenedApp` (background tap) and `getInitialMessage` (terminated tap, run post-frame) both call `_navigateForMessage` (main.dart:42-48, 145-153), which maps the message data via `_routeFromData` (:24-40):

| `data.type` | Resolved route |
|---|---|
| order | `/orders/<orderId>`, or `/orders` if no id |
| appointment | `/appointments` |
| project | `/projects/<projectId>`, or `/projects` if no id |
| message | `/messages/<customerId>`, or `/messages` |

The `message` type resolves to `/messages/:customerId` or `/messages` (main.dart:35-37), but no such route exists in the router (section 1). A push of type `message` therefore navigates to an unmatched route. Note the router mode guard also gates the other targets: for example an `order` push on a SERVICES-mode business would be redirected to `/home` with a snackbar (section 1.3).

---

## 4. Local storage and sign-out

### 4.1 SharedPreferences keys (complete set)

| Key | Constant | File:line |
|---|---|---|
| auth_token | `_kTokenKey` | core/auth/auth_notifier.dart:10 (written :118, removed :99 and :133) |
| app_locale | `_localeKey` | core/locale/locale_provider.dart:5 |

There is no persistent data cache. No hive, sqflite, or secure-storage dependency exists in pubspec, so CLAUDE.md's "offline read caching" is Not implemented. The appointments list keeps only an in-memory per-date cache that is lost on restart (features/appointments/appointments_provider.dart). `cached_network_image` is used in exactly one screen (order detail).

### 4.2 Sign-out

`logout()` (auth_notifier.dart:131-137) removes `auth_token` from SharedPreferences and nulls the in-memory `AuthState`, then notifies listeners so the router redirects to `/welcome`. It is triggered from Profile (profile screen) and by the Dio interceptor on a 401 (section 5).

Logout does NOT:
- clear `app_locale` (the chosen language survives sign-out),
- call `FirebaseMessaging.deleteToken()` (the FCM token remains on the device), or
- deregister the device token server-side (no DELETE call; the `DeviceToken` row persists in the backend).

The practical effect is that a device that signs out keeps its server-side push registration until that token is overwritten or expires.

---

## 5. API base URL configuration

`AppConfig.apiBaseUrl` is `String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3000/api/v1')` (app/lib/core/config/app_config.dart:9-12). The prefix `/api/v1` is baked into the base URL here. The dev default targets the device's own localhost, bridged to the PC backend via `adb reverse tcp:3000 tcp:3000` (comment :4-8); this differs from CLAUDE.md's `10.0.2.2` emulator address.

Release guard: `assertReleaseConfig()` (app_config.dart:28-39), called first thing in `main()` (main.dart:110), throws a `StateError` in `kReleaseMode` when `API_BASE_URL` was not supplied via `--dart-define` (tracked by `_apiBaseOverridden`, :15-16). This prevents shipping a release binary that silently targets the localhost dev default. Debug and profile builds are unaffected. The pinned release command is `flutter build appbundle --release --dart-define=API_BASE_URL=<prod-api>/api/v1` (:26-35).

Dio configuration (core/api/api_client.dart:8-29): base URL from `AppConfig.apiBaseUrl`, 10s connect and receive timeouts, `AuthInterceptor`, and a debug-only `LogInterceptor`. `AuthInterceptor` attaches `Authorization: Bearer <token>` from `authNotifierProvider` on each request (auth_interceptor.dart:12-18). On a 401 from a non-auth path it calls `logout()` (:26-32); paths containing `/auth/` are exempt so a bad login/enroll code does not clear the session. There is no token-refresh mechanism.

---

## 6. Dependency notes

Dead dependencies declared in pubspec but never imported: `image_picker` ^1.1.2 and `table_calendar` ^3.1.2 (app/pubspec.yaml). The appointment calendar is custom-built rather than using `table_calendar`, and no screen wires up `image_picker` (product photos are URL strings set only via direct API calls, not through the app UI). Localization ships three locales (app_en.arb, app_ru.arb, app_uz.arb) rather than the two CLAUDE.md promised; the device locale is honored for ru/en, otherwise uz (locale_provider.dart:12-19).
