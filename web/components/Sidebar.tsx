'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/icons/Icon'
import { DealioMark } from '@/components/icons/DealioMark'
import { useBusiness } from '@/lib/businessContext'
import { useI18n } from '@/lib/i18n/i18nContext'

interface SidebarProps {
  onNavigate?: () => void
}

interface NavItem {
  icon: IconName
  label: string
  href: string
  modes?: string[]
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { business } = useBusiness()
  const { t } = useI18n()

  // Staff doesn't have a dedicated icon in the Phase B set — using the
  // people icon ('customers') as the closest semantic match.
  const navItems: NavItem[] = [
    { icon: 'home', label: t('nav.home'), href: '/' },
    { icon: 'customers', label: t('nav.customers'), href: '/customers' },
    // Mode-specific destinations — the filter below surfaces each only for the
    // matching business.mode.
    { icon: 'orders', label: t('nav.orders'), href: '/orders', modes: ['PRODUCTS'] },
    { icon: 'catalog', label: t('nav.catalog'), href: '/catalog', modes: ['PRODUCTS'] },
    { icon: 'calendar', label: t('nav.appointments'), href: '/appointments', modes: ['SERVICES'] },
    // Staff applies to every mode (Orders & Projects businesses have staff too) — no mode gate.
    { icon: 'staff', label: t('nav.staff'), href: '/staff' },
    { icon: 'projects', label: t('nav.projects'), href: '/projects', modes: ['FREELANCE'] },
    // Schedule list — orders-by-delivery (PRODUCTS) / deadlines (FREELANCE).
    { icon: 'calendar', label: t('nav.calendar'), href: '/calendar', modes: ['PRODUCTS', 'FREELANCE'] },
    { icon: 'analytics', label: t('nav.analytics'), href: '/analytics' },
    { icon: 'settings', label: t('nav.settings'), href: '/settings' },
  ]

  const visibleItems = navItems.filter((item) => {
    if (!item.modes) return true
    // Mode-specific items: show ONLY when the live business mode matches. While
    // business is still loading (or failed to load) we hide them rather than
    // flashing every mode's destinations — the nav only ever shows valid items.
    return business ? item.modes.includes(business.mode) : false
  })

  return (
    <div className="w-60 h-screen bg-surface border-r border-border flex flex-col flex-shrink-0">
      {/* Brand — Dealio mark on the surface (transparent), business name beside it */}
      <div className="p-5 flex items-center gap-3">
        <DealioMark size={36} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-1 truncate">
            {business ? business.name : t('common.loading')}
          </p>
          <p className="text-xs text-text-2 uppercase tracking-wider mt-0.5">CRM</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {visibleItems.map(({ icon, label, href }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent-soft text-accent font-semibold'
                  : 'text-text-2 hover:bg-surface-2 hover:text-text-1'
              }`}
              style={{ transitionDuration: 'var(--dur-base)' }}
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
