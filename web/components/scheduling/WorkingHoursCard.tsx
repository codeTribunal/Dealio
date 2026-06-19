'use client'
import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/icons/Icon'
import { useI18n } from '@/lib/i18n/i18nContext'
import { updateBusiness } from '@/lib/api'
import type { Business, WorkingDay, WorkingHours } from '@/types'
import { TimeSelect } from './TimeSelect'
import { hhmmToMinutes } from './TimeField'

// UI shows Monday first; backend keys are "0".."6" with 0=Sunday. The `key`
// here IS the backend key — Sunday is "0", NOT Monday. Do not reorder the keys.
const DAY_ROWS: { key: string; labelKey: string }[] = [
  { key: '1', labelKey: 'dayMon' },
  { key: '2', labelKey: 'dayTue' },
  { key: '3', labelKey: 'dayWed' },
  { key: '4', labelKey: 'dayThu' },
  { key: '5', labelKey: 'dayFri' },
  { key: '6', labelKey: 'daySat' },
  { key: '0', labelKey: 'daySun' },
]

const DEFAULT_INTERVAL: WorkingDay = { start: '09:00', end: '18:00' }

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Normalize any stored day value (array | legacy single | null) into an array.
function toIntervals(v: WorkingDay | WorkingDay[] | null | undefined): WorkingDay[] {
  if (!v) return []
  if (Array.isArray(v)) return v.map((i) => ({ start: i.start, end: i.end }))
  return [{ start: v.start, end: v.end }]
}

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`w-11 h-6 rounded-pill relative cursor-pointer transition-colors flex-shrink-0 ${
        active ? 'bg-accent' : 'bg-border-strong'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-surface rounded-pill shadow-sm transition-transform ${
          active ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function initDays(wh: WorkingHours | null | undefined): Record<string, WorkingDay[]> {
  const configured = wh && typeof wh === 'object' && Object.keys(wh).length > 0
  const result: Record<string, WorkingDay[]> = {}
  for (const { key } of DAY_ROWS) {
    // Never configured → start open 09:00–18:00 (not saved yet). Otherwise
    // respect the stored value (array, legacy single, or null = closed).
    result[key] = configured ? toIntervals(wh![key]) : [{ ...DEFAULT_INTERVAL }]
  }
  return result
}

export function WorkingHoursCard({
  business,
  onSaved,
  notify,
}: {
  business: Business
  onSaved: (updated: Business) => void
  notify: (msg: string) => void
}) {
  const { t } = useI18n()
  const [days, setDays] = useState<Record<string, WorkingDay[]>>(() =>
    initDays(business.workingHours)
  )
  const [buffer, setBuffer] = useState<string>(String(business.bufferMinutes ?? 0))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setDayOpen(key: string, open: boolean) {
    setError(null)
    setDays((prev) => ({
      ...prev,
      [key]: open ? (prev[key].length ? prev[key] : [{ ...DEFAULT_INTERVAL }]) : [],
    }))
  }

  function setIntervalTime(key: string, idx: number, field: 'start' | 'end', val: string) {
    setError(null)
    setDays((prev) => ({
      ...prev,
      [key]: prev[key].map((iv, i) => (i === idx ? { ...iv, [field]: val } : iv)),
    }))
  }

  function addInterval(key: string) {
    setError(null)
    setDays((prev) => {
      const list = prev[key]
      const last = list[list.length - 1]
      // New interval starts where the last ends (a 1h block) — the owner then
      // pushes its start later to create the break between them.
      const startMin = last ? Math.min(hhmmToMinutes(last.end), 23 * 60) : 9 * 60
      const endMin = Math.min(startMin + 60, 23 * 60 + 59)
      return { ...prev, [key]: [...list, { start: minToHHMM(startMin), end: minToHHMM(endMin) }] }
    })
  }

  function removeInterval(key: string, idx: number) {
    setError(null)
    setDays((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }))
  }

  async function handleSave() {
    // Validate: every interval start < end, and a day's intervals don't overlap.
    for (const { key } of DAY_ROWS) {
      const list = days[key]
      for (const iv of list) {
        if (hhmmToMinutes(iv.start) >= hhmmToMinutes(iv.end)) {
          setError(t('scheduling.timeInvalid'))
          return
        }
      }
      const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start))
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start < sorted[i - 1].end) {
          setError(t('scheduling.overlap'))
          return
        }
      }
    }

    // Assemble the backend object keyed "0".."6". Closed = null; open = intervals.
    const workingHours: WorkingHours = {}
    for (const { key } of DAY_ROWS) {
      workingHours[key] = days[key].length
        ? days[key].map((iv) => ({ start: iv.start, end: iv.end }))
        : null
    }
    const bufferMinutes = Math.max(0, Math.min(120, Number(buffer) || 0))

    setSaving(true)
    setError(null)
    try {
      const updated = await updateBusiness({ workingHours, bufferMinutes })
      onSaved(updated)
      notify(t('scheduling.workingHoursSaved'))
    } catch {
      setError(t('scheduling.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title={t('scheduling.workingHours')} />
      <p className="text-sm text-text-2 mb-4">{t('scheduling.workingHoursHint')}</p>

      <div className="space-y-2">
        {DAY_ROWS.map(({ key, labelKey }) => {
          const list = days[key]
          const open = list.length > 0
          return (
            <div
              key={key}
              className={`rounded-lg border border-border px-3.5 py-3 transition-colors ${
                open ? 'bg-surface' : 'bg-surface-2'
              }`}
            >
              {/* Header: toggle + day; "Unavailable" when closed */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Toggle active={open} onClick={() => setDayOpen(key, !open)} />
                  <span className="text-sm font-bold text-text-1">
                    {t(`scheduling.${labelKey}`)}
                  </span>
                </div>
                {!open && (
                  <span className="text-sm italic text-text-3 flex-shrink-0">
                    {t('scheduling.unavailable')}
                  </span>
                )}
              </div>

              {open && (
                <div className="mt-3 space-y-2">
                  {/* One row per open interval; the gaps between them are breaks */}
                  {list.map((iv, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className="flex-1">
                        <TimeSelect
                          fullWidth
                          value={iv.start}
                          onChange={(v) => setIntervalTime(key, idx, 'start', v)}
                        />
                      </div>
                      <span className="text-text-3 flex-shrink-0">–</span>
                      <div className="flex-1">
                        <TimeSelect
                          fullWidth
                          value={iv.end}
                          onChange={(v) => setIntervalTime(key, idx, 'end', v)}
                        />
                      </div>
                      {list.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeInterval(key, idx)}
                          aria-label={t('scheduling.removeSlot')}
                          className="flex-shrink-0 p-2 text-text-3 hover:text-error-strong transition-colors"
                        >
                          <Icon name="close" size={18} />
                        </button>
                      ) : (
                        <span className="w-[34px] flex-shrink-0" aria-hidden />
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addInterval(key)}
                    className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
                  >
                    + {t('scheduling.addHours')}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Buffer */}
      <div className="mt-5 pt-5 border-t border-border">
        <label className="block text-sm font-medium text-text-1 mb-1.5">
          {t('scheduling.buffer')}
        </label>
        <div className="flex items-center gap-2">
          <div className="w-24">
            <Input
              type="number"
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              min="0"
              max="120"
              className="text-center tabular-nums"
            />
          </div>
          <span className="text-sm text-text-2">{t('scheduling.bufferUnit')}</span>
        </div>
        <p className="text-xs text-text-3 mt-1.5">{t('scheduling.bufferHint')}</p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-error-soft border border-error-strong rounded-md">
          <p className="text-sm text-error-strong">{error}</p>
        </div>
      )}

      <div className="mt-5">
        <Button variant="primary" loading={saving} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </div>
    </Card>
  )
}
