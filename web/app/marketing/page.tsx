// Public root placeholder for dealio.uz. The middleware rewrites "/" to this
// route (see web/middleware.ts), so visitors see it at the clean root URL with
// no redirect and no URL change.
//
// Intentionally STANDALONE: it does not use AuthLayout, so none of the owner
// dashboard chrome (sidebar / top nav) renders. Static server component, no
// client JS, no dependencies beyond React. Brand tokens only: paper background
// (--bg via bg-bg), ink text (--text-1 via text-text-1), Manrope (applied on
// <body> in app/tokens.css). Adapts to the light/dark theme cookie automatically
// through the token variables.
export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-bg text-text-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
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
