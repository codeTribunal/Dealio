'use client'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import ActivityBadge from '@/components/ActivityBadge'
import { getAppointments, updateAppointmentStatus } from '@/lib/api'
import { formatUZS, formatDate, getInitials } from '@/lib/format'
import type { Appointment } from '@/types'

const STATUS_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Requested', value: 'REQUESTED' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const STATUS_BORDER: Record<string, string> = {
  REQUESTED: 'border-l-4 border-l-amber-400',
  CONFIRMED: 'border-l-4 border-l-green-500',
  COMPLETED: 'border-l-4 border-l-gray-400',
  CANCELLED: 'border-l-4 border-l-red-400',
  NO_SHOW: 'border-l-4 border-l-red-600',
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDurationMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getDayOfWeek(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' })
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0]
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  function fetchAppointments() {
    setLoading(true)
    setError(null)
    getAppointments({
      date: selectedDate,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: 50,
    })
      .then((data) => {
        setAppointments(Array.isArray(data.appointments) ? data.appointments : [])
      })
      .catch(() => setError('Failed to load appointments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAppointments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, statusFilter])

  async function handleStatusUpdate(appointmentId: string, newStatus: string) {
    await updateAppointmentStatus(appointmentId, newStatus)
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
    )
    setSelectedAppointment((prev) =>
      prev && prev.id === appointmentId ? { ...prev, status: newStatus } : prev
    )
  }

  return (
    <AuthLayout title="Appointments">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {isToday(selectedDate) ? 'Today' : formatDate(selectedDate + 'T00:00:00')}
            </p>
            <p className="text-sm text-gray-500">{getDayOfWeek(selectedDate)}</p>
          </div>

          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          {!isToday(selectedDate) && (
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
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
                  fetchAppointments()
                }}
              >
                Try again
              </button>
            </p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              {statusFilter !== 'ALL'
                ? `No ${statusFilter.toLowerCase()} appointments on this day`
                : 'No appointments on this day'}
            </p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <div
              key={appointment.id}
              onClick={() => setSelectedAppointment(appointment)}
              className={`bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all ${
                STATUS_BORDER[appointment.status] || ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {formatTime(appointment.startTime)} — {formatTime(appointment.endTime)}
                  </p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {appointment.service.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                      {getInitials(appointment.customer.name)}
                    </div>
                    <p className="text-sm text-gray-600">{appointment.customer.name}</p>
                  </div>
                  {appointment.staff && (
                    <p className="text-xs text-gray-400 mt-1">
                      with {appointment.staff.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <ActivityBadge status={appointment.status} type="appointment" />
                  <p className="text-sm font-semibold text-gray-900">
                    {formatUZS(appointment.price)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/30"
            onClick={() => setSelectedAppointment(null)}
          />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {selectedAppointment.service.name}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(selectedAppointment.startTime)} at{' '}
                  {formatTime(selectedAppointment.startTime)}
                </p>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex gap-2">
                <ActivityBadge status={selectedAppointment.status} type="appointment" />
                {selectedAppointment.paymentType === 'IN_ADVANCE' && (
                  <ActivityBadge
                    status={selectedAppointment.paymentStatus}
                    type="payment"
                  />
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Customer
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center">
                    {getInitials(selectedAppointment.customer.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedAppointment.customer.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedAppointment.customer.telegramUsername
                        ? `@${selectedAppointment.customer.telegramUsername}`
                        : selectedAppointment.customer.phone || '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Details
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedAppointment.service.name}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="text-sm font-medium text-gray-900">
                      {getDurationMinutes(
                        selectedAppointment.startTime,
                        selectedAppointment.endTime
                      )}{' '}
                      min
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatUZS(selectedAppointment.price)}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-600">Payment</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedAppointment.paymentType === 'AT_APPOINTMENT'
                        ? 'Pay at appointment'
                        : 'Pay in advance'}
                    </p>
                  </div>
                  {selectedAppointment.staff && (
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">Staff</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedAppointment.staff.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700">{selectedAppointment.notes}</p>
                </div>
              )}

              <div>
                <div className="space-y-3">
                  {selectedAppointment.status === 'REQUESTED' && (
                    <>
                      <button
                        onClick={() =>
                          handleStatusUpdate(selectedAppointment.id, 'CONFIRMED')
                        }
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-colors bg-green-600 text-white hover:bg-green-700"
                      >
                        Confirm appointment
                      </button>
                      <button
                        onClick={() =>
                          handleStatusUpdate(selectedAppointment.id, 'CANCELLED')
                        }
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-colors border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {selectedAppointment.status === 'CONFIRMED' && (
                    <>
                      <button
                        onClick={() =>
                          handleStatusUpdate(selectedAppointment.id, 'COMPLETED')
                        }
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Mark as completed
                      </button>
                      <button
                        onClick={() =>
                          handleStatusUpdate(selectedAppointment.id, 'NO_SHOW')
                        }
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-colors bg-orange-600 text-white hover:bg-orange-700"
                      >
                        Mark as no-show
                      </button>
                      <button
                        onClick={() =>
                          handleStatusUpdate(selectedAppointment.id, 'CANCELLED')
                        }
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-colors border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {(selectedAppointment.status === 'COMPLETED' ||
                    selectedAppointment.status === 'CANCELLED' ||
                    selectedAppointment.status === 'NO_SHOW') && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No actions available for this appointment
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
