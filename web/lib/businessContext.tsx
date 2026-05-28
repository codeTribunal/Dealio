'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getBusiness } from '@/lib/api'
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
