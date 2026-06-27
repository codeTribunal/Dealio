'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Building2,
  ScrollText,
  Users,
  LogOut,
  Shield,
  Menu,
  X,
  Search,
  Settings,
} from 'lucide-react'
import { isAdminAuthenticated, clearAdminToken, getAdminRole } from '@/lib/adminApi'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      router.replace('/admin/login')
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) return null

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Search, label: 'Search', href: '/admin/search' },
    { icon: Building2, label: 'Businesses', href: '/admin/businesses' },
    { icon: ScrollText, label: 'Audit log', href: '/admin/audit' },
    { icon: Users, label: 'Admin users', href: '/admin/users' },
    // Platform-wide flags (incl. the card-payments toggle) — Super Admin only.
    ...(getAdminRole() === 'SUPER_ADMIN'
      ? [{ icon: Settings, label: 'Settings', href: '/admin/settings' }]
      : []),
  ]

  const handleSignOut = () => {
    clearAdminToken()
    router.replace('/admin/login')
  }

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-white">Dealio</p>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={16} className="flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={16} className="flex-shrink-0" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — slides in on mobile, always visible on lg+ */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-56 bg-gray-900 border-r
          border-gray-800 flex flex-col transform transition-transform
          duration-200 ease-in-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 flex-shrink-0">
          <button
            className="lg:hidden mr-3 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X size={18} className="text-gray-400" />
            ) : (
              <Menu size={18} className="text-gray-400" />
            )}
          </button>
          <span className="text-sm font-semibold text-white flex-1 truncate">
            {title}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="hidden sm:block text-xs text-gray-500">
              Admin session
            </span>
          </div>
        </div>

        <main className="overflow-y-auto flex-1 p-4 lg:p-6 bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  )
}
