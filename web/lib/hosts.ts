// Shared production-host classification for the single Vercel deployment that
// serves dealio.uz (marketing), app.dealio.uz (dashboard), and admin.dealio.uz
// (admin panel). Pure functions that take a host STRING, so the SAME logic runs
// in middleware (Edge — host from x-forwarded-host / host header) and on the
// client (host from window.location.hostname). The caller passes an already
// lowercased, port-stripped host, matching middleware's existing normalization.
//
// The admin host lives in lib/adminContext.ts (ADMIN_HOST / isAdminUiContext) and
// keeps highest precedence; it is intentionally not duplicated here.

// The dashboard host.
export const APP_HOST = 'app.dealio.uz'

// Single canonical origin for the dashboard app, used for all marketing → app
// links (nav/footer "Log in" / "Go to app"). Derived from APP_HOST so there is
// ONE source. Note: an existing NEXT_PUBLIC_APP_URL env var is used only by the
// admin panel and defaults to a dev localhost value, so it is deliberately NOT
// reused here for public marketing links.
export const APP_URL = `https://${APP_HOST}`

// The marketing (apex) hosts: only these serve the coming-soon page at "/" and
// keep /privacy + /offer public. www is handled the same as the bare apex.
// Everything else (app host, localhost, *.vercel.app previews) behaves as the
// dashboard app.
export const MARKETING_HOSTS: readonly string[] = ['dealio.uz', 'www.dealio.uz']

export function isMarketingHost(host: string): boolean {
  return MARKETING_HOSTS.includes(host.toLowerCase())
}
