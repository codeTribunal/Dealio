'use client'
import { useState, useEffect } from 'react'
import { Users, Plus, X, Send, Pencil, CheckCircle, AlertCircle } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getStaff, createStaff, updateStaff, deleteStaff, getServices } from '@/lib/api'
import { getInitials, formatUZS } from '@/lib/format'
import type { StaffMember, Service } from '@/types'

export default function StaffPage() {
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
    setFormError(null)
    setShowForm(true)
  }

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member)
    setFormName(member.name)
    setFormTelegramHandle(member.telegramHandle || '')
    setFormServiceIds(member.staffServices.map((ss) => ss.service.id))
    setFormError(null)
    setShowDeleteConfirm(false)
    setShowForm(true)
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
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-1">
            {staff.length} team member{staff.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          Add staff member
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            onClick={() => { setError(null); fetchData() }}
            className="text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm mb-2">No staff members yet</p>
          <p className="text-xs text-gray-400">
            Add your first team member to start assigning appointments
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <div
              key={member.id}
              onClick={() => handleEdit(member)}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-bold flex-shrink-0">
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">{member.name}</p>
                    {member.telegramHandle ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Send size={12} className="text-blue-500" />
                        <p className="text-xs text-blue-600">@{member.telegramHandle}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">No Telegram handle</p>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Pencil size={14} className="text-gray-400" />
                </div>
              </div>

              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Services
              </p>
              {member.staffServices.length === 0 ? (
                <p className="text-xs text-gray-400">No services assigned</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {member.staffServices.map((ss) => (
                      <span
                        key={ss.service.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium"
                      >
                        {ss.service.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <p className="text-lg font-bold text-gray-900">
                {editingStaff ? 'Edit staff member' : 'New staff member'}
              </p>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Aziz Karimov"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Telegram handle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telegram handle
                </label>
                <p className="text-xs text-gray-400 mb-1.5">
                  Optional — for sending schedule notifications
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    @
                  </span>
                  <input
                    type="text"
                    value={formTelegramHandle}
                    onChange={(e) => setFormTelegramHandle(e.target.value.replace('@', ''))}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Services */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Services performed *
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Select at least one service this staff member can perform
                </p>
                {services.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
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
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {service.durationMinutes} min • {formatUZS(service.price)}
                            </p>
                          </div>
                          {selected ? (
                            <CheckCircle size={18} className="text-blue-600 flex-shrink-0" />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 flex-shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex-shrink-0 space-y-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : editingStaff ? 'Save changes' : 'Add staff member'}
              </button>

              {editingStaff && (
                <>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-3 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                    >
                      Remove staff member
                    </button>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm font-semibold text-red-800 mb-1">
                        Remove {editingStaff.name}?
                      </p>
                      <p className="text-xs text-red-600 mb-3">
                        This will unassign them from all future appointments.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex-1 py-2.5 border border-red-300 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          {deleting ? 'Removing...' : 'Yes, remove'}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
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
