import MarketingNav from '@/components/marketing/MarketingNav'
import MarketingFooter from '@/components/marketing/MarketingFooter'

// Layout for the marketing surfaces — the coming-soon page (app/marketing/page.tsx)
// and the marketing 404 (app/marketing/not-found.tsx, reached via the catch-all).
// It nests inside the root layout (app/layout.tsx: providers + Manrope) and adds
// the marketing chrome. This is the ONLY place MarketingNav/Footer render; the
// dashboard (AuthLayout) is a separate tree and never gets this chrome. The legal
// pages (/privacy, /offer) live outside /marketing and are intentionally left
// with their own existing layout unchanged.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-1">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  )
}
