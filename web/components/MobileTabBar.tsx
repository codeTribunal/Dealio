'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/icons/Icon'
import { useBusiness } from '@/lib/businessContext'
import { useI18n } from '@/lib/i18n/i18nContext'

interface Tab {
  icon: IconName
  label: string
  href: string
}

/**
 * Floating, frosted-glass tab bar shown only on MOBILE widths (lg:hidden) —
 * desktop keeps the sidebar untouched. Four persistent top-level tabs with a
 * sliding accent selector. Tab 3 follows business.mode (Appointments for
 * SERVICES, Projects for FREELANCE). Glass + solid fallback live in the
 * `.mobile-tabbar` class (globals.css).
 */
export default function MobileTabBar() {
  const pathname = usePathname()
  const { business } = useBusiness()
  const { t } = useI18n()

  // Tab 3 follows business.mode 3-ways, mirroring the Flutter MainScaffold:
  // PRODUCTS → Orders, FREELANCE → Projects, SERVICES (default) → Appointments.
  const modeTab: Tab =
    business?.mode === 'FREELANCE'
      ? { icon: 'projects', label: t('nav.projects'), href: '/projects' }
      : business?.mode === 'PRODUCTS'
        ? { icon: 'orders', label: t('nav.orders'), href: '/orders' }
        : { icon: 'calendar', label: t('nav.appointments'), href: '/appointments' }

  const tabs: Tab[] = [
    { icon: 'home', label: t('nav.home'), href: '/' },
    { icon: 'customers', label: t('nav.customers'), href: '/customers' },
    modeTab,
    { icon: 'settings', label: t('nav.settings'), href: '/settings' },
  ]

  // Longest-prefix match so detail routes keep their parent tab active; Home
  // ('/') only matches exactly. Starts at -1 (no match) so a NON-tab page
  // (Catalog, Calendar, Staff, Services, …) highlights NO tab — never falling
  // back to Home/index 0.
  let activeIndex = -1
  let bestLen = -1
  tabs.forEach((tab, i) => {
    const match = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
    if (match && tab.href.length > bestLen) {
      bestLen = tab.href.length
      activeIndex = i
    }
  })

  return (
    // The floating inset is PADDING on this (non-interactive) nav so taps pass
    // through the side/bottom gaps to content. `pointer-events-auto` is on the
    // bar itself — so the ENTIRE visible bar is the interactive element (no
    // margin-based offset that left the lower half outside the hit area).
    <nav
      // z-30 keeps the bar above page content but BELOW slide-overs/modals
      // (z-40+), so dialog footers like "Create appointment" are never covered.
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 px-4 pointer-events-none"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mobile-tabbar pointer-events-auto relative rounded-3xl border border-border shadow-lg overflow-hidden">
        {/* Sliding selector — only rendered when a tab is active (hidden on
            non-tab pages, so nothing is highlighted). Never intercepts taps. */}
        {activeIndex >= 0 && (
          <div
            className="absolute top-1.5 bottom-1.5 rounded-2xl bg-accent-soft ease-out pointer-events-none"
            style={{
              left: `calc(${activeIndex} * 25% + 0.375rem)`,
              width: 'calc(25% - 0.75rem)',
              transitionProperty: 'left',
              transitionDuration: '280ms',
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        )}
        {/* Tabs — each a full-height (h-16 ≥ 44px) full-width slot */}
        <div className="relative grid grid-cols-4">
          {tabs.map((tab, i) => {
            const active = i === activeIndex
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 h-16 text-xs transition-colors ${
                  active ? 'text-accent font-semibold' : 'text-text-3 font-medium'
                }`}
                style={{ transitionDuration: 'var(--dur-base)' }}
              >
                <Icon name={tab.icon} size={20} />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
