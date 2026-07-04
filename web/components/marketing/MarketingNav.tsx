import Link from 'next/link'
import { APP_URL } from '@/lib/hosts'

// Marketing-only top navigation. Rendered by app/marketing/layout.tsx (the
// coming-soon page and the marketing 404) — NEVER inside AuthLayout / the
// dashboard. The wordmark links to the apex home (internal, next/link); the
// "Log in" / "Go to app" links point to the SEPARATE dashboard app on APP_URL,
// so they are plain <a> tags (a full cross-app navigation), not next/link.
export default function MarketingNav() {
  return (
    <header className="w-full border-b border-border">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-text-1 tracking-tight"
          style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-extra)' }}
        >
          Dealio<span className="text-accent">.</span>
        </Link>
        <div className="flex items-center gap-5" style={{ fontSize: 'var(--fs-sm)' }}>
          <a
            href={APP_URL}
            className="text-text-2 hover:text-text-1"
            style={{ fontWeight: 'var(--fw-semibold)' }}
          >
            Log in
          </a>
          <a
            href={APP_URL}
            className="rounded-md bg-accent text-accent-on hover:bg-accent-hover"
            style={{ padding: 'var(--s-2) var(--s-4)', fontWeight: 'var(--fw-semibold)' }}
          >
            Go to app
          </a>
        </div>
      </nav>
    </header>
  )
}
