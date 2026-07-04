import { NextResponse, type NextRequest } from 'next/server'

// Hostname-based admin isolation.
//
//   • On the dedicated admin host (admin.dealio.uz) the admin panel is served at
//     the ROOT: every request is internally rewritten to /admin/**, so admins
//     never see /admin in the URL. Owner routes there resolve to /admin/<owner>
//     which has no page → Next 404 (the owner app is hidden on the admin host).
//   • On any other production host (app.dealio.uz, dealio.uz, www.dealio.uz, …)
//     /admin/** returns 404 — the admin panel is invisible.
//   • On localhost and Vercel previews (*.vercel.app) the split is NOT enforced:
//     the admin panel stays reachable by PATH (/admin/**) and the owner app at
//     '/', so both are testable on one preview URL.
//
// The admin host is NEXT_PUBLIC_ADMIN_HOST (inlined at build; defaults to
// admin.dealio.uz — the production host — so no env var is required unless it
// differs). The client-side owner-provider guard (lib/adminContext.ts) reads the
// SAME value, so the server-side rewrite host and the client guard always agree.
const ADMIN_HOST = (process.env.NEXT_PUBLIC_ADMIN_HOST || 'admin.dealio.uz').toLowerCase()

// Hosts where the admin panel stays reachable by /admin path for testing.
function isPreviewHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')
}

export function middleware(request: NextRequest) {
  // Public host as seen by the browser: prefer x-forwarded-host (Vercel sets it
  // to the real host behind its proxy), fall back to Host. Take the first
  // forwarded value and strip any :port.
  const rawHost =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const host = rawHost.split(',')[0].trim().split(':')[0].toLowerCase()

  const { pathname } = request.nextUrl
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')

  // ── Dedicated admin host: serve the admin app at the ROOT ──────────────────
  if (host === ADMIN_HOST) {
    // Canonicalize away any literal /admin (typed, or an internal AdminLayout
    // <Link href="/admin/...">) so there is ONE URL with no /admin prefix:
    // admin.dealio.uz/admin/login → admin.dealio.uz/login. Avoids /admin/admin.
    if (isAdminPath) {
      const canonical = request.nextUrl.clone()
      canonical.pathname = pathname.replace(/^\/admin/, '') || '/'
      return NextResponse.redirect(canonical)
    }
    // Internally prefix every request with /admin so '/', '/login', '/businesses'
    // resolve to the admin pages. Query string is preserved by cloning nextUrl.
    const rewritten = request.nextUrl.clone()
    rewritten.pathname = pathname === '/' ? '/admin' : `/admin${pathname}`
    return NextResponse.rewrite(rewritten)
  }

  // ── Marketing root: the ROOT path "/" shows the "coming soon" placeholder ──
  // On every NON-admin host (dealio.uz, app.dealio.uz, and localhost/previews for
  // testability), rewrite ONLY "/" to /marketing. Rewrite (not redirect): the URL
  // stays "/", the visitor never sees /marketing. The admin host returned above,
  // so admin.dealio.uz/ (which maps to /admin) is untouched. Every other path
  // (/login, /customers, /settings, /onboarding, /admin, /privacy, /offer, …)
  // falls through to the logic below completely unchanged.
  if (pathname === '/') {
    const marketing = request.nextUrl.clone()
    marketing.pathname = '/marketing'
    return NextResponse.rewrite(marketing)
  }

  // ── Preview / localhost: keep path-based access so both apps are testable ──
  if (isPreviewHost(host)) {
    return NextResponse.next()
  }

  // ── Any other (owner / marketing) host: the admin panel is invisible ───────
  if (isAdminPath) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  return NextResponse.next()
}

export const config = {
  // Run on every path EXCEPT Next internals and static assets (any path with a
  // dot, e.g. .png/.ico/.css/robots.txt). web/ has no /api routes.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
