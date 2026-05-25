'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface AuthLayoutProps {
  title: string
  children: React.ReactNode
}

export default function AuthLayout({ title, children }: AuthLayoutProps) {
  const router = useRouter()
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
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title={title} />
        <main className="overflow-y-auto flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
