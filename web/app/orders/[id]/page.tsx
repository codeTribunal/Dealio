'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { WifiOff } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import ActivityBadge from '@/components/ActivityBadge'
import { getOrderDetail, updateOrderStatus, confirmOrderPayment } from '@/lib/api'
import { formatUZS, formatDate, formatDateTime, getInitials } from '@/lib/format'
import type { Order } from '@/types'

export default function OrderDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    getOrderDetail(id)
      .then((data) => setOrder(data))
      .catch(() => setError('Could not load order'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStatusChange(newStatus: string) {
    if (!order) return
    setUpdatingStatus(true)
    await updateOrderStatus(order.id, newStatus)
    setOrder({ ...order, orderStatus: newStatus })
    setUpdatingStatus(false)
  }

  async function handleConfirmPayment() {
    if (!order) return
    setConfirmingPayment(true)
    await confirmOrderPayment(order.id)
    setOrder({ ...order, paymentStatus: 'CONFIRMED' })
    setConfirmingPayment(false)
  }

  return (
    <AuthLayout title={order ? `Order #${order.orderNumber}` : 'Order'}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <WifiOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 mb-2">Could not load order</p>
          <p className="text-sm text-gray-500 mb-6">Check your connection and try again</p>
          <button
            onClick={load}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      ) : order ? (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* LEFT COLUMN */}
          <div className="w-full lg:w-80 lg:flex-shrink-0">
            {/* Card 1 — Order summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
                <p className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</p>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <p className="text-sm text-gray-600">Order status</p>
                <ActivityBadge status={order.orderStatus} type="order" />
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <p className="text-sm text-gray-600">Payment</p>
                <ActivityBadge status={order.paymentStatus} type="payment" />
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <p className="text-sm text-gray-600">Delivery</p>
                <p className="text-sm font-medium text-gray-900">
                  {order.deliveryMethod === 'PICKUP' ? 'Pickup' : 'Delivery'}
                </p>
              </div>
              {order.deliveryMethod === 'DELIVERY' && order.deliveryAddress !== null && (
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-sm font-medium text-gray-900">{order.deliveryAddress}</p>
                </div>
              )}
              {order.deliveryDate !== null && (
                <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                  <p className="text-sm text-gray-600">Requested date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(order.deliveryDate)}
                  </p>
                </div>
              )}
            </div>

            {/* Card 2 — Customer */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer</h3>
              <Link
                href={`/customers/${order.customer.id}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
                  {getInitials(order.customer.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{order.customer.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.customer.telegramUsername
                      ? `@${order.customer.telegramUsername}`
                      : order.customer.phone || '—'}
                  </p>
                </div>
              </Link>
            </div>

            {/* Card 3 — Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>

              {order.paymentStatus === 'PAYMENT_RECEIVED' && (
                <button
                  onClick={handleConfirmPayment}
                  disabled={confirmingPayment}
                  className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 mb-3"
                >
                  {confirmingPayment ? 'Confirming...' : 'Confirm payment'}
                </button>
              )}

              {order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED' && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Update status</p>
                  <div className="flex flex-col gap-2">
                    {order.orderStatus === 'NEW' && (
                      <button
                        onClick={() => handleStatusChange('PREPARING')}
                        disabled={updatingStatus}
                        className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                      >
                        Mark as Preparing
                      </button>
                    )}
                    {order.orderStatus === 'PREPARING' && (
                      <button
                        onClick={() => handleStatusChange('READY')}
                        disabled={updatingStatus}
                        className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                      >
                        Mark as Ready
                      </button>
                    )}
                    {order.orderStatus === 'READY' && (
                      <button
                        onClick={() => handleStatusChange('DELIVERED')}
                        disabled={updatingStatus}
                        className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                      >
                        Mark as Delivered
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange('CANCELLED')}
                      disabled={updatingStatus}
                      className="w-full border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                    >
                      Cancel order
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 4 — Internal notes */}
            {order.internalNotes && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Internal notes</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{order.internalNotes}</p>
              </div>
            )}

            {/* Card 5 — Customer notes */}
            {order.notes && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer notes</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{order.notes}</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1">
            {/* Line items card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Items</h3>
              </div>
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-6 py-4 border-b border-gray-100 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                    {item.variant !== null && Object.keys(item.variant).length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Object.entries(item.variant)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatUZS(item.price * item.quantity)}
                  </p>
                </div>
              ))}
              <div className="flex justify-between items-center px-6 py-4 bg-gray-50">
                <p className="text-sm font-semibold text-gray-900">Total</p>
                <p className="text-lg font-bold text-gray-900">{formatUZS(order.total)}</p>
              </div>
            </div>

            {/* Timeline card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Timeline</h3>
              </div>
              {order.timeline.length === 0 ? (
                <p className="text-sm text-gray-500 px-6 py-4">No timeline events yet</p>
              ) : (
                [...order.timeline].reverse().map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-900">{entry.status}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(entry.at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AuthLayout>
  )
}
