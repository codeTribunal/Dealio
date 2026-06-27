'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getBusiness } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { useI18n } from '@/lib/i18n/i18nContext'
import type { Business } from '@/types'

interface BusinessContextValue {
  business: Business | null
  loading: boolean
  refetch: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextValue>({
  business: null,
  loading: true,
  refetch: async () => {},
})

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBusiness = useCallback(async () => {
    try {
      const data = await getBusiness()
      setBusiness(data)
    } catch {
      setBusiness(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBusiness()
  }, [fetchBusiness])

  return (
    <BusinessContext.Provider value={{ business, loading, refetch: fetchBusiness }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  return useContext(BusinessContext)
}

/**
 * Client-side route guard for mode-specific pages. Reads business.mode from the
 * SAME shared context as the sidebar, mirroring AuthLayout's auth-check: once
 * business has loaded, redirect to the default route ('/') if the mode doesn't
 * match the page's required mode AND surface a brief "not available in your
 * mode" toast (never a silent bounce). Returns false while loading or when
 * redirecting, so callers `return null` to avoid flashing the guarded page.
 */
export function useModeGuard(requiredMode: string | string[]): boolean {
  const { business, loading } = useBusiness()
  const router = useRouter()
  const { showToast } = useToast()
  const { t } = useI18n()
  // Accept a single mode or several — e.g. /calendar is valid in PRODUCTS AND
  // FREELANCE. allowedKey is a stable dep for the array case.
  const allowed = Array.isArray(requiredMode) ? requiredMode : [requiredMode]
  const allowedKey = allowed.join('|')
  const ok = !loading && !!business && allowed.includes(business.mode)
  useEffect(() => {
    if (!loading && !(business && allowed.includes(business.mode))) {
      showToast(t('common.notAvailableInMode'))
      router.replace('/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, business, allowedKey, router, showToast, t])
  return ok
}
