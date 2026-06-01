'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { useBusiness } from '@/lib/businessContext'
import { useI18n, enumToCode, hasLocaleCookie } from '@/lib/i18n/i18nContext'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AuthLayout({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [checked, setChecked] = useState(false)
  const { business } = useBusiness()
  const { setLocale } = useI18n()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
    } else {
      setChecked(true)
    }
  }, [router])

  // Sync dashboard language to the business language on first load, unless the
  // user has already picked a language manually (cookie set).
  useEffect(() => {
    if (business && !hasLocaleCookie()) {
      setLocale(enumToCode(business.language))
    }
  }, [business, setLocale])

  if (!checked) return null

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, shown on desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-60 transform transition-transform
          duration-200 ease-in-out lg:relative lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar
          title={title}
          onMenuClick={() => setSidebarOpen((open) => !open)}
          menuOpen={sidebarOpen}
        />
        <main className="overflow-y-auto flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
