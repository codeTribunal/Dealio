import type { MetadataRoute } from 'next'

// Serves /sitemap.xml (Next.js Metadata Route) as an intentional EMPTY placeholder.
//
// Every route in this deployment is a private, login-gated owner/admin page, so
// none of them belong in a public sitemap (and robots.ts disallows crawling
// entirely). Returning an empty list emits a valid but empty <urlset>, exposing
// zero private routes while keeping the endpoint ready.
//
// WHEN THE MARKETING SITE LAUNCHES on dealio.uz, its indexable URLs should be
// listed by THAT site's own sitemap (likely a separate project/deployment), not
// added here - this host stays private. See app/robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return []
}
