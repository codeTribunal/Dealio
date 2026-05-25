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
      className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center cursor-pointer last:border-b-0"
    >
      <div className="col-span-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
          {getInitials(customer.name)}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {customer.telegramUsername
              ? `@${customer.telegramUsername}`
              : customer.phone || '—'}
          </p>
        </div>
      </div>

      <div className="col-span-2">
        <p className="text-sm text-gray-900 font-medium">
          {!customer.totalOrders
            ? '—'
            : `${customer.totalOrders} order${customer.totalOrders === 1 ? '' : 's'}`}
        </p>
      </div>

      <div className="col-span-3">
        <p className="text-sm text-gray-900 font-medium">
          {!customer.totalSpent ? '—' : formatUZS(customer.totalSpent)}
        </p>
      </div>

      <div className="col-span-3">
        <p className="text-sm text-gray-500">
          {formatRelativeTime(customer.lastInteractionAt)}
        </p>
      </div>
    </Link>
  )
}
