'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/icons/Icon'
import { useI18n } from '@/lib/i18n/i18nContext'
import {
  getBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot,
  getStaffForForm,
} from '@/lib/api'
import {
  tashkentWallClockToIso,
  formatDateTashkent,
  formatTimeTashkent,
} from '@/lib/format'
import { TimeField, hhmmToMinutes } from './TimeField'
import type { BlockedSlot, StaffMember } from '@/types'

const SELECT_CLASS =
  'w-full bg-surface border border-border rounded-md py-2.5 px-3.5 text-sm text-text-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors'

// Tashkent (UTC+5) calendar date today, as YYYY-MM-DD.
function tashkentToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' })
}

export function BlockedTimeCard({ notify }: { notify: (msg: string) => void }) {
  const { t } = useI18n()
  const [slots, setSlots] = useState<BlockedSlot[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState(tashkentToday())
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('18:00')
  const [scopeStaffId, setScopeStaffId] = useState('') // '' = whole business
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const from = tashkentWallClockToIso(tashkentToday(), '00:00')
    Promise.all([getBlockedSlots({ from }), getStaffForForm()])
      .then(([slotsData, staffData]) => {
        setSlots(slotsData)
        setStaff(staffData)
      })
      .catch(() => setError(t('scheduling.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  function resetForm() {
    setDate(tashkentToday())
    setStart('09:00')
    setEnd('18:00')
    setScopeStaffId('')
    setReason('')
    setFormError(null)
  }

  async function handleAdd() {
    if (!date) {
      setFormError(t('scheduling.timeInvalid'))
      return
    }
    if (hhmmToMinutes(start) >= hhmmToMinutes(end)) {
      setFormError(t('scheduling.timeInvalid'))
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await createBlockedSlot({
        staffId: scopeStaffId || undefined,
        startTime: tashkentWallClockToIso(date, start),
        endTime: tashkentWallClockToIso(date, end),
        reason: reason.trim() || undefined,
      })
      resetForm()
      setShowForm(false)
      notify(t('scheduling.blockedTime'))
      load()
    } catch {
      setFormError(t('scheduling.blockedAddFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBlockedSlot(id)
      setSlots((prev) => prev.filter((s) => s.id !== id))
      setConfirmId(null)
    } catch {
      setError(t('scheduling.deleteFailed'))
    }
  }

  return (
    <Card>
      <CardHeader
        title={t('scheduling.blockedTime')}
        right={
          !showForm ? (
            <Button variant="ghost" size="sm" leftIcon="add" onClick={() => setShowForm(true)}>
              {t('scheduling.addBlocked')}
            </Button>
          ) : undefined
        }
      />
      <p className="text-sm text-text-2 mb-4">{t('scheduling.blockedTimeHint')}</p>

      {/* Add form */}
      {showForm && (
        <div className="mb-5 p-4 bg-surface-2 border border-border rounded-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-2 mb-1.5">
              {t('scheduling.date')}
            </label>
            <Input
              type="date"
              value={date}
              min={tashkentToday()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-text-2 mb-1.5">
                {t('scheduling.start')}
              </label>
              <TimeField value={start} onChange={setStart} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-2 mb-1.5">
                {t('scheduling.end')}
              </label>
              <TimeField value={end} onChange={setEnd} />
            </div>
            <span className="text-xs text-text-3 pb-2.5">{t('scheduling.time24h')}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-2 mb-1.5">
              {t('scheduling.scope')}
            </label>
            <select
              value={scopeStaffId}
              onChange={(e) => setScopeStaffId(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">{t('scheduling.wholeBusiness')}</option>
              {staff.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-2 mb-1.5">
              {t('scheduling.reason')}
            </label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('scheduling.reasonPlaceholder')}
            />
          </div>

          {formError && (
            <div className="p-3 bg-error-soft border border-error-strong rounded-md">
              <p className="text-sm text-error-strong">{formError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="primary" loading={saving} onClick={handleAdd}>
              {t('scheduling.addBlockedSubmit')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-text-3 py-4">{t('common.loading')}</p>
      ) : error ? (
        <div className="flex items-center gap-2 py-4">
          <p className="text-sm text-error-strong">{error}</p>
          <button
            className="text-sm font-semibold text-accent hover:text-accent-hover"
            onClick={load}
          >
            {t('common.tryAgain')}
          </button>
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto mb-3 w-12 h-12 rounded-lg bg-accent-soft flex items-center justify-center text-accent">
            <Icon name="calendar" size={22} />
          </div>
          <p className="text-sm text-text-3">{t('scheduling.noBlocked')}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {slots.map((slot) => (
            <div key={slot.id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-1 tabular-nums">
                  {formatDateTashkent(slot.startTime)} · {formatTimeTashkent(slot.startTime)}–
                  {formatTimeTashkent(slot.endTime)}
                </p>
                <p className="text-xs text-text-2 mt-0.5">
                  {slot.staff ? slot.staff.name : t('scheduling.wholeBusiness')}
                  {slot.reason ? <span className="text-text-3"> · {slot.reason}</span> : null}
                </p>
              </div>

              {confirmId === slot.id ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="danger" size="sm" onClick={() => handleDelete(slot.id)}>
                    {t('common.delete')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(slot.id)}
                  aria-label={t('common.delete')}
                  title={t('scheduling.blockedDeleteConfirm')}
                  className="text-text-3 hover:text-error-strong transition-colors flex-shrink-0"
                >
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
