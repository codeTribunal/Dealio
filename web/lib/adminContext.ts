// Are we currently rendering the ADMIN panel UI (vs the owner app)?
//
// The admin panel reaches the browser two ways:
//   • under the /admin path — local dev & Vercel previews (path-based access)
//   • at the ROOT of the admin host (admin.dealio.uz) in production, where
//     middleware.ts REWRITES '/', '/login', '/businesses', … to '/admin/**'.
//     A rewrite is server-side, so the URL the browser (and window.location)
//     sees stays '/', '/login', … — a pure pathname check is NOT enough there.
//
// The owner BusinessProvider fetch and the owner 401->/welcome redirect must
// both stay OFF the admin panel in BOTH cases, so this is host-OR-path aware.
// SSR-safe: returns false when window is undefined. Reads the same build-time
// NEXT_PUBLIC_ADMIN_HOST (default admin.dealio.uz) as middleware.ts, so the
// server-side rewrite host and this client-side guard always agree.
export const ADMIN_HOST = (
  process.env.NEXT_PUBLIC_ADMIN_HOST || 'admin.dealio.uz'
).toLowerCase()

export function isAdminUiContext(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.location.pathname.startsWith('/admin') ||
    window.location.hostname.toLowerCase() === ADMIN_HOST
  )
}
