import Link from 'next/link'
import { APP_URL } from '@/lib/hosts'

// Marketing-only footer. Rendered by app/marketing/layout.tsx alongside
// MarketingNav — never inside the dashboard. /privacy and /offer are internal
// (next/link, stay on the apex); "Go to app" points to the separate dashboard
// app on APP_URL (plain <a>). The copyright year is stamped at render time.
export default function MarketingFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="w-full border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="/"
            className="text-text-1 tracking-tight"
            style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-extra)' }}
          >
            Dealio<span className="text-accent">.</span>
          </Link>
          <p className="text-text-2" style={{ fontSize: 'var(--fs-sm)' }}>
            Business management for Uzbekistan.
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
          style={{ fontSize: 'var(--fs-sm)' }}
        >
          <Link href="/privacy" className="text-text-2 hover:text-text-1">
            Privacy
          </Link>
          <Link href="/offer" className="text-text-2 hover:text-text-1">
            Offer
          </Link>
          <a
            href={APP_URL}
            className="text-accent hover:text-accent-hover"
            style={{ fontWeight: 'var(--fw-semibold)' }}
          >
            Go to app
          </a>
        </nav>
      </div>
      <div className="mx-auto w-full max-w-5xl px-6 pb-8">
        <p className="text-text-3" style={{ fontSize: 'var(--fs-caption)' }}>
          {`© ${year} Dealio. All rights reserved.`}
        </p>
      </div>
    </footer>
  )
}
