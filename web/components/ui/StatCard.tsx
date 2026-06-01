import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string
  delta?: { value: string; positive?: boolean }
  money?: boolean
}

export function StatCard({ label, value, delta, money = false }: StatCardProps) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-text-2 mb-2">{label}</p>
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
