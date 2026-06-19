'use client'

// 24h time dropdown in 30-minute steps. Locale-independent — options are fixed
// "HH:MM" strings (no AM/PM, no native localizing time picker), so the owner
// always sees Tashkent 24h time.
const OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return out
})()

export function TimeSelect({
  value,
  onChange,
  disabled = false,
  fullWidth = false,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  fullWidth?: boolean
}) {
  // If the stored value isn't on the 30-min grid, keep it as a selectable option.
  const options = OPTIONS.includes(value) ? OPTIONS : [value, ...OPTIONS]
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`${
        fullWidth ? 'w-full ' : ''
      }bg-surface-2 border border-border rounded-pill py-2 pl-4 pr-3 text-sm font-semibold text-text-1 tabular-nums cursor-pointer focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors disabled:opacity-50`}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
