import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
}

export function Card({ padded = true, className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl shadow-sm ${padded ? 'p-5' : ''} ${className}`}
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
      <p className="text-sm font-semibold text-text-1">{title}</p>
      {right}
    </div>
  )
}
