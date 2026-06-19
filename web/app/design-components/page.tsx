'use client'
import { notFound } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { StatCard } from '@/components/ui/StatCard'
import { QuickActions } from '@/components/ui/QuickActions'
import { HeroCard } from '@/components/ui/HeroCard'
import { Spinner } from '@/components/ui/Spinner'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="text-text-1 mb-4"
        style={{ fontSize: 'var(--fs-h3)', fontWeight: 'var(--fw-bold)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

const BADGE_SAMPLES: Array<{ type: 'order' | 'payment' | 'appointment' | 'project'; statuses: string[] }> = [
  { type: 'order', statuses: ['NEW', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'] },
  { type: 'payment', statuses: ['PENDING', 'PAYMENT_RECEIVED', 'CONFIRMED'] },
  { type: 'appointment', statuses: ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
  { type: 'project', statuses: ['PROPOSAL_SENT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'] },
]

export default function DesignComponentsPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const [pressed, setPressed] = useState<string | null>(null)

  function toggleDark() {
    document.documentElement.classList.toggle('dark')
  }

  return (
    <main className="min-h-screen bg-bg p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1
            className="text-text-1"
            style={{ fontSize: 'var(--fs-h1)', fontWeight: 'var(--fw-extra)' }}
          >
            Core Components — Practical Soft Depth
          </h1>
          <Button variant="primary" onClick={toggleDark}>Toggle dark</Button>
        </header>

        {/* Buttons */}
        <Section title="Buttons — variants">
          <Card>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" loading>Loading</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </Card>
        </Section>

        <Section title="Buttons — sizes & icons">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" leftIcon="add">Add small</Button>
              <Button size="md" leftIcon="add">Add medium</Button>
              <Button size="lg" leftIcon="add">Add large</Button>
              <Button variant="secondary" rightIcon="search">Search</Button>
              <Button variant="ghost" leftIcon="logout">Sign out</Button>
            </div>
          </Card>
        </Section>

        {/* Cards */}
        <Section title="Card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Default card" right={<Button variant="ghost" size="sm">Edit</Button>} />
              <p className="text-sm text-text-2">
                bg-surface, border-border, rounded-xl, shadow-sm. Padding p-5 by default.
              </p>
            </Card>
            <Card padded={false}>
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-semibold text-text-1">Card padded=false</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-text-2">Section can manage its own padding.</p>
              </div>
            </Card>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges — semantic colors (success / warning / error)">
          <Card>
            <div className="space-y-4">
              {BADGE_SAMPLES.map((g) => (
                <div key={g.type}>
                  <p className="text-xs font-mono text-text-3 mb-2 uppercase tracking-wider">
                    {g.type}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {g.statuses.map((s) => (
                      <Badge key={s} status={s} type={g.type} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* Inputs */}
        <Section title="Input & Textarea">
          <Card>
            <div className="space-y-4 max-w-md">
              <Input placeholder="Plain input" />
              <Input leftIcon="search" placeholder="Search customers..." />
              <Input disabled placeholder="Disabled" />
              <Textarea rows={3} placeholder="Multi-line notes..." />
            </div>
          </Card>
        </Section>

        {/* Avatars */}
        <Section title="Avatar — sizes">
          <Card>
            <div className="flex items-center gap-4">
              <Avatar name="Asad Jonibekov" size="sm" />
              <Avatar name="Asad Jonibekov" size="md" />
              <Avatar name="Asad Jonibekov" size="lg" />
              <Avatar name="Laylo Cakes" size="md" />
            </div>
          </Card>
        </Section>

        {/* StatCard */}
        <Section title="StatCard">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Orders this month" value="142" delta={{ value: '12% vs last', positive: true }} />
            <StatCard label="Pending payments" value="8" delta={{ value: '3% vs last', positive: false }} />
            <StatCard label="Avg order value" value="180 000 soum" money />
            <StatCard label="Active customers" value="56" />
          </div>
        </Section>

        {/* QuickActions — the ONE neumorphic block */}
        <Section title="QuickActions — the only neumorphic surface">
          <p className="text-sm text-text-2 mb-3">
            Press a tile to see <code className="font-mono text-text-1">shadow-neu-inset</code>.
          </p>
          <QuickActions
            items={[
              { icon: 'add', label: 'New order', onClick: () => setPressed('new-order') },
              { icon: 'customers', label: 'New customer', onClick: () => setPressed('new-customer') },
              { icon: 'calendar', label: 'New booking', onClick: () => setPressed('new-booking') },
              { icon: 'projects', label: 'New project', onClick: () => setPressed('new-project') },
            ]}
          />
          {pressed && (
            <p className="text-xs text-text-3 mt-3">
              Last pressed: <span className="font-mono text-text-1">{pressed}</span>
            </p>
          )}
        </Section>

        {/* HeroCard */}
        <Section title="HeroCard — solid cobalt money hero">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HeroCard label="Revenue this month" value="12 480 000 soum" sub="↑ 18% vs last month" />
            <HeroCard label="Outstanding" value="1 250 000 soum" sub="3 invoices awaiting" />
          </div>
        </Section>

        {/* Spinner */}
        <Section title="Spinner">
          <Card>
            <div className="flex items-center gap-6">
              <Spinner size={14} />
              <Spinner size={20} />
              <Spinner size={32} />
              <Spinner size={48} />
            </div>
          </Card>
        </Section>
      </div>
    </main>
  )
}
