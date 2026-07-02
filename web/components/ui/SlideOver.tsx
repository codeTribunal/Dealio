'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '@/components/icons/Icon'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface SlideOverProps {
  open: boolean
  onClose: () => void
  /** Panel title; also the dialog's accessible name. */
  title: string
  /** Localized aria-label for the close button (e.g. t('common.close')). */
  closeLabel: string
  /** Optional extra header content rendered left of the close button. */
  headerRight?: ReactNode
  /** Tailwind max-width class for the panel. */
  maxWidth?: string
  children: ReactNode
}

/**
 * The one right-hand slide-over for create/edit/detail tasks — replaces the
 * per-page hand-rolled copies so scrim, z-index, and dialog semantics can't
 * drift. Provides what the copies lacked: role="dialog" + aria-modal, Escape
 * to close, a focus trap, focus restore on close, and a body scroll lock.
 * Children render below the header; the caller owns scrolling and footers.
 */
export function SlideOver({
  open,
  onClose,
  title,
  closeLabel,
  headerRight,
  maxWidth = 'max-w-lg',
  children,
}: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  // Ref so the open-scoped effect never re-runs (and re-focuses) just because
  // the caller passed a new inline onClose on re-render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null)
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      restoreRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-text-1/30"
        onClick={() => onCloseRef.current()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative z-50 w-full ${maxWidth} bg-surface border-l border-border shadow-lg flex flex-col h-full focus:outline-none`}
      >
        <div className="flex items-center justify-between gap-3 p-6 border-b border-border flex-shrink-0">
          <p className="text-lg font-bold text-text-1 min-w-0 truncate">{title}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerRight}
            <button
              onClick={() => onCloseRef.current()}
              aria-label={closeLabel}
              className="w-9 h-9 flex items-center justify-center rounded-md text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors"
              style={{ transitionDuration: 'var(--dur-base)' }}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
