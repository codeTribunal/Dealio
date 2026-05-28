'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Users,
  ShoppingBag,
  ShoppingCart,
  Calendar,
  UserCheck,
  Briefcase,
  BarChart2,
  Settings,
  LogOut,
} from 'lucide-react'
import { clearToken } from '@/lib/auth'
import { useBusiness } from '@/lib/businessContext'
import { useI18n } from '@/lib/i18n/i18nContext'

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { business } = useBusiness()
  const { t } = useI18n()

  const navItems = [
    { icon: Users, label: t('nav.customers'), href: '/customers' },
    { icon: ShoppingBag, label: t('nav.orders'), href: '/orders', modes: ['PRODUCTS'] },
    { icon: ShoppingCart, label: t('nav.catalog'), href: '/catalog', modes: ['PRODUCTS'] },
    { icon: Calendar, label: t('nav.appointments'), href: '/appointments', modes: ['SERVICES'] },
    { icon: UserCheck, label: t('nav.staff'), href: '/staff', modes: ['SERVICES'] },
    { icon: Briefcase, label: t('nav.projects'), href: '/projects', modes: ['FREELANCE'] },
    { icon: BarChart2, label: t('nav.analytics'), href: '/analytics' },
    { icon: Settings, label: t('nav.settings'), href: '/settings' },
  ]

  const visibleItems = navItems.filter(item => {
    if (!item.modes) return true
    if (!business) return true
    return item.modes.some(mode => business.mode.includes(mode))
  })

  function handleSignOut() {
    clearToken()
    router.replace('/login')
  }

  return (
    <div className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-6">
        <p className="text-sm font-bold text-gray-900">
          {business ? business.name : t('common.loading')}
        </p>
        <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">CRM</p>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {visibleItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          const activeClasses = 'bg-blue-50 text-blue-700 font-medium'
          const inactiveClasses = 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'

          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mx-0 text-sm transition-colors ${
                isActive ? activeClasses : inactiveClasses
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-gray-100 p-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut size={18} />
          <span>{t('common.signOut')}</span>
        </button>
      </div>
    </div>
  )
}
