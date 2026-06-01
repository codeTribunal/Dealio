/**
 * Token reference page. Renders every token by consuming the Tailwind
 * aliases (which point at the CSS vars) — no hardcoded hex values.
 * Class names are written as literals so Tailwind's JIT picks them up.
 * Toggle dark mode by temporarily adding class="dark" to <html>.
 */

type SwatchProps = {
  label: string
  className: string
}

function Swatch({ label, className }: SwatchProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-16 h-16 rounded-lg border border-border ${className}`} />
      <div>
        <p className="text-sm font-semibold text-text-1">{label}</p>
        <p className="text-xs text-text-3 font-mono">{className}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-xl p-6 shadow-sm">
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

const STATUS_GROUPS = [
  {
    name: 'success',
    swatches: [
      { label: 'success', className: 'bg-success' },
      { label: 'success-soft', className: 'bg-success-soft' },
      { label: 'success-strong', className: 'bg-success-strong' },
    ],
  },
  {
    name: 'warning',
    swatches: [
      { label: 'warning', className: 'bg-warning' },
      { label: 'warning-soft', className: 'bg-warning-soft' },
      { label: 'warning-strong', className: 'bg-warning-strong' },
    ],
  },
  {
    name: 'error',
    swatches: [
      { label: 'error', className: 'bg-error' },
      { label: 'error-soft', className: 'bg-error-soft' },
      { label: 'error-strong', className: 'bg-error-strong' },
    ],
  },
]

const RADII = [
  { label: 'rounded-sm', cls: 'rounded-sm' },
  { label: 'rounded-md', cls: 'rounded-md' },
  { label: 'rounded-lg', cls: 'rounded-lg' },
  { label: 'rounded-xl', cls: 'rounded-xl' },
  { label: 'rounded-pill', cls: 'rounded-pill' },
]

const SHADOWS = [
  { label: 'shadow-sm', cls: 'shadow-sm' },
  { label: 'shadow-md', cls: 'shadow-md' },
  { label: 'shadow-lg', cls: 'shadow-lg' },
  { label: 'shadow-accent', cls: 'shadow-accent' },
]

const TYPE_SCALE: ReadonlyArray<{ name: string; size: string; weight: string }> = [
  { name: 'h1', size: 'var(--fs-h1)', weight: 'var(--fw-extra)' },
  { name: 'h2', size: 'var(--fs-h2)', weight: 'var(--fw-bold)' },
  { name: 'h3', size: 'var(--fs-h3)', weight: 'var(--fw-bold)' },
  { name: 'lg', size: 'var(--fs-lg)', weight: 'var(--fw-semibold)' },
  { name: 'base', size: 'var(--fs-base)', weight: 'var(--fw-regular)' },
  { name: 'sm', size: 'var(--fs-sm)', weight: 'var(--fw-regular)' },
  { name: 'caption', size: 'var(--fs-caption)', weight: 'var(--fw-medium)' },
]

import { notFound } from 'next/navigation'

export default function DesignTokensPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main className="min-h-screen bg-bg p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1
            className="text-text-1"
            style={{ fontSize: 'var(--fs-h1)', fontWeight: 'var(--fw-extra)' }}
          >
            Design Tokens — Practical Soft Depth (Cobalt)
          </h1>
          <p className="text-text-2 mt-2" style={{ fontSize: 'var(--fs-base)' }}>
            Add <code className="font-mono text-text-1">class=&quot;dark&quot;</code> on{' '}
            <code className="font-mono text-text-1">&lt;html&gt;</code> to preview dark mode.
          </p>
        </header>

        <Section title="Accent">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Swatch label="accent" className="bg-accent" />
            <Swatch label="accent-hover" className="bg-accent-hover" />
            <Swatch label="accent-active" className="bg-accent-active" />
            <Swatch label="accent-soft" className="bg-accent-soft" />
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center text-accent-on font-bold">
                Aa
              </div>
              <div>
                <p className="text-sm font-semibold text-text-1">accent-on</p>
                <p className="text-xs text-text-3 font-mono">text-accent-on</p>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Semantic status">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STATUS_GROUPS.map((g) => (
              <div key={g.name} className="space-y-3">
                <p className="text-sm font-semibold text-text-1 uppercase tracking-wider">
                  {g.name}
                </p>
                {g.swatches.map((s) => (
                  <Swatch key={s.label} label={s.label} className={s.className} />
                ))}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Surfaces & borders">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Swatch label="bg" className="bg-bg" />
            <Swatch label="surface" className="bg-surface" />
            <Swatch label="surface-2" className="bg-surface-2" />
            <Swatch label="border" className="border-2 border-border bg-transparent" />
            <Swatch
              label="border-strong"
              className="border-2 border-border-strong bg-transparent"
            />
          </div>
        </Section>

        <Section title="Text">
          <div className="space-y-2">
            <p className="text-text-1" style={{ fontSize: 'var(--fs-base)' }}>
              text-1 — primary body text (--text-1)
            </p>
            <p className="text-text-2" style={{ fontSize: 'var(--fs-base)' }}>
              text-2 — secondary text (--text-2)
            </p>
            <p className="text-text-3" style={{ fontSize: 'var(--fs-base)' }}>
              text-3 — tertiary / placeholder (--text-3)
            </p>
          </div>
        </Section>

        <Section title="Radii">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {RADII.map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-2">
                <div
                  className={`w-20 h-20 bg-accent-soft border border-border-strong ${r.cls}`}
                />
                <p className="text-xs font-mono text-text-2">{r.label}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Elevation">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SHADOWS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <div className={`w-32 h-20 rounded-lg bg-surface ${s.cls}`} />
                <p className="text-xs font-mono text-text-2">{s.label}</p>
              </div>
            ))}

            {/* Neumorphic quick-action — outer dual shadow at rest, inset on :active */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                className="px-5 py-3 rounded-lg bg-bg text-text-1 text-sm font-semibold shadow-neu active:shadow-neu-inset transition-shadow"
                style={{
                  transitionDuration: 'var(--dur-fast)',
                  transitionTimingFunction: 'var(--ease)',
                }}
              >
                Quick action
              </button>
              <p className="text-xs font-mono text-text-2">
                shadow-neu / active:shadow-neu-inset
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="w-32 h-20 rounded-lg bg-bg shadow-neu-inset" />
              <p className="text-xs font-mono text-text-2">shadow-neu-inset (resting)</p>
            </div>
          </div>
        </Section>

        <Section title="Type scale">
          <div className="space-y-2">
            {TYPE_SCALE.map((t) => (
              <div
                key={t.name}
                className="flex items-baseline gap-4 border-b border-border last:border-0 py-2"
              >
                <p
                  className="text-text-1 flex-1"
                  style={{ fontSize: t.size, fontWeight: t.weight }}
                >
                  The quick brown fox — {t.name}
                </p>
                <p className="text-xs font-mono text-text-3 shrink-0">{t.size}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  )
}
