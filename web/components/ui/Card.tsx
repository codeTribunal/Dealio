import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
}

export function Card({
  padded = true,
  className = '',
  children,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ...rest
}: CardProps) {
  // A clickable card must be keyboard-operable: give it the button role, put
  // it in the tab order, and fire the click on Enter/Space. Explicit
  // role/tabIndex/onKeyDown props still win for custom cases.
  const interactive = onClick !== undefined
  const keyHandler =
    onKeyDown ??
    (interactive
      ? (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.currentTarget.click()
          }
        }
      : undefined)
  return (
    <div
      className={`bg-surface border border-border rounded-xl shadow-sm ${padded ? 'p-5' : ''} ${className}`}
      onClick={onClick}
      role={role ?? (interactive ? 'button' : undefined)}
      tabIndex={tabIndex ?? (interactive ? 0 : undefined)}
      onKeyDown={keyHandler}
      {...rest}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  right?: ReactNode
  className?: string
}

export function CardHeader({ title, right, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <p className="text-lg font-semibold text-text-1">{title}</p>
      {right}
    </div>
  )
}
