import type { MetadataRoute } from 'next'

// Serves /robots.txt (Next.js Metadata Route).
//
// This Next.js app is deployed ONLY on private, login-gated hosts:
//   app.dealio.uz   - owner dashboard
//   admin.dealio.uz - platform admin panel
// Neither must ever be indexed. There is NO public marketing site yet
// (dealio.uz / www.dealio.uz is reserved for a future one that does not exist).
//
// So the policy is: disallow ALL crawling.
//   User-agent: *
//   Disallow: /
//
// Next's robots.ts runs at build/render time and CANNOT read the request host,
// so we cannot branch app./admin. vs a future marketing host from here.
//
// WHEN THE MARKETING SITE LAUNCHES on dealio.uz, THIS MUST BE REVISITED so the
// marketing host allows indexing while app./admin. stay fully disallowed.
// Do that via one of:
//   - host-branching middleware that serves a different robots.txt per host, or
//   - (cleaner) move the marketing site to its own project/deployment with its
//     own robots.txt + sitemap.xml.
//
// The `Sitemap:` directive is intentionally OMITTED: everything here is
// disallowed, and the future marketing sitemap (dealio.uz/sitemap.xml) does not
// exist yet, so advertising it from this private host would only point crawlers
// at a 404. This host's own /sitemap.xml is an empty placeholder (app/sitemap.ts).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  }
}
