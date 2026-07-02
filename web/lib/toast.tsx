'use client'
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react'

type ToastVariant = 'default' | 'success' | 'error'

interface ToastValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastValue>({ showToast: () => {} })

/**
 * App-level toast. Mounted once at the root layout so it survives client-side
 * navigations (e.g. the mode-guard's router.replace('/') redirect): the message
 * is shown just before the redirect and stays visible on the landing page.
 * Same visual as the per-page `savedMessage` toasts, at a higher z-index so it
 * sits above slide-overs/modals.
 *
 * Variants carry state, not decoration: 'error' uses the error token so a
 * failure can never be mistaken for a save confirmation; 'success' keeps the
 * calm dark surface (money moments get their confirmation in-flow, the toast
 * is just the receipt).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, variant: ToastVariant = 'default') => {
    setToast({ message, variant })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-md text-sm font-medium shadow-md ${
            toast.variant === 'error'
              ? 'bg-error-strong text-white'
              : 'bg-text-1 text-surface'
          }`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
