'use client'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { formatUZS, formatRelativeTime } from '@/lib/format'
import { useI18n } from '@/lib/i18n/i18nContext'
import type { Customer } from '@/types'

interface CustomerCardProps {
  customer: Customer
}

export default function CustomerCard({ customer }: CustomerCardProps) {
  const { t } = useI18n()
  const handle = customer.telegramUsername
    ? `@${customer.telegramUsername}`
    : customer.phone || '—'

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors px-5 py-4"
      style={{ transitionDuration: 'var(--dur-base)' }}
    >
      {/* Mobile — compact row */}
      <div className="flex items-center gap-3 md:hidden">
        <Avatar name={customer.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-1 truncate">{customer.name}</p>
          <p className="text-xs text-text-2 truncate">{handle}</p>
        </div>
        <p className="text-xs text-text-2 flex-shrink-0">
          {formatRelativeTime(customer.lastInteractionAt, t)}
        </p>
      </div>

      {/* Desktop — 12-column grid */}
      <div className="hidden md:grid md:grid-cols-12 md:gap-4 md:items-center">
        <div className="col-span-5 flex items-center gap-3 min-w-0">
          <Avatar name={customer.name} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-1 truncate">{customer.name}</p>
            <p className="text-xs text-text-2 truncate">{handle}</p>
          </div>
        </div>

        <div className="col-span-2 text-sm text-text-1">
          {customer.totalOrders ? (
            t('customers.ordersCount', { count: customer.totalOrders })
          ) : (
            <span className="text-text-3">—</span>
          )}
        </div>

        <div className="col-span-3 text-sm font-semibold text-text-1 tabular-nums">
          {customer.totalSpent ? (
            formatUZS(customer.totalSpent)
          ) : (
            <span className="font-normal text-text-3">—</span>
          )}
        </div>

        <div className="col-span-2 text-sm text-text-2">
          {formatRelativeTime(customer.lastInteractionAt, t)}
        </div>
      </div>
    </Link>
  )
}
