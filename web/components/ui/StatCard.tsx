import { Card } from './Card'
import { Icon, type IconName } from '@/components/icons/Icon'

interface StatCardProps {
  label: string
  value: string
  delta?: { value: string; positive?: boolean }
  money?: boolean
  // Optional accent-tinted glyph chip shown top-right. Purely decorative; when
  // omitted the card renders exactly as before (so existing call sites are
  // unchanged).
  icon?: IconName
}

export function StatCard({ label, value, delta, money = false, icon }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-text-2 mb-2">{label}</p>
        {icon && (
          <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <p
        className={`tabular-nums font-extrabold ${money ? 'text-success-strong' : 'text-text-1'}`}
        style={{ fontSize: 'var(--fs-h2)', lineHeight: 1.1 }}
      >
        {value}
      </p>
      {delta && (
        <p
          className={`text-xs font-medium mt-2 ${
            delta.positive ? 'text-success-strong' : 'text-error-strong'
          }`}
        >
          {delta.positive ? '↑' : '↓'} {delta.value}
        </p>
      )}
    </Card>
  )
}
