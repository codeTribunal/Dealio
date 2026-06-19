interface HeroCardProps {
  label: string
  value: string
  sub?: string
  className?: string
}

export function HeroCard({ label, value, sub, className = '' }: HeroCardProps) {
  return (
    <div
      className={`bg-accent text-accent-on rounded-xl p-5 shadow-accent ${className}`}
    >
      <div>
        <p className="text-xs uppercase tracking-wide opacity-80 mb-2">{label}</p>
        <p
          className="tabular-nums font-extrabold"
          style={{ fontSize: '34px', lineHeight: 1.05 }}
        >
          {value}
        </p>
        {sub && <p className="text-sm opacity-90 mt-2">{sub}</p>}
      </div>
    </div>
  )
}
