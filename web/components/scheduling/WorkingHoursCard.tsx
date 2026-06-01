'use client'
import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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

// Weekday keys (Mon–Fri) for "Copy to weekdays".
const WEEKDAY_KEYS = ['1', '2', '3', '4', '5']

const DEFAULT_DAY: WorkingDay = { start: '09:00', end: '18:00' }

// Quick presets (24h). Labels are numeric so they need no translation.
const PRESETS: { label: string; start: string; end: string }[] = [
  { label: '9–17', start: '09:00', end: '17:00' },
  { label: '9–18', start: '09:00', end: '18:00' },
  { label: '10–18', start: '10:00', end: '18:00' },
  { label: '10–19', start: '10:00', end: '19:00' },
]

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

function initDays(wh: WorkingHours | null | undefined): Record<string, WorkingDay | null> {
  const configured = wh && typeof wh === 'object' && Object.keys(wh).length > 0
  const result: Record<string, WorkingDay | null> = {}
  for (const { key } of DAY_ROWS) {
    if (!configured) {
      // Never configured → start the UI all-open 09:00–18:00 (not saved yet).
      result[key] = { ...DEFAULT_DAY }
    } else {
      // Configured: respect the value; a missing day means closed.
      result[key] = wh![key] ?? null
    }
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
  const [days, setDays] = useState<Record<string, WorkingDay | null>>(() =>
    initDays(business.workingHours)
  )
  const [buffer, setBuffer] = useState<string>(String(business.bufferMinutes ?? 0))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setDayOpen(key: string, open: boolean) {
    setError(null)
    setDays((prev) => ({ ...prev, [key]: open ? prev[key] ?? { ...DEFAULT_DAY } : null }))
  }

  function setDayTime(key: string, field: 'start' | 'end', val: string) {
    setError(null)
    setDays((prev) => {
      const cur = prev[key] ?? { ...DEFAULT_DAY }
      return { ...prev, [key]: { ...cur, [field]: val } }
    })
  }

  function applyPreset(key: string, start: string, end: string) {
    setError(null)
    setDays((prev) => ({ ...prev, [key]: { start, end } }))
  }

  function copyToWeekdays(key: string) {
    const source = days[key]
    if (!source) return
    setDays((prev) => {
      const next = { ...prev }
      for (const wk of WEEKDAY_KEYS) next[wk] = { ...source }
      return next
    })
    notify(t('scheduling.copiedToWeekdays'))
  }

  async function handleSave() {
    // Validate: every open day must have start < end.
    for (const { key } of DAY_ROWS) {
      const d = days[key]
      if (d && hhmmToMinutes(d.start) >= hhmmToMinutes(d.end)) {
        setError(t('scheduling.timeInvalid'))
        return
      }
    }

    // Assemble the backend object keyed "0".."6" (0=Sunday). Closed = null.
    const workingHours: WorkingHours = {}
    for (const { key } of DAY_ROWS) {
      workingHours[key] = days[key] ? { start: days[key]!.start, end: days[key]!.end } : null
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
          const day = days[key]
          const open = day !== null
          const isWeekday = WEEKDAY_KEYS.includes(key)
          return (
            <div
              key={key}
              className={`rounded-lg border px-3.5 py-3 transition-colors ${
                open ? 'border-border bg-surface' : 'border-border bg-surface-2'
              }`}
            >
              {/* Row 1: toggle + day + time range (+ copy on the right) */}
              <div className="flex items-center gap-3 flex-wrap">
                <Toggle active={open} onClick={() => setDayOpen(key, !open)} />
                <span className="text-sm font-bold text-text-1 w-24">
                  {t(`scheduling.${labelKey}`)}
                </span>

                {open && day ? (
                  <>
                    <div className="flex items-center gap-2">
                      <TimeSelect value={day.start} onChange={(v) => setDayTime(key, 'start', v)} />
                      <span className="text-text-3">–</span>
                      <TimeSelect value={day.end} onChange={(v) => setDayTime(key, 'end', v)} />
                    </div>
                    {isWeekday && (
                      <button
                        type="button"
                        onClick={() => copyToWeekdays(key)}
                        className="ml-auto text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
                      >
                        {t('scheduling.copyToWeekdays')}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-sm italic text-text-3">
                    {t('scheduling.unavailable')}
                  </span>
                )}
              </div>

              {/* Row 2: quick presets */}
              {open && day && (
                <div className="flex flex-wrap gap-1.5 mt-2.5 pl-[3.5rem]">
                  {PRESETS.map((p) => {
                    const active = day.start === p.start && day.end === p.end
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(key, p.start, p.end)}
                        className={`px-2.5 py-1 rounded-pill text-xs font-semibold tabular-nums transition-colors ${
                          active
                            ? 'bg-accent-soft text-accent'
                            : 'bg-surface border border-border text-text-2 hover:bg-surface-2'
                        }`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
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
