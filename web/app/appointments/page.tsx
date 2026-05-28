'use client'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X, Plus } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import ActivityBadge from '@/components/ActivityBadge'
import {
  getAppointments,
  updateAppointmentStatus,
  createAppointment,
  createCustomer,
  createService,
  getServicesForForm,
  getStaffForForm,
  getCustomers,
} from '@/lib/api'
import { formatUZS, formatDate, formatTime, getInitials } from '@/lib/format'
import type { Appointment, Service, StaffMember, Customer } from '@/types'

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

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  // Create form state
  const [apptCustomerId, setApptCustomerId] = useState('')
  const [apptCustomerMode, setApptCustomerMode] =
    useState<'select' | 'manual'>('select')
  const [apptManualCustomerName, setApptManualCustomerName] = useState('')
  const [apptServiceId, setApptServiceId] = useState('')
  const [apptServiceMode, setApptServiceMode] =
    useState<'select' | 'manual'>('manual')
  const [apptManualServiceName, setApptManualServiceName] = useState('')
  const [apptManualDuration, setApptManualDuration] = useState('60')
  const [apptManualPrice, setApptManualPrice] = useState('')
  const [apptStaffId, setApptStaffId] = useState('')
  const [apptDate, setApptDate] = useState('')
  const [apptHour, setApptHour] = useState('09')
  const [apptMinute, setApptMinute] = useState('00')
  const [apptNotes, setApptNotes] = useState('')
  const [apptPaymentType, setApptPaymentType] =
    useState<'AT_APPOINTMENT' | 'IN_ADVANCE'>('AT_APPOINTMENT')
  const [apptSaving, setApptSaving] = useState(false)
  const [apptError, setApptError] = useState<string | null>(null)

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

  useEffect(() => {
    Promise.all([
      getServicesForForm(),
      getStaffForForm(),
      getCustomers({ limit: 100 }),
    ])
      .then(([servicesData, staffData, customersData]) => {
        setServices(servicesData)
        setStaff(staffData)
        setCustomers(customersData.customers)
      })
      .catch(() => {})
  }, [])

  function showSaved(message: string) {
    setSavedMessage(message)
    setTimeout(() => setSavedMessage(null), 3000)
  }

  async function handleStatusUpdate(appointmentId: string, newStatus: string) {
    await updateAppointmentStatus(appointmentId, newStatus)
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
    )
    setSelectedAppointment((prev) =>
      prev && prev.id === appointmentId ? { ...prev, status: newStatus } : prev
    )
  }

  const handleCreateAppointment = async () => {
    if (apptCustomerMode === 'select' && !apptCustomerId) {
      setApptError('Select a customer')
      return
    }
    if (apptCustomerMode === 'manual' && !apptManualCustomerName.trim()) {
      setApptError('Enter a customer name')
      return
    }
    if (apptServiceMode === 'select' && !apptServiceId) {
      setApptError('Select a service')
      return
    }
    if (apptServiceMode === 'manual' && !apptManualServiceName.trim()) {
      setApptError('Enter a service name')
      return
    }
    if (!apptDate) {
      setApptError('Select a date')
      return
    }
    setApptSaving(true)
    setApptError(null)
    try {
      let customerId = apptCustomerId
      if (apptCustomerMode === 'manual') {
        const newCustomer = await createCustomer({
          name: apptManualCustomerName.trim(),
        })
        customerId = newCustomer.id
      }

      let serviceId = apptServiceId
      let newService: Service | null = null
      if (apptServiceMode === 'manual') {
        newService = await createService({
          name: apptManualServiceName.trim(),
          durationMinutes: Number(apptManualDuration) || 60,
          price: Number(apptManualPrice) || 0,
          active: true,
        })
        serviceId = newService.id
      }

      const startTime = new Date(
        `${apptDate}T${apptHour}:${apptMinute}:00`
      ).toISOString()
      const created = await createAppointment({
        customerId,
        serviceId,
        staffId: apptStaffId || undefined,
        startTime,
        notes: apptNotes.trim() || undefined,
        paymentType: apptPaymentType,
      })
      setAppointments(prev => [...prev, created])
      if (newService) {
        const svc = newService
        setServices(prev => [...prev, svc])
      }
      setShowCreateForm(false)
      setApptCustomerId('')
      setApptManualCustomerName('')
      setApptCustomerMode('select')
      setApptServiceId('')
      setApptManualServiceName('')
      setApptManualPrice('')
      setApptManualDuration('60')
      setApptStaffId('')
      setApptDate('')
      setApptHour('09')
      setApptMinute('00')
      setApptNotes('')
      showSaved('Appointment created')
    } catch {
      setApptError('Failed to create appointment. Please try again.')
    } finally {
      setApptSaving(false)
    }
  }

  return (
    <AuthLayout title="Appointments">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
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

        <div className="flex flex-wrap items-center gap-2">
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
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New appointment
          </button>
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
          <div className="relative z-50 w-full md:max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
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

      {/* Create appointment panel */}
      {showCreateForm && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowCreateForm(false)}
          />
          <div className="relative z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <p className="text-lg font-bold text-gray-900">New appointment</p>
              <button onClick={() => setShowCreateForm(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Field 1 — Customer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer *
                </label>

                {/* Mode toggle */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setApptCustomerMode('select')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      apptCustomerMode === 'select'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Select existing
                  </button>
                  <button
                    onClick={() => setApptCustomerMode('manual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      apptCustomerMode === 'manual'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Enter manually
                  </button>
                </div>

                {apptCustomerMode === 'select' ? (
                  <select
                    value={apptCustomerId}
                    onChange={(e) => setApptCustomerId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={apptManualCustomerName}
                    onChange={(e) => setApptManualCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Field 2 — Service */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Service *
                </label>

                {/* Mode toggle — only show if there are existing services */}
                {services.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setApptServiceMode('manual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        apptServiceMode === 'manual'
                          ? 'bg-gray-900 text-white'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Enter manually
                    </button>
                    <button
                      onClick={() => setApptServiceMode('select')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        apptServiceMode === 'select'
                          ? 'bg-gray-900 text-white'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      From my services
                    </button>
                  </div>
                )}

                {apptServiceMode === 'select' && services.length > 0 ? (
                  <select
                    value={apptServiceId}
                    onChange={(e) => setApptServiceId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select a service</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.durationMinutes} min — {formatUZS(s.price)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={apptManualServiceName}
                      onChange={(e) => setApptManualServiceName(e.target.value)}
                      placeholder="Service name (e.g. Haircut, Consultation)"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          value={apptManualDuration}
                          onChange={(e) => setApptManualDuration(e.target.value)}
                          placeholder="Duration (min)"
                          min="1"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">Duration (minutes)</p>
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          value={apptManualPrice}
                          onChange={(e) => setApptManualPrice(e.target.value)}
                          placeholder="Price (UZS)"
                          min="0"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">Price (UZS)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Field 3 — Staff member */}
              {staff.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Staff member
                  </label>
                  <select
                    value={apptStaffId}
                    onChange={(e) => setApptStaffId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Any available</option>
                    {staff
                      .filter((member) => apptServiceId === '' ||
                        member.staffServices.some((ss) => ss.service.id === apptServiceId))
                      .map((member) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                  </select>
                </div>
              )}

              {/* Field 4 — Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Field 5 — Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Time *
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={apptHour}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(23, Number(e.target.value)))
                      setApptHour(v.toString().padStart(2, '0'))
                    }}
                    min="0"
                    max="23"
                    placeholder="HH"
                    className="w-20 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500 font-bold">:</span>
                  <input
                    type="number"
                    value={apptMinute}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(59, Number(e.target.value)))
                      setApptMinute(v.toString().padStart(2, '0'))
                    }}
                    min="0"
                    max="59"
                    placeholder="MM"
                    className="w-20 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-400">24h format</span>
                </div>
              </div>

              {/* Field 6 — Payment type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Payment
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setApptPaymentType('AT_APPOINTMENT')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      apptPaymentType === 'AT_APPOINTMENT'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Pay at appointment
                  </button>
                  <button
                    onClick={() => setApptPaymentType('IN_ADVANCE')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      apptPaymentType === 'IN_ADVANCE'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Pay in advance
                  </button>
                </div>
              </div>

              {/* Field 7 — Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  placeholder="Any notes about this appointment..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex-shrink-0 space-y-3">
              {apptError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{apptError}</p>
                </div>
              )}
              <button
                onClick={handleCreateAppointment}
                disabled={apptSaving}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {apptSaving ? 'Saving...' : 'Create appointment'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          {savedMessage}
        </div>
      )}
    </AuthLayout>
  )
}
