'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Users,
  ShoppingBag,
  Calendar,
  Briefcase,
  MessageSquare,
  BarChart2,
  Settings,
  LogOut,
} from 'lucide-react'
import { getBusiness } from '@/lib/api'
import { clearToken } from '@/lib/auth'
import type { Business } from '@/types'

const navItems = [
  { icon: Users, label: 'Customers', href: '/customers', disabled: false },
  { icon: ShoppingBag, label: 'Orders', href: '/orders', disabled: false },
  { icon: Calendar, label: 'Appointments', href: '/appointments', disabled: false },
  { icon: Briefcase, label: 'Projects', href: '/projects', disabled: false },
  { icon: MessageSquare, label: 'Inbox', href: '/inbox', disabled: true },
  { icon: BarChart2, label: 'Analytics', href: '/analytics', disabled: false },
  { icon: Settings, label: 'Settings', href: '/settings', disabled: false },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [business, setBusiness] = useState<Business | null>(null)

  useEffect(() => {
    getBusiness()
      .then(setBusiness)
      .catch(() => {})
  }, [])

  function handleSignOut() {
    clearToken()
    router.replace('/login')
  }

  return (
    <div className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-6">
        <p className="text-sm font-bold text-gray-900">
          {business ? business.name : 'Loading...'}
        </p>
        <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">CRM</p>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(({ icon: Icon, label, href, disabled }) => {
          const isActive = !disabled && pathname.startsWith(href)
          const activeClasses = 'bg-blue-50 text-blue-700 font-medium'
          const inactiveClasses = 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'

          return (
            <Link
              key={href}
              href={href}
              onClick={disabled ? (e) => e.preventDefault() : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mx-0 text-sm transition-colors ${
                isActive ? activeClasses : inactiveClasses
              } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )
}
