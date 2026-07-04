import { NextResponse, type NextRequest } from 'next/server'
import { PUBLIC_PATHS } from './lib/publicPaths'
import { APP_HOST, isMarketingHost } from './lib/hosts'

// Hostname-based routing for the single deployment that serves three hosts:
//
//   • admin.dealio.uz — admin panel served at the ROOT (every request rewritten
//     to /admin/**). HIGHEST precedence, unchanged.
//   • dealio.uz / www.dealio.uz (apex "marketing" host) — serves ONLY the
//     coming-soon page ("/") and the public legal pages (/privacy, /offer). Every
//     other (dashboard) path 307-redirects to the same path on app.dealio.uz, so
//     the marketing host never exposes the dashboard.
//   • app.dealio.uz, localhost, *.vercel.app previews — the full dashboard app,
//     unchanged. "/" is the dashboard ROOT here (NOT rewritten to marketing).
//
// Host is read from x-forwarded-host (Vercel sets it to the real host behind its
// proxy), falling back to Host — first value, port stripped, lowercased. This is
// the same reliable source the admin block already used.
//
// The admin host is NEXT_PUBLIC_ADMIN_HOST (inlined at build; defaults to
// admin.dealio.uz). The client-side owner-provider guard (lib/adminContext.ts)
// reads the SAME value, so the server rewrite host and the client guard agree.
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

  // ── Dedicated admin host: serve the admin app at the ROOT (FIRST, unchanged) ─
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

  // ── Marketing (apex) host: dealio.uz / www.dealio.uz ────────────────────────
  // Serves ONLY the coming-soon page and the public legal pages; every dashboard
  // route is bounced to app.dealio.uz. Scoped to the apex, so app.dealio.uz and
  // localhost keep serving the dashboard at "/".
  if (isMarketingHost(host)) {
    // Never redirect framework/data/asset requests off-host. The matcher already
    // excludes _next/static, _next/image, favicon and dotted files; this is the
    // explicit belt-and-suspenders guard for _next/data and any /api route.
    if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
      return NextResponse.next()
    }
    // "/" → coming-soon page (rewrite; the browser URL stays dealio.uz/).
    if (pathname === '/') {
      const marketing = request.nextUrl.clone()
      marketing.pathname = '/marketing'
      return NextResponse.rewrite(marketing)
    }
    // Public legal pages render on the apex (bot consent link + pd.gov.uz filing).
    if (PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next()
    }
    // Any other path is a dashboard route: 307-redirect to the SAME path + query
    // on the app host. e.g. dealio.uz/welcome → app.dealio.uz/welcome.
    const target = request.nextUrl.clone()
    target.protocol = 'https:'
    target.hostname = APP_HOST
    target.port = ''
    return NextResponse.redirect(target, 307)
  }

  // ── App host / localhost / previews: dashboard app, unchanged ───────────────
  // "/" is the dashboard ROOT here (served by app/page.tsx via AuthLayout) and is
  // deliberately NOT rewritten to marketing.
  if (isPreviewHost(host)) {
    return NextResponse.next()
  }

  // ── Any other (owner / app) production host: the admin panel is invisible ───
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
