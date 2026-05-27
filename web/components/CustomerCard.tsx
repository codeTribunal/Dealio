import Link from 'next/link'
import { formatUZS, formatRelativeTime, getInitials } from '@/lib/format'
import type { Customer } from '@/types'

interface CustomerCardProps {
  customer: Customer
}

export default function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <Link
      href={`/customers/${customer.id}`}
      className="block px-4 md:px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer last:border-b-0"
    >
      <div className="flex items-center justify-between md:grid md:grid-cols-12 md:gap-4 md:items-center">
        {/* Customer identity — always visible */}
        <div className="flex items-center gap-3 md:col-span-4 min-w-0">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
            {getInitials(customer.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{customer.name}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {customer.telegramUsername
                ? `@${customer.telegramUsername}`
                : customer.phone || '—'}
            </p>
          </div>
        </div>

        {/* Orders — hidden on mobile */}
        <div className="hidden md:block md:col-span-2">
          <p className="text-sm text-gray-900 font-medium">
            {!customer.totalOrders
              ? '—'
              : `${customer.totalOrders} order${customer.totalOrders === 1 ? '' : 's'}`}
          </p>
        </div>

        {/* Total spent — hidden on mobile */}
        <div className="hidden md:block md:col-span-3">
          <p className="text-sm text-gray-900 font-medium">
            {!customer.totalSpent ? '—' : formatUZS(customer.totalSpent)}
          </p>
        </div>

        {/* Last active — always visible, right aligned on mobile */}
        <div className="md:col-span-3 text-right md:text-left flex-shrink-0 ml-4 md:ml-0">
          <p className="text-sm text-gray-500">
            {formatRelativeTime(customer.lastInteractionAt)}
          </p>
        </div>
      </div>
    </Link>
  )
}
