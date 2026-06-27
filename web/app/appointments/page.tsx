'use client'
import { useState, useEffect, useRef } from 'react'
import AuthLayout from '@/components/AuthLayout'
import { useModeGuard } from '@/lib/businessContext'
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
  deleteAppointment,
  restoreAppointment,
  createAppointment,
  updateAppointment,
  createCustomer,
  createService,
  getServicesForForm,
  getStaffForForm,
  getCustomers,
} from '@/lib/api'
import { formatUZS, formatDate, formatTime, currencyWord } from '@/lib/format'
import { useI18n } from '@/lib/i18n/i18nContext'
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
  const guardReady = useModeGuard('SERVICES')
  const { t } = useI18n()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [apptDeleteConfirm, setApptDeleteConfirm] = useState(false)
  const [deletingAppt, setDeletingAppt] = useState(false)

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
  // Edit/reschedule + overlap-override + inline notes state.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [conflictOpen, setConflictOpen] = useState(false)
  const pendingSubmit = useRef<{
    customerId: string
    serviceId: string
    newService: Service | null
  } | null>(null)
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  function fetchAppointments() {
    setLoading(true)
    setError(null)
    getAppointments({
      date: selectedDate,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: 50,
      includeDeleted: showDeleted,
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
  }, [selectedDate, statusFilter, showDeleted])

  async function handleRestoreAppointment(aid: string) {
    setRestoringId(aid)
    try {
      await restoreAppointment(aid)
      fetchAppointments()
    } finally {
      setRestoringId(null)
    }
  }

  async function handleDeleteAppointment() {
    if (!selectedAppointment) return
    setDeletingAppt(true)
    try {
      await deleteAppointment(selectedAppointment.id)
      setSelectedAppointment(null)
      setApptDeleteConfirm(false)
      fetchAppointments()
    } catch {
      setDeletingAppt(false)
    }
  }

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

  function resetFormFields() {
    setApptCustomerId('')
    setApptManualCustomerName('')
    setApptCustomerMode('select')
    setApptServiceId('')
    setApptServiceMode('manual')
    setApptManualServiceName('')
    setApptManualPrice('')
    setApptManualDuration('60')
    setApptStaffId('')
    setApptDate('')
    setApptHour('09')
    setApptMinute('00')
    setApptNotes('')
    setApptPaymentType('AT_APPOINTMENT')
    setApptError(null)
  }

  function closeForm() {
    setShowCreateForm(false)
    setEditingId(null)
    setConflictOpen(false)
    pendingSubmit.current = null
    resetFormFields()
  }

  function openCreate() {
    resetFormFields()
    setEditingId(null)
    setShowCreateForm(true)
  }

  // Prefill the shared slide-over from an existing appointment (edit mode).
  function openEdit(a: Appointment) {
    const d = new Date(a.startTime)
    const pad = (n: number) => String(n).padStart(2, '0')
    setEditingId(a.id)
    setApptCustomerMode('select')
    setApptCustomerId(a.customer.id)
    setApptServiceMode('select')
    setApptServiceId(a.service.id)
    setApptStaffId(a.staff?.id ?? '')
    setApptDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
    setApptHour(pad(d.getHours()))
    setApptMinute(pad(d.getMinutes()))
    setApptNotes(a.notes ?? '')
    setApptPaymentType(a.paymentType === 'IN_ADVANCE' ? 'IN_ADVANCE' : 'AT_APPOINTMENT')
    setApptError(null)
    setConflictOpen(false)
    setSelectedAppointment(null)
    setShowCreateForm(true)
  }

  function isAppointmentConflict(e: unknown): boolean {
    const err = e as { response?: { status?: number; data?: { error?: string } } }
    return (
      err?.response?.status === 409 &&
      err?.response?.data?.error === 'APPOINTMENT_CONFLICT'
    )
  }

  // Sends the resolved body (create or edit). On a 409 overlap it opens the
  // confirm modal; "Add anyway" re-runs this with allowConflict = true.
  async function sendAppointment(allowConflict: boolean) {
    const pending = pendingSubmit.current
    if (!pending) return
    const { customerId, serviceId, newService } = pending
    const startTime = new Date(`${apptDate}T${apptHour}:${apptMinute}:00`).toISOString()
    setApptSaving(true)
    setApptError(null)
    try {
      if (editingId) {
        const updated = await updateAppointment(editingId, {
          serviceId,
          startTime,
          staffId: apptStaffId || null,
          notes: apptNotes.trim(),
          paymentType: apptPaymentType,
          ...(allowConflict ? { allowConflict: true } : {}),
        })
        setAppointments((prev) => prev.map((a) => (a.id === editingId ? updated : a)))
      } else {
        const created = await createAppointment({
          customerId,
          serviceId,
          staffId: apptStaffId || undefined,
          startTime,
          notes: apptNotes.trim() || undefined,
          paymentType: apptPaymentType,
          ...(allowConflict ? { allowConflict: true } : {}),
        })
        setAppointments((prev) => [...prev, created])
      }
      if (newService) {
        const svc = newService
        setServices((prev) => [...prev, svc])
      }
      const wasEdit = !!editingId
      closeForm()
      showSaved(wasEdit ? 'Appointment updated' : 'Appointment created')
    } catch (e) {
      if (isAppointmentConflict(e)) {
        setConflictOpen(true)
        setApptSaving(false)
        return
      }
      setApptError('Failed to save appointment. Please try again.')
      setApptSaving(false)
    }
  }

  const handleSubmitAppointment = async () => {
    // Customer is only chosen on create — it's fixed in edit mode.
    if (!editingId && apptCustomerMode === 'select' && !apptCustomerId) {
      setApptError('Select a customer')
      return
    }
    if (!editingId && apptCustomerMode === 'manual' && !apptManualCustomerName.trim()) {
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
      if (!editingId && apptCustomerMode === 'manual') {
        const newCustomer = await createCustomer({ name: apptManualCustomerName.trim() })
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
      pendingSubmit.current = { customerId, serviceId, newService }
      await sendAppointment(false)
    } catch {
      setApptError('Failed to save appointment. Please try again.')
      setApptSaving(false)
    }
  }

  // Inline notes editing in the detail slide-over.
  async function handleSaveNotes() {
    if (!selectedAppointment) return
    setSavingNotes(true)
    try {
      const updated = await updateAppointment(selectedAppointment.id, {
        notes: notesDraft.trim(),
      })
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setSelectedAppointment(updated)
      setNotesEditing(false)
    } catch {
      // Leave the editor open so the owner can retry.
    } finally {
      setSavingNotes(false)
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

  if (!guardReady) return null

  return (
    <AuthLayout title="Appointments">
      {/* ── Header: date nav, actions, filters ───────────────────── */}
      <div className="mb-6 space-y-3">
        {/* Date navigator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="h-10 w-10 flex-shrink-0 rounded-md border border-border bg-surface text-text-1 hover:bg-surface-2 transition-colors flex items-center justify-center text-xl"
            aria-label="Previous day"
          >
            ‹
          </button>
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-text-1">
              {isToday(selectedDate) ? 'Today' : formatDate(selectedDate + 'T00:00:00')}
            </p>
            <p className="text-sm text-text-2">{getDayOfWeek(selectedDate)}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="h-10 w-10 flex-shrink-0 rounded-md border border-border bg-surface text-text-1 hover:bg-surface-2 transition-colors flex items-center justify-center text-xl"
            aria-label="Next day"
          >
            ›
          </button>
        </div>

        {/* Status filters — full width, horizontal scroll (never crowded) */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`flex-shrink-0 ${chip(statusFilter === value)}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!isToday(selectedDate) && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-shrink-0"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Today
            </Button>
          )}
          {/* Per-day rule: the small add button shows ONLY when this day has
              appointments. On an empty day the big center button (empty state)
              is the sole create affordance. appointments is the selected day's
              list, so paging between days flips which button appears. */}
          {!loading && !error && appointments.length > 0 && (
            <Button
              variant="primary"
              leftIcon="add"
              className="flex-1"
              onClick={openCreate}
            >
              New appointment
            </Button>
          )}
          <Button
            variant={showDeleted ? 'primary' : 'secondary'}
            size="sm"
            className="flex-shrink-0 whitespace-nowrap ml-auto"
            onClick={() => setShowDeleted((v) => !v)}
          >
            {t('common.showDeleted')}
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
            <div className="mt-5 flex justify-center">
              <Button variant="primary" leftIcon="add" onClick={openCreate}>
                Create appointment
              </Button>
            </div>
          </Card>
        ) : (
          appointments.map((appointment) =>
            appointment.deleted ? (
              <Card key={appointment.id} padded={false} className="p-5 opacity-70">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-1 tabular-nums">
                      {formatTime(appointment.startTime)} — {formatTime(appointment.endTime)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-base font-bold text-text-1 truncate">
                        {appointment.service.name}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-semibold bg-error-soft text-error-strong">
                        {t('common.deletedBadge')}
                      </span>
                    </div>
                    <p className="text-sm text-text-2 truncate mt-1">{appointment.customer.name}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={restoringId === appointment.id}
                    onClick={() => handleRestoreAppointment(appointment.id)}
                    className="flex-shrink-0"
                  >
                    {t('common.restore')}
                  </Button>
                </div>
              </Card>
            ) : (
            <Card
              key={appointment.id}
              padded={false}
              onClick={() => {
                setApptDeleteConfirm(false)
                setSelectedAppointment(appointment)
              }}
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

              {/* Notes — editable */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider">
                    Notes
                  </p>
                  {!notesEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setNotesDraft(selectedAppointment.notes ?? '')
                        setNotesEditing(true)
                      }}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      {t('common.edit')}
                    </button>
                  )}
                </div>
                {notesEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Any notes about this appointment..."
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={savingNotes}
                        onClick={handleSaveNotes}
                      >
                        {t('common.save')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={savingNotes}
                        onClick={() => setNotesEditing(false)}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-1">
                    {selectedAppointment.notes || (
                      <span className="text-text-3">—</span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {/* Edit / reschedule */}
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => openEdit(selectedAppointment)}
                >
                  {t('common.edit')}
                </Button>

                {/* Status — owner sets ANY status directly, anytime (incl.
                    correcting a terminal one). No forward-only state machine. */}
                <div>
                  <p className="text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
                    {t('common.statusLabel')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        'REQUESTED',
                        'CONFIRMED',
                        'COMPLETED',
                        'CANCELLED',
                        'NO_SHOW',
                      ] as const
                    ).map((s) => {
                      const active = selectedAppointment.status === s
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={active}
                          onClick={() =>
                            handleStatusUpdate(selectedAppointment.id, s)
                          }
                          className={`px-3 py-1.5 text-sm font-semibold rounded-pill border transition-colors ${
                            active
                              ? 'bg-accent-soft text-accent border-accent'
                              : 'bg-surface text-text-2 border-border hover:bg-surface-2'
                          }`}
                        >
                          {t(`status.${s}`)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Delete (soft, recoverable) */}
              <div className="pt-2 border-t border-border">
                {!apptDeleteConfirm ? (
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => setApptDeleteConfirm(true)}
                  >
                    {t('common.delete')}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-text-1">
                      {t('common.deleteAppointmentTitle')}
                    </p>
                    <p className="text-sm text-text-2">
                      {t('common.deleteAppointmentBody')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        fullWidth
                        loading={deletingAppt}
                        onClick={handleDeleteAppointment}
                      >
                        {t('common.yesDelete')}
                      </Button>
                      <Button
                        variant="secondary"
                        fullWidth
                        disabled={deletingAppt}
                        onClick={() => setApptDeleteConfirm(false)}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
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
            onClick={closeForm}
          />
          <div className="relative z-50 w-full max-w-lg bg-surface border-l border-border shadow-lg flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <p className="text-lg font-bold text-text-1">
                {editingId ? t('common.editAppointment') : 'New appointment'}
              </p>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close"
                className="text-text-3 hover:text-text-1 transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Customer — only on create; fixed (not editable) in edit mode */}
              {!editingId && (
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
              )}

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
                          placeholder={`Price (${currencyWord()})`}
                          min="0"
                          className="tabular-nums"
                        />
                        <p className="text-xs text-text-3 mt-1">Price ({currencyWord()})</p>
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
                {/* No min: owners may book in the PAST (history / walk-ins). */}
                <Input
                  type="date"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
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
                onClick={handleSubmitAppointment}
              >
                {apptSaving
                  ? 'Saving...'
                  : editingId
                    ? t('common.save')
                    : 'Create appointment'}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={closeForm}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overlap confirm — the soft guardrail the owner can override */}
      {conflictOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-text-1/40"
            onClick={() => setConflictOpen(false)}
          />
          <div className="relative z-[60] w-full max-w-sm bg-surface rounded-xl shadow-lg p-6 space-y-4">
            <p className="text-lg font-bold text-text-1">
              {t('common.appointmentConflictTitle')}
            </p>
            <p className="text-sm text-text-2">
              {t('common.appointmentConflictBody')}
            </p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                fullWidth
                loading={apptSaving}
                onClick={() => {
                  setConflictOpen(false)
                  sendAppointment(true)
                }}
              >
                {t('common.addAnyway')}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setConflictOpen(false)}
              >
                {t('common.cancel')}
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
