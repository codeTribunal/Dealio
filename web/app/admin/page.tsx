'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import { getDashboard, DashboardMetrics } from '@/lib/adminApi'
import { formatRelativeTime } from '@/lib/format'

function PlanBadge({ plan }: { plan: string }) {
  const classes =
    plan === 'PRO'
      ? 'bg-blue-900 text-blue-300'
      : plan === 'BUSINESS'
      ? 'bg-purple-900 text-purple-300'
      : 'bg-gray-700 text-gray-300'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {plan}
    </span>
  )
}

// ── v2 sections ───────────────────────────────────────────────────────────────

type FunnelWindowKey = keyof DashboardMetrics['funnel']

const FUNNEL_WINDOWS: { key: FunnelWindowKey; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: 'all', label: 'All' },
]

function FunnelCard({ funnel }: { funnel: DashboardMetrics['funnel'] }) {
  const [win, setWin] = useState<FunnelWindowKey>('30d')
  const w = funnel[win]
  const steps: { label: string; count: number; pct: number | null }[] = [
    { label: 'Signups', count: w.signups, pct: null },
    { label: 'Bot connected', count: w.botConnected.count, pct: w.botConnected.pct },
    { label: 'Catalog ready', count: w.catalogReady.count, pct: w.catalogReady.pct },
    { label: 'First sale', count: w.firstSale.count, pct: w.firstSale.pct },
    { label: 'Activated', count: w.activated.count, pct: w.activated.pct },
  ]
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Activation funnel</h3>
        <div className="flex gap-1">
          {FUNNEL_WINDOWS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setWin(key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                win === key
                  ? 'bg-blue-900 text-blue-300'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {steps.map((s) => (
          <div key={s.label} className="text-center p-3 bg-gray-800 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-white">{s.count}</p>
            <p className="text-xs text-blue-300 mt-0.5">
              {s.pct === null ? '100%' : `${s.pct}%`}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Median days to first sale:{' '}
        <span className="text-gray-300">{w.medianDaysToFirstSale ?? '—'}</span>
      </p>
    </div>
  )
}

function AttentionCard({
  title,
  rows,
}: {
  title: string
  rows: { id: string; primary: string; secondary?: string }[]
}) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-base text-gray-600 text-center py-4">None</p>
      ) : (
        rows.map((r) => (
          <Link
            key={r.id}
            href={`/admin/businesses/${r.id}`}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 -mx-2 px-2 rounded-lg"
          >
            <p className="text-base font-medium text-white truncate">{r.primary}</p>
            {r.secondary && (
              <p className="text-xs text-gray-500 flex-shrink-0">{r.secondary}</p>
            )}
          </Link>
        ))
      )}
    </div>
  )
}

function MomentumCard({
  title,
  points,
  barClass,
}: {
  title: string
  points: { day: string; value: number }[]
  barClass: string
}) {
  const max = Math.max(1, ...points.map((p) => p.value))
  const total = points.reduce((sum, p) => sum + p.value, 0)
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-xs text-gray-500">{total} in 30 days</p>
      </div>
      {points.length === 0 ? (
        <p className="text-base text-gray-600 text-center py-4">None</p>
      ) : (
        <>
          {/* CSS-only bars: height scaled to the window max */}
          <div className="flex items-end gap-0.5 h-16">
            {points.map((p) => (
              <div
                key={p.day}
                title={`${p.day}: ${p.value}`}
                className="flex-1 flex flex-col justify-end h-full"
              >
                <div
                  className={`${barClass} rounded-sm w-full`}
                  style={{
                    height: p.value > 0 ? `${(p.value / max) * 100}%` : '2px',
                    opacity: p.value > 0 ? 1 : 0.2,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-[10px] text-gray-600">{points[0].day}</p>
            <p className="text-[10px] text-gray-600">{points[points.length - 1].day}</p>
          </div>
        </>
      )}
    </div>
  )
}

const METRIC_LABELS: Record<string, string> = {
  customers: 'Customers',
  ordersPerMonth: 'Orders this month',
  appointmentsPerMonth: 'Appointments this month',
}

function CompositionCard({
  title,
  entries,
}: {
  title: string
  entries: Record<string, number>
}) {
  const keys = Object.keys(entries)
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="flex gap-4">
        {keys.map((k) => (
          <div key={k} className="flex-1 text-center p-3 bg-gray-800 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">{k}</p>
            <p className="text-xl font-bold text-white">{entries[k]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboard()
      .then(setMetrics)
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout title="Dashboard">
      {loading && (
        <div className="flex items-center justify-center h-64">
          <p className="text-base text-gray-500">Loading...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
          <p className="text-base text-red-400">{error}</p>
        </div>
      )}

      {metrics && (
        <>
          {/* Metrics grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Businesses
              </p>
              <p className="text-2xl font-bold text-white">
                {metrics.totalBusinesses}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.activeThisMonth} active this month
              </p>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                New this week
              </p>
              <p className="text-2xl font-bold text-white">
                {metrics.newThisWeek}
              </p>
              <p className="text-xs text-gray-500 mt-1">new signups</p>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Customers
              </p>
              <p className="text-2xl font-bold text-white">
                {metrics.totalCustomers}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                across all businesses
              </p>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Suspended
              </p>
              <p
                className={`text-2xl font-bold ${
                  metrics.suspended > 0 ? 'text-red-400' : 'text-white'
                }`}
              >
                {metrics.suspended}
              </p>
              <p className="text-xs text-gray-500 mt-1">accounts</p>
            </div>
          </div>

          {/* Plan breakdown */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Plans</h3>
            <div className="flex gap-4">
              {(['FREE', 'PRO', 'BUSINESS'] as const).map((plan) => (
                <div
                  key={plan}
                  className="flex-1 text-center p-3 bg-gray-800 rounded-xl"
                >
                  <p className="text-xs text-gray-400 mb-1">{plan}</p>
                  <p className="text-xl font-bold text-white">
                    {metrics.byPlan[plan]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Recent signups */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent signups
              </h3>
              {metrics.recentSignups.length === 0 && (
                <p className="text-base text-gray-600 text-center py-4">
                  No recent signups
                </p>
              )}
              {metrics.recentSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-b-0"
                >
                  <div>
                    <p className="text-base font-medium text-white">
                      {signup.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatRelativeTime(signup.createdAt)}
                    </p>
                  </div>
                  <PlanBadge plan={signup.plan} />
                </div>
              ))}
            </div>

            {/* Recent suspensions */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent suspensions
              </h3>
              {metrics.recentSuspensions.length === 0 ? (
                <p className="text-base text-gray-600 text-center py-4">
                  No suspensions
                </p>
              ) : (
                metrics.recentSuspensions.map((s) => (
                  <div
                    key={s.id}
                    className="py-2.5 border-b border-gray-800 last:border-b-0"
                  >
                    <p className="text-base font-medium text-white">{s.name}</p>
                    <p className="text-xs text-red-400 mt-0.5 truncate">
                      {s.suspendedReason}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── v2: Activation funnel ─────────────────────────────── */}
          <FunnelCard funnel={metrics.funnel} />

          {/* ── v2: Needs attention ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-8">
            <AttentionCard
              title="Pending deletion"
              rows={metrics.attention.pendingDeletion.map((b) => ({
                id: b.id,
                primary: b.name,
                secondary: b.deletionScheduledAt
                  ? `purge ${new Date(b.deletionScheduledAt).toLocaleDateString('en-GB')}`
                  : undefined,
              }))}
            />
            <AttentionCard
              title="Stuck onboarding"
              rows={metrics.attention.stuckOnboarding.map((b) => ({
                id: b.id,
                primary: b.name,
                secondary: formatRelativeTime(b.createdAt),
              }))}
            />
            <AttentionCard
              title="Gone quiet"
              rows={metrics.attention.goneQuiet.map((b) => ({
                id: b.id,
                primary: b.name,
              }))}
            />
          </div>

          {/* ── v2: Momentum (last 30 days) ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-8">
            <MomentumCard
              title="Orders + appointments"
              barClass="bg-blue-500"
              points={metrics.momentum.map((m) => ({
                day: m.day,
                value: m.ordersPlusAppointments,
              }))}
            />
            <MomentumCard
              title="New customers"
              barClass="bg-purple-500"
              points={metrics.momentum.map((m) => ({
                day: m.day,
                value: m.newCustomers,
              }))}
            />
          </div>

          {/* ── v2: Upgrade candidates ───────────────────────────── */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              Upgrade candidates
            </h3>
            {metrics.upgradeCandidates.length === 0 ? (
              <p className="text-base text-gray-600 text-center py-4">None</p>
            ) : (
              metrics.upgradeCandidates.map((c) => (
                <Link
                  key={`${c.id}-${c.metric}`}
                  href={`/admin/businesses/${c.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 -mx-2 px-2 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="text-base font-medium text-white truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {METRIC_LABELS[c.metric] ?? c.metric}
                    </p>
                  </div>
                  <p className="text-base font-semibold text-white tabular-nums flex-shrink-0">
                    {c.current}
                    <span className="text-gray-500">/{c.limit}</span>
                  </p>
                </Link>
              ))
            )}
          </div>

          {/* ── v2: Composition ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-8">
            <CompositionCard title="By mode" entries={metrics.composition.byMode} />
            <CompositionCard
              title="By language"
              entries={metrics.composition.byLanguage}
            />
          </div>
        </>
      )}
    </AdminLayout>
  )
}
