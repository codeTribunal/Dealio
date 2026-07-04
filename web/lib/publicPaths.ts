// Public routes of the OWNER app: pages a logged-out visitor must be able to see
// WITHOUT the owner getBusiness() fetch or the owner 401 -> /welcome redirect
// firing. Listed in ONE place so adding the next public route is a single-line
// change here, not three scattered edits across businessContext.tsx and api.ts.
//
//   "/"        marketing root (rewritten to /marketing by middleware.ts)
//   "/privacy" public privacy policy — the bot consent-gate link
//              (dealio.uz/privacy?lang=uz) and the URL cited in the pd.gov.uz filing
//   "/offer"   public offer
//
// Mirrors the isAdminUiContext() carve-out (lib/adminContext.ts): reads
// window.location.pathname so the SAME check is available to both the
// BusinessProvider fetch skip and the api.ts 401 interceptor skip. Matching is by
// exact pathname; query strings (e.g. ?lang=uz) are not part of pathname, so the
// localized bot links still match. SSR-safe — returns false when window is
// undefined.
export const PUBLIC_PATHS: readonly string[] = ['/', '/privacy', '/offer']

export function isPublicPath(): boolean {
  if (typeof window === 'undefined') return false
  return PUBLIC_PATHS.includes(window.location.pathname)
}
