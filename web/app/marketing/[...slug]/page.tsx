import { notFound } from 'next/navigation'

// Catch-all under /marketing. The apex middleware rewrites every non-public,
// non-"/" path to /marketing/<path>, which lands here and calls notFound() —
// rendering app/marketing/not-found.tsx with HTTP 404, wrapped by the marketing
// layout's nav/footer. Because the rewrite targets the /marketing segment, the
// real dashboard page component for the original path (e.g. /customers) is never
// rendered on the apex. This route is only ever reached via that rewrite.
export default function MarketingCatchAll(): never {
  notFound()
}
