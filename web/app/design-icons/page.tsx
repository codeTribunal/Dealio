'use client'

import { notFound } from 'next/navigation'
import { Icon, ICON_NAMES, type IconName } from '@/components/icons/Icon'

function IconGrid({
  size,
  colorClass,
}: {
  size: number
  colorClass: string
}) {
  return (
    <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 ${colorClass}`}>
      {ICON_NAMES.map((name: IconName) => (
        <div
          key={name}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-surface border border-border rounded-lg"
        >
          <Icon name={name} size={size} />
          <p className="text-xs font-mono text-text-2">{name}</p>
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-2 border border-border rounded-xl p-6">
      <h2
        className="text-text-1 mb-5"
        style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-bold)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function DesignIconsPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  function toggleDark() {
    document.documentElement.classList.toggle('dark')
  }

  return (
    <main className="min-h-screen bg-bg p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1
            className="text-text-1"
            style={{ fontSize: 'var(--fs-h1)', fontWeight: 'var(--fw-extra)' }}
          >
            Micro-Detail Icons (Cobalt)
          </h1>
          <button
            type="button"
            onClick={toggleDark}
            className="px-4 py-2 rounded-lg bg-accent text-accent-on text-sm font-semibold shadow-accent self-start sm:self-auto"
          >
            Toggle dark
          </button>
        </header>

        <p className="text-text-2" style={{ fontSize: 'var(--fs-base)' }}>
          {ICON_NAMES.length} icons. Every cell consumes the same{' '}
          <code className="font-mono text-text-1">&lt;Icon /&gt;</code> component — colors
          come from <code className="font-mono text-text-1">currentColor</code>.
        </p>

        <Section title="Default — size 32, text-text-1">
          <IconGrid size={32} colorClass="text-text-1" />
        </Section>

        <Section title="Recolored — text-accent">
          <IconGrid size={32} colorClass="text-accent" />
        </Section>

        <Section title="Recolored — text-success">
          <IconGrid size={32} colorClass="text-success" />
        </Section>

        <Section title="Scaled — size 48, text-text-1">
          <IconGrid size={48} colorClass="text-text-1" />
        </Section>
      </div>
    </main>
  )
}
