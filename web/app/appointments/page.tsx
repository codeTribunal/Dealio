'use client'
import { useState, useEffect } from 'react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/icons/Icon'
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
import { formatUZS, formatDate, formatTime } from '@/lib/format'
import type { Appointment, Service, StaffMember, Customer } from '@/types'

const STATUS_FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Requested', value: 'REQUESTED' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

// Semantic left-border accent for the row, mapped through tokens.
const STATUS_BORDER: Record<string, string> = {
  REQUESTED: 'border-l-4 border-l-warning',
  CONFIRMED: 'border-l-4 border-l-success',
  COMPLETED: 'border-l-4 border-l-border-strong',
  CANCELLED: 'border-l-4 border-l-error',
  NO_SHOW: 'border-l-4 border-l-error',
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

const SELECT_CLASS =
  'w-full bg-surface border border-border rounded-md py-2.5 px-3.5 text-sm text-text-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors'

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

  // Inline segmented-style chip, used for filters and mode toggles.
  const chip = (active: boolean, sm = false) =>
    `${sm ? 'px-3 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'} rounded-md font-semibold transition-colors ${
      active
        ? 'bg-accent-soft text-accent'
        : 'bg-surface border border-border text-text-2 hover:bg-surface-2'
    }`

  const segButton = (active: boolean) =>
    `px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
      active
        ? 'bg-accent text-accent-on'
        : 'border border-border bg-surface text-text-1 hover:bg-surface-2'
    }`

  return (
    <AuthLayout title="Appointments">
      {/* ── Header: date navigator + filters + new ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="h-10 w-10 rounded-md border border-border bg-surface text-text-1 hover:bg-surface-2 transition-colors flex items-center justify-center font-bold"
            aria-label="Previous day"
          >
            ‹
          </button>

          <div className="text-center min-w-[10rem]">
            <p className="text-lg font-bold text-text-1">
              {isToday(selectedDate) ? 'Today' : formatDate(selectedDate + 'T00:00:00')}
            </p>
            <p className="text-sm text-text-2">{getDayOfWeek(selectedDate)}</p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="h-10 w-10 rounded-md border border-border bg-surface text-text-1 hover:bg-surface-2 transition-colors flex items-center justify-center font-bold"
            aria-label="Next day"
          >
            ›
          </button>

          {!isToday(selectedDate) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={chip(statusFilter === value)}
            >
              {label}
            </button>
          ))}
          <Button
            variant="primary"
            leftIcon="add"
            onClick={() => setShowCreateForm(true)}
            className="ml-1"
          >
            New appointment
          </Button>
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <Card>
            <p className="text-sm text-error-strong">
              {error}
              <button
                className="ml-2 text-sm font-semibold text-accent hover:text-accent-hover"
                onClick={() => {
                  setError(null)
                  fetchAppointments()
                }}
              >
                Try again
              </button>
            </p>
          </Card>
        ) : appointments.length === 0 ? (
          <Card className="text-center py-12">
            <div className="mx-auto mb-4 w-16 h-16 rounded-lg bg-accent-soft flex items-center justify-center text-accent">
              <Icon name="calendar" size={28} />
            </div>
            <p className="text-sm text-text-2">
              {statusFilter !== 'ALL'
                ? `No ${statusFilter.toLowerCase()} appointments on this day`
                : 'No appointments on this day'}
            </p>
          </Card>
        ) : (
          appointments.map((appointment) => (
            <Card
              key={appointment.id}
              padded={false}
              onClick={() => setSelectedAppointment(appointment)}
              className={`p-5 cursor-pointer hover:border-border-strong hover:shadow-md transition-shadow ${
                STATUS_BORDER[appointment.status] || ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-1 tabular-nums">
                    {formatTime(appointment.startTime)} — {formatTime(appointment.endTime)}
                  </p>
                  <p className="text-base font-bold text-text-1 mt-1 truncate">
                    {appointment.service.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar name={appointment.customer.name} size="sm" />
                    <p className="text-sm text-text-2 truncate">
                      {appointment.customer.name}
                      {appointment.customer.telegramUsername && (
                        <span className="text-text-3">
                          {' '}
                          · @{appointment.customer.telegramUsername}
                        </span>
                      )}
                    </p>
                  </div>
                  {appointment.staff && (
                    <p className="text-xs text-text-3 mt-1">
                      with {appointment.staff.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Badge status={appointment.status} type="appointment" />
                  <p className="text-sm font-semibold text-text-1 tabular-nums">
                    {formatUZS(appointment.price)}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ── Detail slide-over ───────────────────────────────────── */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-text-1/30"
            onClick={() => setSelectedAppointment(null)}
          />
          <div className="relative z-50 w-full md:max-w-lg bg-surface border-l border-border shadow-lg flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="min-w-0 mr-3">
                <p className="text-lg font-bold text-text-1 truncate">
                  {selectedAppointment.service.name}
                </p>
                <p className="text-sm text-text-2 mt-1 tabular-nums">
                  {formatDate(selectedAppointment.startTime)} at{' '}
                  {formatTime(selectedAppointment.startTime)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                aria-label="Close"
                className="text-text-3 hover:text-text-1 transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge status={selectedAppointment.status} type="appointment" />
                {selectedAppointment.paymentType === 'IN_ADVANCE' && (
                  <Badge
                    status={selectedAppointment.paymentStatus}
                    type="payment"
                  />
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-3">
                  Customer
                </p>
                <div className="flex items-center gap-3">
                  <Avatar name={selectedAppointment.customer.name} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-1 truncate">
                      {selectedAppointment.customer.name}
                    </p>
                    <p className="text-xs text-text-2 truncate">
                      {selectedAppointment.customer.telegramUsername
                        ? `@${selectedAppointment.customer.telegramUsername}`
                        : selectedAppointment.customer.phone || '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-3">
                  Details
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm text-text-2">Service</p>
                    <p className="text-sm font-medium text-text-1">
                      {selectedAppointment.service.name}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-text-2">Duration</p>
                    <p className="text-sm font-medium text-text-1 tabular-nums">
                      {getDurationMinutes(
                        selectedAppointment.startTime,
                        selectedAppointment.endTime
                      )}{' '}
                      min
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-text-2">Price</p>
                    <p className="text-sm font-medium text-text-1 tabular-nums">
                      {formatUZS(selectedAppointment.price)}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-text-2">Payment</p>
                    <p className="text-sm font-medium text-text-1">
                      {selectedAppointment.paymentType === 'AT_APPOINTMENT'
                        ? 'Pay at appointment'
                        : 'Pay in advance'}
                    </p>
                  </div>
                  {selectedAppointment.staff && (
                    <div className="flex justify-between">
                      <p className="text-sm text-text-2">Staff</p>
                      <p className="text-sm font-medium text-text-1">
                        {selectedAppointment.staff.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-3">
                    Notes
                  </p>
                  <p className="text-sm text-text-1">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="space-y-3">
                {selectedAppointment.status === 'REQUESTED' && (
                  <>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() =>
                        handleStatusUpdate(selectedAppointment.id, 'CONFIRMED')
                      }
                    >
                      Confirm appointment
                    </Button>
                    <Button
                      variant="danger"
                      fullWidth
                      onClick={() =>
                        handleStatusUpdate(selectedAppointment.id, 'CANCELLED')
                      }
                    >
                      Cancel
                    </Button>
                  </>
                )}

                {selectedAppointment.status === 'CONFIRMED' && (
                  <>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() =>
                        handleStatusUpdate(selectedAppointment.id, 'COMPLETED')
                      }
                    >
                      Mark as completed
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() =>
                        handleStatusUpdate(selectedAppointment.id, 'NO_SHOW')
                      }
                    >
                      Mark as no-show
                    </Button>
                    <Button
                      variant="danger"
                      fullWidth
                      onClick={() =>
                        handleStatusUpdate(selectedAppointment.id, 'CANCELLED')
                      }
                    >
                      Cancel
                    </Button>
                  </>
                )}

                {(selectedAppointment.status === 'COMPLETED' ||
                  selectedAppointment.status === 'CANCELLED' ||
                  selectedAppointment.status === 'NO_SHOW') && (
                  <p className="text-sm text-text-3 text-center py-4">
                    No actions available for this appointment
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create appointment slide-over ───────────────────────── */}
      {showCreateForm && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-text-1/30"
            onClick={() => setShowCreateForm(false)}
          />
          <div className="relative z-50 w-full max-w-lg bg-surface border-l border-border shadow-lg flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <p className="text-lg font-bold text-text-1">New appointment</p>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                aria-label="Close"
                className="text-text-3 hover:text-text-1 transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Customer *
                </label>

                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setApptCustomerMode('select')}
                    className={chip(apptCustomerMode === 'select', true)}
                  >
                    Select existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptCustomerMode('manual')}
                    className={chip(apptCustomerMode === 'manual', true)}
                  >
                    Enter manually
                  </button>
                </div>

                {apptCustomerMode === 'select' ? (
                  <select
                    value={apptCustomerId}
                    onChange={(e) => setApptCustomerId(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">Select a customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={apptManualCustomerName}
                    onChange={(e) => setApptManualCustomerName(e.target.value)}
                    placeholder="Customer name"
                  />
                )}
              </div>

              {/* Service */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Service *
                </label>

                {services.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setApptServiceMode('manual')}
                      className={chip(apptServiceMode === 'manual', true)}
                    >
                      Enter manually
                    </button>
                    <button
                      type="button"
                      onClick={() => setApptServiceMode('select')}
                      className={chip(apptServiceMode === 'select', true)}
                    >
                      From my services
                    </button>
                  </div>
                )}

                {apptServiceMode === 'select' && services.length > 0 ? (
                  <select
                    value={apptServiceId}
                    onChange={(e) => setApptServiceId(e.target.value)}
                    className={SELECT_CLASS}
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
                    <Input
                      type="text"
                      value={apptManualServiceName}
                      onChange={(e) => setApptManualServiceName(e.target.value)}
                      placeholder="Service name (e.g. Haircut, Consultation)"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          value={apptManualDuration}
                          onChange={(e) => setApptManualDuration(e.target.value)}
                          placeholder="Duration (min)"
                          min="1"
                          className="tabular-nums"
                        />
                        <p className="text-xs text-text-3 mt-1">Duration (minutes)</p>
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          value={apptManualPrice}
                          onChange={(e) => setApptManualPrice(e.target.value)}
                          placeholder="Price (UZS)"
                          min="0"
                          className="tabular-nums"
                        />
                        <p className="text-xs text-text-3 mt-1">Price (UZS)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Staff member */}
              {staff.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-2 mb-1.5">
                    Staff member
                  </label>
                  <select
                    value={apptStaffId}
                    onChange={(e) => setApptStaffId(e.target.value)}
                    className={SELECT_CLASS}
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

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Date *
                </label>
                <Input
                  type="date"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Time — two-number HH:MM kept for locale safety */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Time *
                </label>
                <div className="flex gap-2 items-center">
                  <div className="w-20">
                    <Input
                      type="number"
                      value={apptHour}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(23, Number(e.target.value)))
                        setApptHour(v.toString().padStart(2, '0'))
                      }}
                      min="0"
                      max="23"
                      placeholder="HH"
                      className="text-center tabular-nums"
                    />
                  </div>
                  <span className="text-text-1 font-bold">:</span>
                  <div className="w-20">
                    <Input
                      type="number"
                      value={apptMinute}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(59, Number(e.target.value)))
                        setApptMinute(v.toString().padStart(2, '0'))
                      }}
                      min="0"
                      max="59"
                      placeholder="MM"
                      className="text-center tabular-nums"
                    />
                  </div>
                  <span className="text-xs text-text-3">24h format</span>
                </div>
              </div>

              {/* Payment type */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Payment
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApptPaymentType('AT_APPOINTMENT')}
                    className={segButton(apptPaymentType === 'AT_APPOINTMENT')}
                  >
                    Pay at appointment
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptPaymentType('IN_ADVANCE')}
                    className={segButton(apptPaymentType === 'IN_ADVANCE')}
                  >
                    Pay in advance
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Notes (optional)
                </label>
                <Textarea
                  rows={2}
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  placeholder="Any notes about this appointment..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex-shrink-0 space-y-3">
              {apptError && (
                <div className="p-3 bg-error-soft border border-error-strong rounded-md">
                  <p className="text-sm text-error-strong">{apptError}</p>
                </div>
              )}
              <Button
                variant="primary"
                fullWidth
                loading={apptSaving}
                onClick={handleCreateAppointment}
              >
                {apptSaving ? 'Saving...' : 'Create appointment'}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-text-1 text-surface px-4 py-3 rounded-md text-sm font-medium shadow-md z-50 flex items-center gap-2">
          <span className="text-success-soft">
            <Icon name="paid" size={16} />
          </span>
          {savedMessage}
        </div>
      )}
    </AuthLayout>
  )
}
