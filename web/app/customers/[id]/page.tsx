'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AuthLayout from '@/components/AuthLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/icons/Icon'
import { getCustomerDetail, updateCustomerNotes, deleteCustomer } from '@/lib/api'
import { formatUZS, formatDate, formatDateTime, formatRelativeTime } from '@/lib/format'
import { useI18n } from '@/lib/i18n/i18nContext'
import { useBusiness } from '@/lib/businessContext'
import type { CustomerDetail } from '@/types'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useI18n()
  // Mode-relevant history only — read from the shared business source so it
  // tracks mode switches (PRODUCTS → Orders, SERVICES → Appointments,
  // FREELANCE → Projects).
  const { business } = useBusiness()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function fetchCustomer() {
    setLoading(true)
    setError(null)
    getCustomerDetail(id)
      .then((data) => {
        setCustomer(data)
        setNotes(data.notes || '')
      })
      .catch(() => setError('Could not load customer'))
      .finally(() => setLoading(false))
  }

  async function handleRetry() {
    setError(null)
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    fetchCustomer()
  }

  useEffect(() => {
    fetchCustomer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSaveNotes() {
    if (!customer) return
    setSavingNotes(true)
    await updateCustomerNotes(customer.id, notes)
    setSavingNotes(false)
  }

  async function handleDelete() {
    if (!customer) return
    setDeleting(true)
    try {
      await deleteCustomer(customer.id)
      router.push('/customers')
    } catch {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <AuthLayout title={customer?.name || 'Customer'}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size={32} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-base font-semibold text-error-strong">{error}</p>
          <Button variant="primary" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      ) : customer ? (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* LEFT COLUMN */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-4">
            {/* Identity */}
            <Card>
              <div className="flex justify-center mb-4">
                <Avatar name={customer.name} size="lg" />
              </div>
              <h1
                className="text-text-1 text-center"
                style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-extra)', lineHeight: 1.1 }}
              >
                {customer.name}
              </h1>
              {customer.telegramUsername && (
                <p className="text-sm text-text-2 text-center mt-1">@{customer.telegramUsername}</p>
              )}
              {customer.phone && (
                <p className="text-sm text-text-2 text-center mt-1">{customer.phone}</p>
              )}
              <p className="text-xs text-text-3 text-center mt-3">
                Customer since {formatDate(customer.createdAt)}
              </p>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader title="Overview" />
              <div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <p className="text-sm text-text-2">Total orders</p>
                  <p className="text-sm font-semibold text-text-1 tabular-nums">
                    {customer.totalOrders}
                  </p>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <p className="text-sm text-text-2">Total spent</p>
                  <p className="text-sm font-semibold text-text-1 tabular-nums">
                    {formatUZS(customer.totalSpent)}
                  </p>
                </div>
                <div className="flex justify-between items-center py-3">
                  <p className="text-sm text-text-2">Last active</p>
                  <p className="text-sm font-semibold text-text-1">
                    {formatRelativeTime(customer.lastInteractionAt)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader title="Notes" />
              <Textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this customer..."
              />
              <div className="mt-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? 'Saving...' : 'Save notes'}
                </Button>
              </div>
            </Card>

            {/* Custom fields */}
            {customer.customFieldValues.length > 0 && (
              <Card>
                <CardHeader title="Custom fields" />
                <div>
                  {customer.customFieldValues.map((fieldValue) => (
                    <div
                      key={fieldValue.id}
                      className="flex justify-between items-center py-2 border-b border-border last:border-b-0"
                    >
                      <p className="text-sm text-text-2">{fieldValue.field.name}</p>
                      <p className="text-sm font-medium text-text-1">
                        {fieldValue.value || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Tags — accent chips (not semantic Badge) */}
            {customer.tags.length > 0 && (
              <Card>
                <CardHeader title="Tags" />
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-pill text-xs font-semibold bg-accent-soft text-accent"
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Reminders */}
            {customer.reminders.length > 0 && (
              <Card>
                <CardHeader title="Reminders" />
                <div>
                  {customer.reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-start gap-3 py-2 border-b border-border last:border-b-0"
                    >
                      <span className="text-text-3 mt-0.5 flex-shrink-0">
                        <Icon name="bell" size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-text-1">{reminder.note}</p>
                        <p className="text-xs text-text-3 mt-0.5">
                          Due {formatDate(reminder.dueDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
                    {t('common.deleteCustomerTitle')}
                  </p>
                  <p className="text-sm text-text-2">{t('common.deleteCustomerBody')}</p>
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

          {/* RIGHT COLUMN — ONLY the current business mode's history (no tab
              switcher): PRODUCTS → Orders, FREELANCE → Projects, SERVICES (and
              the loading default) → Appointments. */}
          <div className="flex-1 w-full min-w-0">
            {business?.mode === 'PRODUCTS' ? (
              <>
                <h2 className="text-lg font-bold text-text-1 mb-4">
                  {t('nav.orders')}
                </h2>
                {customer.orders.length === 0 ? (
                  <div className="text-center py-12 text-sm text-text-2">
                    No orders yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customer.orders.map((order) => (
                      <Card key={order.id}>
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-bold text-text-1">
                            #{order.orderNumber}
                          </p>
                          <Badge status={order.orderStatus} type="order" />
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-sm text-text-2">
                            {formatDate(order.createdAt)}
                          </p>
                          <p className="text-sm text-text-1 font-medium tabular-nums">
                            {formatUZS(order.total)}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : business?.mode === 'FREELANCE' ? (
              <>
                <h2 className="text-lg font-bold text-text-1 mb-4">
                  {t('nav.projects')}
                </h2>
                {customer.projects.length === 0 ? (
                  <div className="text-center py-12 text-sm text-text-2">No projects yet</div>
                ) : (
                  <div className="space-y-3">
                    {customer.projects.map((project) => (
                      <Card key={project.id}>
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-bold text-text-1">{project.name}</p>
                          <Badge status={project.status} type="project" />
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-sm text-text-1 font-medium tabular-nums">
                            {formatUZS(project.totalPrice)}
                          </p>
                          {project.deadline && (
                            <p className="text-sm text-text-2">
                              Due {formatDate(project.deadline)}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-text-1 mb-4">
                  {t('nav.appointments')}
                </h2>
                {customer.appointments.length === 0 ? (
                  <div className="text-center py-12 text-sm text-text-2">
                    No appointments yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customer.appointments.map((appt) => (
                      <Card key={appt.id}>
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-bold text-text-1">{appt.service.name}</p>
                          <Badge status={appt.status} type="appointment" />
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-sm text-text-2">{formatDateTime(appt.startTime)}</p>
                          <p className="text-sm text-text-1 font-medium tabular-nums">
                            {formatUZS(appt.price)}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </AuthLayout>
  )
}
