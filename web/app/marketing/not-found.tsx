import Link from 'next/link'

// Marketing 404 — rendered with HTTP 404 when notFound() is thrown inside the
// /marketing segment. The apex middleware rewrites dashboard/unknown paths into
// /marketing/*, where the catch-all route (app/marketing/[...slug]/page.tsx)
// calls notFound(). This boundary is SCOPED to /marketing, so it does not change
// the dashboard's own 404 on app.dealio.uz (which uses Next's default). It is
// wrapped by app/marketing/layout.tsx, so it renders with the marketing nav +
// footer. Standalone, paper bg / ink text, no dashboard chrome, no emojis.
export default function MarketingNotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <h1
        className="tracking-tight"
        style={{ fontSize: 'var(--fs-h1)', fontWeight: 'var(--fw-extra)', lineHeight: 1.1 }}
      >
        Dealio<span className="text-accent">.</span>
      </h1>
      <p className="text-text-2" style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-medium)' }}>
        Page not found
      </p>
      <Link
        href="/"
        className="text-accent hover:text-accent-hover"
        style={{ fontWeight: 'var(--fw-semibold)' }}
      >
        Back to home
      </Link>
    </main>
  )
}
