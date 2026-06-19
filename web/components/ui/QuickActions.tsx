'use client'
import { Icon, type IconName } from '@/components/icons/Icon'

export interface QuickActionItem {
  icon: IconName
  label: string
  onClick?: () => void
}

interface QuickActionsProps {
  items: QuickActionItem[]
  className?: string
}

export function QuickActions({ items, className = '' }: QuickActionsProps) {
  return (
    <div className={`flex gap-3 ${className}`}>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={it.onClick}
          className="flex-1 bg-bg rounded-lg border border-border shadow-neu active:shadow-neu-inset transition-shadow flex flex-col items-center justify-center gap-2 py-4 px-3"
          style={{ transitionDuration: 'var(--dur-fast)', transitionTimingFunction: 'var(--ease)' }}
        >
          <Icon name={it.icon} size={24} className="text-accent" />
          <p className="text-xs font-semibold text-text-1 text-center">{it.label}</p>
        </button>
      ))}
    </div>
  )
}
