'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ShoppingBag } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import ActivityBadge from '@/components/ActivityBadge'
import { getOrders } from '@/lib/api'
import { formatUZS, getInitials } from '@/lib/format'
import type { Order } from '@/types'

const LIMIT = 30

const FILTER_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'New', value: 'NEW' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Awaiting payment', value: 'AWAITING_PAYMENT' },
]

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params =
      statusFilter === 'AWAITING_PAYMENT'
        ? { paymentStatus: 'PENDING', search: debouncedSearch, page, limit: LIMIT }
        : {
            status: statusFilter === 'ALL' ? undefined : statusFilter,
            search: debouncedSearch,
            page,
            limit: LIMIT,
          }
    getOrders(params)
      .then((data) => {
        setOrders(Array.isArray(data.orders) ? data.orders : [])
        setTotal(data.total)
      })
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [debouncedSearch, statusFilter, page])

  return (
    <AuthLayout title="Orders">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total orders</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by order # or customer name"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {FILTER_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              setStatusFilter(value)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === value
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-4">Items</div>
          <div className="col-span-2">Total</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Payment</div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="p-6">
            <p className="text-sm text-red-600">
              {error}
              <button
                className="text-sm text-blue-600 ml-2"
                onClick={() => {
                  setError(null)
                  setLoading(true)
                }}
              >
                Try again
              </button>
            </p>
          </div>
        ) : (orders ?? []).length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              {search
                ? 'No orders match your search'
                : statusFilter !== 'ALL'
                ? 'No orders with this status'
                : 'No orders yet'}
            </p>
          </div>
        ) : (
          (orders ?? []).map((order) => (
            <div key={order.id}>
              {/* Mobile card */}
              <Link
                href={`/orders/${order.id}`}
                className="md:hidden block px-4 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900">#{order.orderNumber}</span>
                  <ActivityBadge status={order.orderStatus} type="order" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">{order.customer.name}</p>
                  <p className="text-sm font-semibold text-gray-900">{formatUZS(order.total)}</p>
                </div>
              </Link>

              {/* Desktop row */}
              <Link
                href={`/orders/${order.id}`}
                className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center cursor-pointer last:border-b-0"
              >
                <div className="col-span-1">
                  <p className="text-sm font-bold text-gray-900">#{order.orderNumber}</p>
                </div>

                <div className="col-span-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                      {getInitials(order.customer.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.customer.telegramUsername
                          ? `@${order.customer.telegramUsername}`
                          : order.customer.phone || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-span-4">
                  <p className="text-sm text-gray-700">
                    {order.items.length === 0
                      ? '—'
                      : `${order.items[0].product.name} × ${order.items[0].quantity}${
                          order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''
                        }`}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm font-semibold text-gray-900">{formatUZS(order.total)}</p>
                </div>

                <div className="col-span-1">
                  <ActivityBadge status={order.orderStatus} type="order" />
                </div>

                <div className="col-span-1">
                  <ActivityBadge status={order.paymentStatus} type="payment" />
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      {total > LIMIT && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page * LIMIT >= total}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
