'use client'
import { useState, useEffect } from 'react'
import { Users, Plus, X, Send, Pencil, CheckCircle, AlertCircle } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getStaff, createStaff, updateStaff, deleteStaff, getServices } from '@/lib/api'
import { getInitials, formatUZS, formatDate } from '@/lib/format'
import type { StaffMember, Service } from '@/types'

export default function StaffPage() {
  // Staff is available in all modes (no useModeGuard) — Orders & Projects
  // businesses have staff too. The page renders behind its own loading state.
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formName, setFormName] = useState('')
  const [formTelegramHandle, setFormTelegramHandle] = useState('')
  const [formServiceIds, setFormServiceIds] = useState<string[]>([])
  // Days off: list of 'YYYY-MM-DD' strings (whole-day offs for this staff member).
  const [formDaysOff, setFormDaysOff] = useState<string[]>([])
  const [dayOffInput, setDayOffInput] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function fetchData() {
    setLoading(true)
    setError(null)
    Promise.all([getStaff(), getServices()])
      .then(([staffData, servicesData]) => {
        setStaff(staffData)
        setServices(servicesData)
      })
      .catch(() => setError('Failed to load staff'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleNew = () => {
    setEditingStaff(null)
    setFormName('')
    setFormTelegramHandle('')
    setFormServiceIds([])
    setFormDaysOff([])
    setDayOffInput('')
    setFormError(null)
    setShowForm(true)
  }

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member)
    setFormName(member.name)
    setFormTelegramHandle(member.telegramHandle || '')
    setFormServiceIds(member.staffServices.map((ss) => ss.service.id))
    // Stored as DateTime[] (UTC midnight); normalize to 'YYYY-MM-DD' for editing.
    setFormDaysOff((member.daysOff || []).map((d) => d.slice(0, 10)).sort())
    setDayOffInput('')
    setFormError(null)
    setShowDeleteConfirm(false)
    setShowForm(true)
  }

  const addDayOff = () => {
    if (!dayOffInput) return
    setFormDaysOff((prev) =>
      prev.includes(dayOffInput) ? prev : [...prev, dayOffInput].sort()
    )
    setDayOffInput('')
  }

  const removeDayOff = (date: string) => {
    setFormDaysOff((prev) => prev.filter((d) => d !== date))
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingStaff(null)
    setFormError(null)
    setShowDeleteConfirm(false)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError('Name is required')
      return
    }
    if (formServiceIds.length === 0) {
      setFormError('Select at least one service')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: formName.trim(),
        telegramHandle: formTelegramHandle.trim() || undefined,
        serviceIds: formServiceIds,
        daysOff: formDaysOff,
      }
      if (editingStaff) {
        const updated = await updateStaff(editingStaff.id, payload)
        setStaff((prev) => prev.map((s) => (s.id === editingStaff.id ? updated : s)))
      } else {
        const created = await createStaff(payload)
        setStaff((prev) => [...prev, created])
      }
      handleClose()
    } catch {
      setFormError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingStaff) return
    setDeleting(true)
    try {
      await deleteStaff(editingStaff.id)
      setStaff((prev) => prev.filter((s) => s.id !== editingStaff.id))
      handleClose()
    } catch {
      setFormError('Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const toggleService = (serviceId: string) => {
    setFormServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  return (
    <AuthLayout title="Staff">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-1">Staff</h1>
          <p className="text-sm text-text-2 mt-1">
            {staff.length} team member{staff.length === 1 ? '' : 's'}
          </p>
        </div>
        {staff.length > 0 && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-on rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            <Plus size={16} />
            Add staff member
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-error-strong mb-3">{error}</p>
          <button
            onClick={() => { setError(null); fetchData() }}
            className="text-sm text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-text-3 mx-auto mb-4" />
          <p className="text-text-2 text-sm mb-2">No staff members yet</p>
          <p className="text-xs text-text-3 mb-6">
            Add your first team member to start assigning appointments
          </p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-on rounded-xl text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            <Plus size={16} />
            Add staff member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <div
              key={member.id}
              onClick={() => handleEdit(member)}
              className="bg-white rounded-2xl border border-border p-6 hover:border-border hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center text-accent text-lg font-bold flex-shrink-0">
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <p className="text-base font-bold text-text-1">{member.name}</p>
                    {member.telegramHandle ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Send size={12} className="text-accent" />
                        <p className="text-xs text-accent">@{member.telegramHandle}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-text-3 mt-0.5">No Telegram handle</p>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-2 transition-colors">
                  <Pencil size={14} className="text-text-3" />
                </div>
              </div>

              <p className="text-xs font-medium text-text-2 uppercase tracking-wider mb-2">
                Services
              </p>
              {member.staffServices.length === 0 ? (
                <p className="text-xs text-text-3">No services assigned</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {member.staffServices.map((ss) => (
                      <span
                        key={ss.service.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-surface-2 text-text-2 text-xs font-medium"
                      >
                        {ss.service.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-text-3 mt-2">
                    {member.staffServices.length} service{member.staffServices.length === 1 ? '' : 's'}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={handleClose} />
          <div className="relative z-50 w-full md:max-w-md bg-white shadow-2xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <p className="text-lg font-bold text-text-1">
                {editingStaff ? 'Edit staff member' : 'New staff member'}
              </p>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
              >
                <X size={20} className="text-text-2" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Full name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Aziz Karimov"
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              {/* Telegram handle */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Telegram handle
                </label>
                <p className="text-xs text-text-3 mb-1.5">
                  Optional — for sending schedule notifications
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm font-medium">
                    @
                  </span>
                  <input
                    type="text"
                    value={formTelegramHandle}
                    onChange={(e) => setFormTelegramHandle(e.target.value.replace('@', ''))}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-2.5 border border-border rounded-xl text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              </div>

              {/* Services */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Services performed *
                </label>
                <p className="text-xs text-text-3 mb-3">
                  Select at least one service this staff member can perform
                </p>
                {services.length === 0 ? (
                  <p className="text-sm text-text-3 py-4 text-center">
                    No services defined. Add services in Settings first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {services.map((service) => {
                      const selected = formServiceIds.includes(service.id)
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleService(service.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                            selected
                              ? 'border-accent bg-accent-soft'
                              : 'border-border bg-white hover:border-border'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-text-1">{service.name}</p>
                            <p className="text-xs text-text-2 mt-0.5">
                              {service.durationMinutes} min • {formatUZS(service.price)}
                            </p>
                          </div>
                          {selected ? (
                            <CheckCircle size={18} className="text-accent flex-shrink-0" />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full border-2 border-border flex-shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Days off */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Days off
                </label>
                <p className="text-xs text-text-3 mb-3">
                  Specific dates this staff member is unavailable
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dayOffInput}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDayOffInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addDayOff}
                    disabled={!dayOffInput}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-accent text-accent-on rounded-xl text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
                {formDaysOff.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formDaysOff.map((date) => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg bg-surface-2 text-text-2 text-xs font-medium"
                      >
                        {formatDate(date + 'T00:00:00')}
                        <button
                          type="button"
                          onClick={() => removeDayOff(date)}
                          aria-label={`Remove ${date}`}
                          className="text-text-3 hover:text-error-strong transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-error-soft border border-error-soft rounded-xl">
                  <AlertCircle size={16} className="text-error-strong flex-shrink-0" />
                  <p className="text-sm text-error-strong">{formError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex-shrink-0 space-y-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-accent text-accent-on rounded-xl text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : editingStaff ? 'Save changes' : 'Add staff member'}
              </button>

              {editingStaff && (
                <>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-3 border border-error-soft text-error-strong rounded-xl text-sm font-semibold hover:bg-error-soft transition-colors"
                    >
                      Remove staff member
                    </button>
                  ) : (
                    <div className="p-4 bg-error-soft border border-error-soft rounded-xl">
                      <p className="text-sm font-semibold text-error-strong mb-1">
                        Remove {editingStaff.name}?
                      </p>
                      <p className="text-xs text-error-strong mb-3">
                        This will unassign them from all future appointments.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex-1 py-2.5 border border-error-soft text-error-strong rounded-xl text-sm font-medium hover:bg-error-soft disabled:opacity-50 transition-colors"
                        >
                          {deleting ? 'Removing...' : 'Yes, remove'}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-2.5 border border-border text-text-2 rounded-xl text-sm font-medium hover:bg-surface-2 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
