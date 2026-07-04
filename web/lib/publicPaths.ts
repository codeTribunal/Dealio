// Public routes of the OWNER app: pages a logged-out visitor must be able to see
// WITHOUT the owner getBusiness() fetch or the owner 401 -> /welcome redirect
// firing. The membership list lives in ONE place (PUBLIC_PATHS), reused by both
// the client carve-out (BusinessProvider fetch skip + api.ts 401 interceptor skip)
// and middleware.ts.
//
//   "/"        coming-soon page — but ONLY on the marketing (apex) host. On the
//              app host / localhost / previews, "/" is the dashboard ROOT and must
//              run owner auth normally (see the host guard in isPublicPath).
//   "/privacy" public privacy policy — bot consent-gate link
//              (dealio.uz/privacy?lang=uz) and the URL cited in the pd.gov.uz filing
//   "/offer"   public offer
//
// isPublicPath() reads window.location so the SAME check serves both client carve-
// out sites. Matching is by exact pathname; query strings (e.g. ?lang=uz) are not
// part of pathname, so localized bot links still match. SSR-safe — returns false
// when window is undefined.
import { isMarketingHost } from './hosts'

export const PUBLIC_PATHS: readonly string[] = ['/', '/privacy', '/offer']

export function isPublicPath(): boolean {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  if (!PUBLIC_PATHS.includes(path)) return false
  // "/" is public ONLY on the marketing (apex) host, where middleware rewrites it
  // to the coming-soon page. On the app host (and localhost/previews) "/" is the
  // dashboard root: treating it as public would make BusinessProvider skip
  // getBusiness() once on entry and leave `business` null for the whole SPA
  // session. /privacy and /offer stay public on every host.
  if (path === '/') return isMarketingHost(window.location.hostname)
  return true
}
