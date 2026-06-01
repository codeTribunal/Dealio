'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import AuthLayout from '@/components/AuthLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/icons/Icon'
import { getCustomerDetail, updateCustomerNotes } from '@/lib/api'
import { formatUZS, formatDate, formatDateTime, formatRelativeTime } from '@/lib/format'
import type { CustomerDetail } from '@/types'

type Tab = 'orders' | 'appointments' | 'projects'

const TABS: Tab[] = ['orders', 'appointments', 'projects']

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('orders')

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
          </div>

          {/* RIGHT COLUMN — tabbed content */}
          <div className="flex-1 w-full min-w-0">
            {/* Segmented control */}
            <div className="inline-flex bg-surface-2 rounded-lg p-1 mb-6">
              {TABS.map((tab) => {
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors capitalize ${
                      isActive
                        ? 'bg-surface text-text-1 shadow-sm'
                        : 'text-text-2 hover:text-text-1'
                    }`}
                    style={{ transitionDuration: 'var(--dur-base)' }}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>

            {/* Orders tab */}
            {activeTab === 'orders' && (
              <>
                {customer.orders.length === 0 ? (
                  <div className="text-center py-12 text-sm text-text-2">No orders yet</div>
                ) : (
                  <div className="space-y-3">
                    {customer.orders.map((order) => (
                      <Card key={order.id}>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-bold text-text-1">
                            Order #{order.orderNumber}
                          </span>
                          <div className="flex gap-2">
                            <Badge status={order.paymentStatus} type="payment" />
                            <Badge status={order.orderStatus} type="order" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm py-1">
                              <p className="text-text-2">
                                {item.product.name} × {item.quantity}
                              </p>
                              <p className="text-text-1 font-medium tabular-nums">
                                {formatUZS(item.price * item.quantity)}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-border my-3" />
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-text-3">{formatDateTime(order.createdAt)}</p>
                          <p className="text-sm font-bold text-text-1 tabular-nums">
                            Total: {formatUZS(order.total)}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Appointments tab */}
            {activeTab === 'appointments' && (
              <>
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

            {/* Projects tab */}
            {activeTab === 'projects' && (
              <>
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
            )}
          </div>
        </div>
      ) : null}
    </AuthLayout>
  )
}
