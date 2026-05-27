'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { WifiOff, Clock } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import ActivityBadge from '@/components/ActivityBadge'
import { getCustomerDetail, updateCustomerNotes } from '@/lib/api'
import { formatUZS, formatDate, formatDateTime, formatRelativeTime, getInitials } from '@/lib/format'
import type { CustomerDetail } from '@/types'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [activeTab, setActiveTab] = useState<'orders' | 'appointments' | 'projects'>('orders')

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
    await new Promise(resolve => setTimeout(resolve, 500))
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
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-16">
          <WifiOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 mb-2">Could not load customer</p>
          <p className="text-sm text-gray-500 mb-6">Check your connection and try again</p>
          <button
            onClick={handleRetry}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      ) : customer ? (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* LEFT COLUMN */}
          <div className="w-full lg:w-80 lg:flex-shrink-0">
            {/* Identity card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-700 mx-auto mb-4">
                {getInitials(customer.name)}
              </div>
              <h1 className="text-xl font-bold text-gray-900 text-center mb-1">{customer.name}</h1>
              {customer.telegramUsername && (
                <p className="text-sm text-gray-500 text-center">@{customer.telegramUsername}</p>
              )}
              {customer.phone && (
                <p className="text-sm text-gray-500 text-center">{customer.phone}</p>
              )}
              <p className="text-xs text-gray-400 text-center mt-2">
                Customer since {formatDate(customer.createdAt)}
              </p>
            </div>

            {/* Stats card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <p className="text-sm text-gray-600">Total orders</p>
                <p className="text-sm font-semibold text-gray-900">{customer.totalOrders}</p>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <p className="text-sm text-gray-600">Total spent</p>
                <p className="text-sm font-semibold text-gray-900">{formatUZS(customer.totalSpent)}</p>
              </div>
              <div className="flex justify-between items-center py-3">
                <p className="text-sm text-gray-600">Last active</p>
                <p className="text-sm font-semibold text-gray-900">{formatRelativeTime(customer.lastInteractionAt)}</p>
              </div>
            </div>

            {/* Notes card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this customer..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="w-full mt-3 border-2 border-gray-300 bg-white text-gray-800 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {savingNotes ? 'Saving...' : 'Save notes'}
              </button>
            </div>

            {/* Custom fields card */}
            {customer.customFieldValues.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Custom fields</h3>
                {customer.customFieldValues.map((fieldValue) => (
                  <div
                    key={fieldValue.id}
                    className="flex justify-between items-center py-2 border-b border-gray-50 last:border-b-0"
                  >
                    <p className="text-sm text-gray-600">{fieldValue.field.name}</p>
                    <p className="text-sm font-medium text-gray-900">{fieldValue.value || '—'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tags card */}
            {customer.tags.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reminders card */}
            {customer.reminders.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Reminders</h3>
                {customer.reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-b-0"
                  >
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-900">{reminder.note}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Due {formatDate(reminder.dueDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1">
            {/* Tab navigation */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
              {(['orders', 'appointments', 'projects'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer capitalize ${
                    activeTab === tab
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Orders tab */}
            {activeTab === 'orders' && (
              <>
                {customer.orders.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-500">No orders yet</div>
                ) : (
                  customer.orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-5 mb-3">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-bold text-gray-900">Order #{order.orderNumber}</span>
                        <div className="flex gap-2">
                          <ActivityBadge status={order.paymentStatus} type="payment" />
                          <ActivityBadge status={order.orderStatus} type="order" />
                        </div>
                      </div>
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm py-1">
                          <p className="text-gray-700">
                            {item.product.name} × {item.quantity}
                          </p>
                          <p className="text-gray-900 font-medium">
                            {formatUZS(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                      <div className="border-t border-gray-100 my-3" />
                      <div className="flex justify-between">
                        <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
                        <p className="text-sm font-bold text-gray-900">Total: {formatUZS(order.total)}</p>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Appointments tab */}
            {activeTab === 'appointments' && (
              <>
                {customer.appointments.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-500">No appointments yet</div>
                ) : (
                  customer.appointments.map((appt) => (
                    <div key={appt.id} className="bg-white rounded-2xl border border-gray-200 p-5 mb-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-gray-900">{appt.service.name}</p>
                        <ActivityBadge status={appt.status} type="appointment" />
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-sm text-gray-600">{formatDateTime(appt.startTime)}</p>
                        <p className="text-sm text-gray-500">{formatUZS(appt.price)}</p>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Projects tab */}
            {activeTab === 'projects' && (
              <>
                {customer.projects.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-500">No projects yet</div>
                ) : (
                  customer.projects.map((project) => (
                    <div key={project.id} className="bg-white rounded-2xl border border-gray-200 p-5 mb-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-gray-900">{project.name}</p>
                        <ActivityBadge status={project.status} type="project" />
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-sm text-gray-600">{formatUZS(project.totalPrice)}</p>
                        {project.deadline && (
                          <p className="text-sm text-gray-500">Due {formatDate(project.deadline)}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </AuthLayout>
  )
}
