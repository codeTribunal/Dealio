'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'

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

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
        {/* TopBar with hamburger on mobile */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8 flex-shrink-0">
          <button
            className="lg:hidden mr-3 p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen
              ? <X size={20} className="text-gray-600" />
              : <Menu size={20} className="text-gray-600" />
            }
          </button>
          <span className="text-lg font-semibold text-gray-900 truncate flex-1">{title}</span>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0 ml-4">
            CRM
          </div>
        </div>
        <main className="overflow-y-auto flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
