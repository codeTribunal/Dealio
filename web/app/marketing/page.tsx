// Public coming-soon page for the apex (dealio.uz). The middleware rewrites "/"
// to this route, so visitors see it at the clean root URL with no redirect and no
// URL change. The MarketingNav (top) and MarketingFooter (bottom) come from
// app/marketing/layout.tsx, which wraps this page and the marketing 404 — no
// dashboard chrome (AuthLayout) is involved. Brand tokens only: paper background
// and ink text (from the marketing layout), primary blue on the "." (text-accent),
// Manrope from <body>. No emojis.
export default function MarketingPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <h1
        className="tracking-tight"
        style={{ fontSize: 'var(--fs-h1)', fontWeight: 'var(--fw-extra)', lineHeight: 1.1 }}
      >
        Dealio<span className="text-accent">.</span>
      </h1>
      <p
        className="text-text-2"
        style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-medium)' }}
      >
        Coming soon
      </p>
    </main>
  )
}
