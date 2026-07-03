# Web

Audience: internal
Last updated: 2026-07-03
Verified against: 64a177a

---

The `web/` surface is a single Next.js 14.2.35 App Router deployment (React 18, axios, js-cookie, Tailwind 3; web/package.json:11-30) that serves three distinct audiences from one codebase: the owner dashboard, the platform admin panel, and a handful of public pages. There is no separate admin service. Key structural facts:

- Every page is `'use client'`. There are no server route handlers (no `route.ts`) and, critically, no `middleware.ts`. All access gating is client-side (see Auth models).
- One root layout wraps every route in `I18nProvider > BusinessProvider > ToastProvider` (web/app/layout.tsx:51-72). `BusinessProvider` fires `GET /business` on every hard page load (web/lib/businessContext.tsx:25-38).
- `next.config.mjs` is empty; no `vercel.json`.
- Owner-facing API calls go through `web/lib/api.ts` (axios instance, Bearer interceptor). Admin calls go through a separate instance in `web/lib/adminApi.ts` (cookie + CSRF header). The two never share an axios instance.

---

## 1. Route map

Access column legend: **owner** = gated by `AuthLayout` (owner JWT); **admin** = gated by `AdminLayout` (admin session); **admin (SUPER_ADMIN)** = same gate, nav link additionally hidden for non-super admins client-side, server enforces; **public** = no gate.

### 1.1 Owner dashboard pages

Gate: `AuthLayout` useEffect redirects to `/welcome` when `isAuthenticated()` is false (web/components/AuthLayout.tsx:24-33). Mode gate: `useModeGuard` (web/lib/businessContext.tsx:59-77) redirects off-mode routes.

| Route | Access | Mode gate / notes |
|---|---|---|
| `/` | owner | Home dashboard plus payment queue (web/app/page.tsx:5) |
| `/customers`, `/customers/[id]` | owner | AuthLayout only |
| `/orders` | owner | `useModeGuard('PRODUCTS')` (web/app/orders/page.tsx:35) |
| `/orders/[id]` | owner | AuthLayout only, no mode guard |
| `/catalog` | owner | `useModeGuard('PRODUCTS')` (web/app/catalog/page.tsx:22) |
| `/appointments` | owner | `useModeGuard('SERVICES')` (web/app/appointments/page.tsx:51) |
| `/services` | owner | `useModeGuard('SERVICES')` (web/app/services/page.tsx:45). Not in the sidebar (see Oddities) |
| `/staff` | owner | Deliberately no mode guard, "available in all modes" (web/app/staff/page.tsx:13, Sidebar.tsx:35) |
| `/projects` | owner | `useModeGuard('FREELANCE')` (web/app/projects/page.tsx:76) |
| `/calendar` | owner | `useModeGuard(['PRODUCTS','FREELANCE'])` (web/app/calendar/page.tsx:59) |
| `/analytics` | owner | AuthLayout only |
| `/settings` | owner | AuthLayout only |
| `/profile` | owner | AuthLayout only; sign-out lives here (web/app/profile/page.tsx:25-28) |

### 1.2 Admin panel pages

Gate: `AdminLayout` calls `fetchAdminMe()` (`GET /admin/auth/me`) on mount; opens only on success, and a 401 redirects to `/admin/login` via the adminApi interceptor (web/components/admin/AdminLayout.tsx:31-47).

| Route | Access | Notes |
|---|---|---|
| `/admin/login` | public | Email plus password, sets the httpOnly session cookie |
| `/admin` | admin | Dashboard KPIs, funnel, attention lists |
| `/admin/search` | admin | Cross-tenant search |
| `/admin/businesses` | admin | Business list |
| `/admin/businesses/[id]` | admin | Detail plus plan/suspend/impersonate/erase and per-entity data manager |
| `/admin/audit` | admin | Audit log viewer |
| `/admin/users` | admin | Admin user list only (no create/edit UI) |
| `/admin/legal` | admin (SUPER_ADMIN) | Nav link gated by cached role (AdminLayout.tsx:57-62); server enforces `requireSuperAdmin` |
| `/admin/settings` | admin (SUPER_ADMIN) | Platform flags; nav gated by cached role; server enforces |

Note on the SUPER_ADMIN nav gate: `getAdminRole()` reads a module-level cache primed by login/`fetchAdminMe` (web/lib/adminApi.ts:18-22). It hides the link only. Any admin who navigates directly still hits the server, which returns 403 for a PATCH from a SUPPORT admin.

### 1.3 Public pages

| Route | Access | Notes |
|---|---|---|
| `/welcome` | public | Redirects to `/` if authenticated (web/app/welcome/page.tsx:17) |
| `/login` | public | Returning-owner Telegram-code login (`/auth/login/*`) |
| `/onboarding` | public | Signup wizard: bot-token verify, Telegram enrollment, consents, business create |
| `/offer` | public | Public offer legal text from `web/lib/legalConfig.ts`. Body is TODO placeholder (see Oddities) |
| `/privacy` | public | Privacy policy legal text from `web/lib/legalConfig.ts`. Body is TODO placeholder (see Oddities) |
| `/design` | public, dev only | `notFound()` when `NODE_ENV === 'production'` (web/app/design/page.tsx:94) |
| `/design-components` | public, dev only | `notFound()` when `NODE_ENV === 'production'` (web/app/design-components/page.tsx:36) |
| `/design-icons` | public, dev only | `notFound()` when `NODE_ENV === 'production'` (web/app/design-icons/page.tsx:43) |

Caveat on the public pages: because the root-layout `BusinessProvider` unconditionally calls `GET /business` on every hard load, a logged-out hard load can trigger the api.ts 401 interceptor and hard-redirect to `/welcome` (web/lib/businessContext.tsx:36-38; web/lib/api.ts:47-52). The interceptor skips `/auth/` paths but not `/business`. Runtime effect on `/offer` and `/privacy` for logged-out visitors is a code-level inference, not verified at runtime.

---

## 2. Auth models

### 2.1 Owner (JS-readable cookie plus Bearer)

The owner JWT lives in a **JS-readable cookie `crm_token`** set by `js-cookie` (30-day expiry, `sameSite: 'strict'`, NOT httpOnly, NOT localStorage; web/lib/auth.ts:3-13). It is attached as `Authorization: Bearer <token>` by the axios request interceptor (web/lib/api.ts:30-36). On a 401 from any non-`/auth/` path the interceptor clears the cookie and hard-redirects to `/welcome` (web/lib/api.ts:45-53). Expiry is also checked client-side by decoding the JWT `exp` claim, clearing the cookie when past due (web/lib/auth.ts:38-47). The route gate is the `AuthLayout` useEffect (web/components/AuthLayout.tsx:24-33). This is purely client-side; nothing is checked at SSR or in middleware.

### 2.2 Admin (httpOnly cookie plus CSRF header)

The admin session is an **httpOnly cookie `admin_session`** set and cleared by the backend on login/logout. JS never sees the token, so there is no js-cookie storage and no Bearer header for admin calls (web/lib/adminApi.ts:3-13). The dedicated adminApi axios instance sends the cookie with `withCredentials: true` and always attaches the static CSRF companion header `x-requested-with: dealio-admin`, which the backend requires on every mutating `/admin/*` request (web/lib/adminApi.ts:8-13). A 401 clears the cached role and redirects to `/admin/login`, except on the login page itself (web/lib/adminApi.ts:24-37). Role is cached in a module variable for UI-only gating; the server is authoritative (web/lib/adminApi.ts:15-22).

### 2.3 Impersonation cookie hand-off

The admin panel starts impersonation by writing the OWNER cookie directly. `impersonateBusiness()` returns a 15-minute owner JWT (web/lib/adminApi.ts:230-239), and the detail page does `Cookies.set('crm_token', data.token, { expires: 1/96, sameSite: 'strict' })` (1/96 day = 15 minutes), then opens `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'` in a new tab (web/app/admin/businesses/[id]/page.tsx:95-99). This hand-off works only because the admin panel and the owner app are the same Next.js deployment sharing one cookie origin; the admin-written `crm_token` is immediately readable by the owner app's `getToken()`. The minted token carries `isImpersonation: true` and is write-fenced server-side by `impersonationGuard`.

---

## 3. Page to backend endpoint map

Paths below are prefix-less as written in web code; the axios `baseURL` is `NEXT_PUBLIC_API_URL` (which already includes `/api/v1`). Line citations point at the wrapper function in `web/lib/api.ts` (owner) or `web/lib/adminApi.ts` (admin) unless noted.

`GET /business` also fires on every hard load via the root-layout `BusinessProvider` (web/lib/businessContext.tsx:25-38), independent of the pages below.

### 3.1 Owner pages

| Page | Endpoints |
|---|---|
| `/` | GET /home (:135), GET /analytics (:306) |
| `/login` | POST /auth/login/request (:105), POST /auth/login/verify (:109) |
| `/onboarding` | POST /onboarding/verify-bot-token (:64), POST /auth/enroll/start (:82), POST /auth/enroll/verify (:99), POST /onboarding/complete (:74) |
| `/catalog` | GET/POST /products, PATCH/DELETE /products/:id (:644-681). Toggle goes through `updateProduct`, not the `/toggle` endpoint (web/app/catalog/page.tsx:160) |
| `/orders` | GET /orders (:198), POST /orders (:259), POST /orders/:id/restore (:248), GET /products, GET/POST /customers |
| `/orders/[id]` | GET /orders/:id (:216), PATCH .../status (:236), PATCH .../payment (:240), DELETE (:244), GET .../payment-proof as blob (:224) |
| `/customers` | GET /customers (:145), POST /customers/:id/restore (:187) |
| `/customers/[id]` | GET /customers/:id (:162), PATCH .../notes (:179), DELETE (:183) |
| `/appointments` | GET /appointments (:273), POST /appointments (:703), PATCH /appointments/:id (:723), PATCH .../status (:294), DELETE (:298), POST .../restore (:302), GET/POST /services, GET /staff, GET/POST /customers, GET /availability (:727) |
| `/services` | GET/POST /services, PATCH/DELETE /services/:id (:587-620) |
| `/staff` | GET/POST /staff, PATCH/DELETE /staff/:id (:521-585), GET /services |
| `/projects` | GET/POST /projects (:404,:467), PATCH /projects/:id (:486), POST .../milestones (:501), PATCH .../milestones/:mId (:431), PATCH .../invoices/:iId/paid (:438), POST .../proposal-link (:446). Share link built as `${base}/api/v1/proposals/:id?t=<token>` (web/app/projects/page.tsx:243-245) |
| `/calendar` | GET /orders, GET /projects (web/app/calendar/page.tsx:11) |
| `/analytics` | GET /analytics; EmailCaptureCard fires PATCH /user/email-consent (:352), PATCH /user/dismiss-email-prompt (:361) |
| `/settings` | GET /business (:113), PATCH /business (:327), PATCH /business/bot-token (:337), PATCH /business/payment (:345), POST/DELETE /business/calendar-token (:365-372), GET/PATCH /business/reminder-settings (:387-397); WorkingHoursCard fires PATCH /business; BlockedTimeCard fires GET/POST/DELETE /blocked-slots plus GET /staff (web/components/scheduling/BlockedTimeCard.tsx:8-13) |
| `/profile` | No direct API call; reads context plus JWT claims |

### 3.2 Admin pages

| Page | Endpoints |
|---|---|
| `/admin/login` | POST /admin/auth/login (:49) |
| AdminLayout (all admin pages) | GET /admin/auth/me (:57), POST /admin/auth/logout (:64) |
| `/admin` | GET /admin/dashboard (:166) |
| `/admin/search` | GET /admin/search (:480) |
| `/admin/businesses` | GET /admin/businesses (:177) |
| `/admin/businesses/[id]` | GET /admin/businesses/:id (:194), PATCH .../plan (:203), POST .../suspend (:214), .../unsuspend (:224), .../impersonate (:234), .../erase (:435); BusinessDataManager fires tenant lists (:360-386), GET/PATCH/DELETE per-entity (:389-413), restore (:419), anonymize (:428) |
| `/admin/audit` | GET /admin/audit (:267) |
| `/admin/users` | GET /admin/users (:274). List only, no create/edit UI |
| `/admin/settings` | GET/PATCH /admin/platform-settings (:249,:257) |
| `/admin/legal` | GET /admin/legal-docs (:507), POST /admin/legal-docs/:docType/publish (:520). Computes sha256 of in-code legal text via Web Crypto and compares to published `contentHash` for drift detection (web/app/admin/legal/page.tsx:91-108) |

---

## 4. Oddities and gaps

1. **`/services` is missing from the sidebar.** The owner nav (web/components/Sidebar.tsx:27-42) has no Services entry. The page exists and is mode-gated to SERVICES, but is reachable only via a home quick-action (web/app/page.tsx:93) and a link inside Settings (web/app/settings/page.tsx:529).

2. **Self-serve account deletion has API functions but no UI.** `requestAccountDeletion` (web/lib/api.ts:121), `reactivateAccount` (:129), and `enrollStatus` (:86) are exported and have zero call sites in `web/`. The backend endpoints `POST /business/request-deletion` and `POST /business/reactivate` exist and work; the web app never invokes them. Other defined-but-unused exports: `updateProjectStatus` (:419), `createInvoice` (:509), `toggleProductActive` (:684).

3. **Legal page bodies are TODO placeholders, not real legal text.** `web/lib/legalConfig.ts` supplies `/privacy` and `/offer`. Every body paragraph is a placeholder (`[TODO: matn]` / `[TODO: текст]` / `[TODO: text]`) and every config value is a `[TODO: ...]` string (web/lib/legalConfig.ts:36-54, 76-195). A boot-time guard counts remaining `[TODO` markers and logs a warning but never throws (web/lib/legalConfig.ts:206-226). The file header states plainly that no paragraph is final wording.

4. **All access gating is client-side; there is no `middleware.ts`.** Both the owner gate (`AuthLayout` useEffect) and the admin gate (`AdminLayout` `fetchAdminMe`) run in the browser after the page ships. There is no SSR guard, no edge middleware, and no `route.ts`. Security therefore rests entirely on the backend rejecting unauthenticated or unauthorized requests; the web gates are UX redirects, not enforcement.

5. **Admin and owner apps are one deployment.** `/admin/*`, the owner dashboard, and the public pages are all routes in the same Next.js app. There is no separate admin build or host. The impersonation hand-off (section 2.3) depends on this shared cookie origin. `ADMIN_APP_URL` exists only as a backend CORS origin; it does not point at a distinct deployment.

6. **Hardcoded and derived URLs.** Legal citation URLs `https://dealio.uz/privacy` and `https://dealio.uz/offer` (web/lib/legalConfig.ts:43-44); impersonation target falls back to `http://localhost:3001` when `NEXT_PUBLIC_APP_URL` is unset (web/app/admin/businesses/[id]/page.tsx:98); ICS and proposal base URLs are derived by string-stripping `/api/v1` off `NEXT_PUBLIC_API_URL` (web/app/settings/page.tsx:74,115-116; web/app/projects/page.tsx:243-245). The only web env var actually configured is `NEXT_PUBLIC_API_URL`; `NEXT_PUBLIC_APP_URL` is referenced in code but absent from `.env.local`.

For related deep-dives see docs/internal/audits/DATA_COMPLIANCE_AUDIT.md, docs/internal/audits/REDIS_SESSION_AUDIT.md, docs/internal/audits/DELETION_AUDIT.md, docs/ADMIN_AUDIT.md, and docs/AUTHORIZATION_AUDIT.md.
