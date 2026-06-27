'use client'
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react'

interface ToastValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastValue>({ showToast: () => {} })

/**
 * App-level toast. Mounted once at the root layout so it survives client-side
 * navigations (e.g. the mode-guard's router.replace('/') redirect): the message
 * is shown just before the redirect and stays visible on the landing page.
 * Same visual as the per-page `savedMessage` toasts, at a higher z-index so it
 * sits above slide-overs/modals.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    setMessage(msg)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div className="fixed bottom-6 right-6 z-[100] bg-text-1 text-surface px-4 py-3 rounded-md text-sm font-medium shadow-md">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
