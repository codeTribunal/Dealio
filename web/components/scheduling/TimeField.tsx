'use client'
import { Input } from '@/components/ui/Input'

// Two-number HH:MM entry (24h). Mirrors the appointment-create time pattern so
// the owner never sees a localized 12h/AM-PM or native time picker. Emits "HH:MM".
export function TimeField({
  value,
  onChange,
  disabled = false,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const [hh = '09', mm = '00'] = value.split(':')

  const setHour = (raw: string) => {
    const v = Math.max(0, Math.min(23, Number(raw) || 0))
    onChange(`${v.toString().padStart(2, '0')}:${mm}`)
  }
  const setMinute = (raw: string) => {
    const v = Math.max(0, Math.min(59, Number(raw) || 0))
    onChange(`${hh}:${v.toString().padStart(2, '0')}`)
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14">
        <Input
          type="number"
          value={hh}
          onChange={(e) => setHour(e.target.value)}
          min="0"
          max="23"
          placeholder="HH"
          disabled={disabled}
          className="text-center tabular-nums"
        />
      </div>
      <span className="text-text-1 font-bold">:</span>
      <div className="w-14">
        <Input
          type="number"
          value={mm}
          onChange={(e) => setMinute(e.target.value)}
          min="0"
          max="59"
          placeholder="MM"
          disabled={disabled}
          className="text-center tabular-nums"
        />
      </div>
    </div>
  )
}

// "HH:MM" → minutes since midnight, for start<end validation.
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
