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
import { getOrderDetail, updateOrderStatus, confirmOrderPayment, deleteOrder, getPaymentProofUrl } from '@/lib/api'
import { formatUZS, formatDate, formatDateTime } from '@/lib/format'
import { useI18n } from '@/lib/i18n/i18nContext'
import { useToast } from '@/lib/toast'
import type { Order } from '@/types'

export default function OrderDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { t } = useI18n()
  const { showToast } = useToast()
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [showPayConfirm, setShowPayConfirm] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [proofSrc, setProofSrc] = useState<string | null>(null)
  const [proofError, setProofError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    getOrderDetail(id)
      .then((data) => setOrder(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load the payment-proof image through the authenticated proxy (as a blob, so
  // the Bearer token is sent). Revoke the object URL on cleanup / re-fetch.
  useEffect(() => {
    if (!order?.hasPaymentProof) return
    let objectUrl: string | null = null
    let cancelled = false
    setProofError(false)
    getPaymentProofUrl(order.id)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setProofSrc(url)
      })
      .catch(() => {
        if (!cancelled) setProofError(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [order?.id, order?.hasPaymentProof])

  async function handleStatusChange(newStatus: string) {
    if (!order || updatingStatus) return
    setUpdatingStatus(true)
    try {
      await updateOrderStatus(order.id, newStatus)
      setOrder({ ...order, orderStatus: newStatus })
    } catch {
      showToast(t('orders.statusUpdateFailed'), 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Money moment: only ever called from the confirm sheet, which restates the
  // amount and customer. A failed request must never strand the button — the
  // sheet stays open with an inline error so the owner can retry.
  async function handleConfirmPayment() {
    if (!order || confirmingPayment) return
    setConfirmingPayment(true)
    setPayError(null)
    try {
      await confirmOrderPayment(order.id)
      // The backend detaches the payment proof on confirmation (data
      // minimization), so clear hasPaymentProof too — this hides the proof
      // section immediately, matching what a reload would show.
      setOrder({ ...order, paymentStatus: 'CONFIRMED', hasPaymentProof: false })
      setShowPayConfirm(false)
      showToast(t('payment.confirmedToast', { amount: formatUZS(order.total) }), 'success')
    } catch {
      setPayError(t('payment.confirmFailed'))
    } finally {
      setConfirmingPayment(false)
    }
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
    <AuthLayout
      title={order ? t('orders.orderNumber', { n: order.orderNumber }) : t('orders.orderTitle')}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size={32} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-base font-semibold text-error-strong">{t('orders.loadFailed')}</p>
          <Button variant="primary" onClick={load}>
            {t('common.tryAgain')}
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
                {t('orders.orderNumber', { n: order.orderNumber })}
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
                <CardHeader title={t('customers.colCustomer')} />
                <Link
                  href={`/customers/${order.customer.id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar name={order.customer.name} size="md" />
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-text-1 truncate">{order.customer.name}</p>
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
                <CardHeader title={t('orders.detailsTitle')} />
                <div>
                  <div className="flex justify-between items-center py-2.5 border-b border-border">
                    <p className="text-base text-text-2">{t('delivery.method')}</p>
                    <p className="text-base font-medium text-text-1">
                      {order.deliveryMethod === 'PICKUP'
                        ? t('delivery.PICKUP')
                        : t('delivery.DELIVERY')}
                    </p>
                  </div>
                  {order.deliveryMethod === 'DELIVERY' && order.deliveryAddress !== null && (
                    <div className="flex justify-between items-start gap-3 py-2.5 border-b border-border">
                      <p className="text-base text-text-2 flex-shrink-0">{t('delivery.address')}</p>
                      <p className="text-base font-medium text-text-1 text-right">{order.deliveryAddress}</p>
                    </div>
                  )}
                  {order.deliveryDate !== null && (
                    <div className="flex justify-between items-center py-2.5 border-b border-border last:border-b-0">
                      <p className="text-base text-text-2">{t('orders.requestedDate')}</p>
                      <p className="text-base font-medium text-text-1">
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
                  <CardHeader title={t('orders.actionsTitle')} />

                  {order.paymentStatus === 'PAYMENT_RECEIVED' &&
                    (!showPayConfirm ? (
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => {
                          setPayError(null)
                          setShowPayConfirm(true)
                        }}
                        className="mb-3"
                      >
                        {t('payment.confirmCta')}
                      </Button>
                    ) : (
                      /* Confirm sheet — restates the exact amount and customer
                         before the irreversible confirm (PRODUCT.md: "earn
                         trust wherever money appears"). Same inline idiom as
                         the delete confirm below. */
                      <div className="mb-3 space-y-3">
                        <p className="text-base font-semibold text-text-1">
                          {t('payment.confirmTitle')}
                        </p>
                        <p className="text-base text-text-2">
                          {t('payment.confirmBody', {
                            amount: formatUZS(order.total),
                            name: order.customer.name,
                          })}
                        </p>
                        {payError && (
                          <p className="text-sm font-medium text-error-strong" role="alert">
                            {payError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            fullWidth
                            loading={confirmingPayment}
                            onClick={handleConfirmPayment}
                          >
                            {t('payment.confirmAction')}
                          </Button>
                          <Button
                            variant="secondary"
                            fullWidth
                            disabled={confirmingPayment}
                            onClick={() => {
                              setShowPayConfirm(false)
                              setPayError(null)
                            }}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ))}

                  {order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED' && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-2 mb-2">{t('orders.updateStatus')}</p>
                      <div className="flex flex-col gap-2">
                        {order.orderStatus === 'NEW' && (
                          <Button
                            variant="primary"
                            fullWidth
                            disabled={updatingStatus}
                            onClick={() => handleStatusChange('PREPARING')}
                          >
                            {t('orders.actionMarkPreparing')}
                          </Button>
                        )}
                        {order.orderStatus === 'PREPARING' && (
                          <Button
                            variant="primary"
                            fullWidth
                            disabled={updatingStatus}
                            onClick={() => handleStatusChange('READY')}
                          >
                            {t('orders.actionMarkReady')}
                          </Button>
                        )}
                        {order.orderStatus === 'READY' && (
                          <Button
                            variant="primary"
                            fullWidth
                            disabled={updatingStatus}
                            onClick={() => handleStatusChange('DELIVERED')}
                          >
                            {t('orders.actionMarkDelivered')}
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          fullWidth
                          disabled={updatingStatus}
                          onClick={() => handleStatusChange('CANCELLED')}
                        >
                          {t('orders.actionCancelOrder')}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Internal notes */}
              {order.internalNotes && (
                <Card>
                  <CardHeader title={t('orders.internalNotes')} />
                  <p className="text-base text-text-1 leading-relaxed whitespace-pre-line">
                    {order.internalNotes}
                  </p>
                </Card>
              )}

              {/* Customer notes */}
              {order.notes && (
                <Card>
                  <CardHeader title={t('orders.customerNotes')} />
                  <p className="text-base text-text-1 leading-relaxed whitespace-pre-line">
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
                    <p className="text-base font-semibold text-text-1">
                      {t('common.deleteOrderTitle')}
                    </p>
                    <p className="text-base text-text-2">{t('common.deleteOrderBody')}</p>
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
                  <p className="text-lg font-semibold text-text-1">{t('orders.itemsTitle')}</p>
                </div>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-base font-medium text-text-1 truncate">{item.product.name}</p>
                      {item.variant !== null && Object.keys(item.variant).length > 0 && (
                        <p className="text-xs text-text-2 mt-0.5">
                          {Object.entries(item.variant)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-text-3 mt-0.5">{t('orders.qty', { n: item.quantity })}</p>
                    </div>
                    <p className="text-base font-semibold text-text-1 tabular-nums flex-shrink-0">
                      {formatUZS(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
                <div className="flex justify-between items-center px-5 py-4 bg-surface-2">
                  <p className="text-base font-bold text-text-1">{t('common.total')}</p>
                  <p className="text-lg font-bold text-text-1 tabular-nums">{formatUZS(order.total)}</p>
                </div>
              </Card>

              {/* Payment proof — image via the authenticated proxy (blob). */}
              {order.hasPaymentProof && (
                <Card padded={false} className="overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <p className="text-lg font-semibold text-text-1">
                      {t('orders.paymentProof')}
                    </p>
                  </div>
                  <div className="p-5">
                    {proofError ? (
                      <p className="text-base text-text-2">
                        {t('orders.proofUnavailable')}
                      </p>
                    ) : proofSrc ? (
                      <a
                        href={proofSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proofSrc}
                          alt={t('orders.paymentProof')}
                          className="rounded-lg max-h-96 w-auto object-contain border border-border"
                        />
                      </a>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <Spinner />
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Timeline */}
              <Card padded={false} className="overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="text-lg font-semibold text-text-1">{t('orders.timelineTitle')}</p>
                </div>
                {order.timeline.length === 0 ? (
                  <p className="text-base text-text-2 px-5 py-4">{t('orders.timelineEmpty')}</p>
                ) : (
                  [...order.timeline].reverse().map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 px-5 py-3.5 border-b border-border last:border-b-0"
                    >
                      <span
                        className={`w-2 h-2 rounded-pill mt-2 flex-shrink-0 ${
                          entry.status === 'CANCELLED' ? 'bg-error' : 'bg-accent'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-base text-text-1">
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
