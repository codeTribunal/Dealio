'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { getOrderDetail, updateOrderStatus, confirmOrderPayment, deleteOrder } from '@/lib/api'
import { formatUZS, formatDate, formatDateTime } from '@/lib/format'
import { useI18n } from '@/lib/i18n/i18nContext'
import type { Order } from '@/types'

export default function OrderDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { t } = useI18n()
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  async function handleDelete() {
    if (!order) return
    setDeleting(true)
    try {
      await deleteOrder(order.id)
      router.push('/orders')
    } catch {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <AuthLayout title={order ? `Order #${order.orderNumber}` : 'Order'}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size={32} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-base font-semibold text-error-strong">{error}</p>
          <Button variant="primary" onClick={load}>
            Try again
          </Button>
        </div>
      ) : order ? (
        <div className="space-y-6">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1
                className="text-text-1"
                style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-extra)', lineHeight: 1.1 }}
              >
                Order #{order.orderNumber}
              </h1>
              <p className="text-xs text-text-3 mt-1">{formatDateTime(order.createdAt)}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge status={order.paymentStatus} type="payment" />
              <Badge status={order.orderStatus} type="order" />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* LEFT COLUMN */}
            <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-4">
              {/* Customer */}
              <Card>
                <CardHeader title="Customer" />
                <Link
                  href={`/customers/${order.customer.id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar name={order.customer.name} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-1 truncate">{order.customer.name}</p>
                    <p className="text-xs text-text-2 truncate">
                      {order.customer.telegramUsername
                        ? `@${order.customer.telegramUsername}`
                        : order.customer.phone || '—'}
                    </p>
                  </div>
                </Link>
              </Card>

              {/* Details (delivery + dates) */}
              <Card>
                <CardHeader title="Details" />
                <div>
                  <div className="flex justify-between items-center py-2.5 border-b border-border">
                    <p className="text-sm text-text-2">Delivery</p>
                    <p className="text-sm font-medium text-text-1">
                      {order.deliveryMethod === 'PICKUP' ? 'Pickup' : 'Delivery'}
                    </p>
                  </div>
                  {order.deliveryMethod === 'DELIVERY' && order.deliveryAddress !== null && (
                    <div className="flex justify-between items-start gap-3 py-2.5 border-b border-border">
                      <p className="text-sm text-text-2 flex-shrink-0">Address</p>
                      <p className="text-sm font-medium text-text-1 text-right">{order.deliveryAddress}</p>
                    </div>
                  )}
                  {order.deliveryDate !== null && (
                    <div className="flex justify-between items-center py-2.5 border-b border-border last:border-b-0">
                      <p className="text-sm text-text-2">Requested date</p>
                      <p className="text-sm font-medium text-text-1">
                        {formatDate(order.deliveryDate)}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Actions */}
              {(order.paymentStatus === 'PAYMENT_RECEIVED' ||
                (order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED')) && (
                <Card>
                  <CardHeader title="Actions" />

                  {order.paymentStatus === 'PAYMENT_RECEIVED' && (
                    <Button
                      variant="primary"
                      fullWidth
                      loading={confirmingPayment}
                      onClick={handleConfirmPayment}
                      className="mb-3"
                    >
                      {confirmingPayment ? 'Confirming...' : 'Confirm payment'}
                    </Button>
                  )}

                  {order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED' && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-2 mb-2">Update status</p>
                      <div className="flex flex-col gap-2">
                        {order.orderStatus === 'NEW' && (
                          <Button
                            variant="primary"
                            fullWidth
                            disabled={updatingStatus}
                            onClick={() => handleStatusChange('PREPARING')}
                          >
                            Mark as Preparing
                          </Button>
                        )}
                        {order.orderStatus === 'PREPARING' && (
                          <Button
                            variant="primary"
                            fullWidth
                            disabled={updatingStatus}
                            onClick={() => handleStatusChange('READY')}
                          >
                            Mark as Ready
                          </Button>
                        )}
                        {order.orderStatus === 'READY' && (
                          <Button
                            variant="primary"
                            fullWidth
                            disabled={updatingStatus}
                            onClick={() => handleStatusChange('DELIVERED')}
                          >
                            Mark as Delivered
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          fullWidth
                          disabled={updatingStatus}
                          onClick={() => handleStatusChange('CANCELLED')}
                        >
                          Cancel order
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Internal notes */}
              {order.internalNotes && (
                <Card>
                  <CardHeader title="Internal notes" />
                  <p className="text-sm text-text-1 leading-relaxed whitespace-pre-line">
                    {order.internalNotes}
                  </p>
                </Card>
              )}

              {/* Customer notes */}
              {order.notes && (
                <Card>
                  <CardHeader title="Customer notes" />
                  <p className="text-sm text-text-1 leading-relaxed whitespace-pre-line">
                    {order.notes}
                  </p>
                </Card>
              )}

              {/* Delete (soft, recoverable) */}
              <Card>
                {!showDeleteConfirm ? (
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    {t('common.delete')}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-text-1">
                      {t('common.deleteOrderTitle')}
                    </p>
                    <p className="text-sm text-text-2">{t('common.deleteOrderBody')}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        fullWidth
                        loading={deleting}
                        onClick={handleDelete}
                      >
                        {t('common.yesDelete')}
                      </Button>
                      <Button
                        variant="secondary"
                        fullWidth
                        disabled={deleting}
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex-1 w-full min-w-0 space-y-4">
              {/* Line items */}
              <Card padded={false} className="overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-sm font-semibold text-text-1">Items</p>
                </div>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-1 truncate">{item.product.name}</p>
                      {item.variant !== null && Object.keys(item.variant).length > 0 && (
                        <p className="text-xs text-text-2 mt-0.5">
                          {Object.entries(item.variant)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-text-3 mt-0.5">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-text-1 tabular-nums flex-shrink-0">
                      {formatUZS(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
                <div className="flex justify-between items-center px-5 py-4 bg-surface-2">
                  <p className="text-sm font-bold text-text-1">Total</p>
                  <p className="text-lg font-bold text-text-1 tabular-nums">{formatUZS(order.total)}</p>
                </div>
              </Card>

              {/* Timeline */}
              <Card padded={false} className="overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-sm font-semibold text-text-1">Timeline</p>
                </div>
                {order.timeline.length === 0 ? (
                  <p className="text-sm text-text-2 px-5 py-4">No timeline events yet</p>
                ) : (
                  [...order.timeline].reverse().map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 px-5 py-3.5 border-b border-border last:border-b-0"
                    >
                      <span className="w-2 h-2 rounded-pill bg-accent mt-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-text-1">
                          {t(`status.${entry.status}`) || entry.status}
                        </p>
                        <p className="text-xs text-text-3 mt-0.5">{formatDateTime(entry.at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </AuthLayout>
  )
}
