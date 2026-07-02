'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthLayout from '@/components/AuthLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { Icon } from '@/components/icons/Icon'
import { getAnalytics } from '@/lib/api'
import { formatUZS, formatMonthShort } from '@/lib/format'
import { useBusiness } from '@/lib/businessContext'
import { useI18n } from '@/lib/i18n/i18nContext'
import { shouldShowEmailPrompt } from '@/lib/emailPrompt'
import EmailCaptureCard from '@/components/EmailCaptureCard'
import type { AnalyticsData } from '@/types'

// 'YYYY-MM' → localized short month label.
function monthLabel(ym: string): string {
  const [, m] = ym.split('-').map(Number)
  if (!m) return ''
  return formatMonthShort(m - 1)
}

export default function AnalyticsPage() {
  const { business } = useBusiness()
  const { t } = useI18n()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(() => {
    setLoading(true)
    setError(null)
    getAnalytics()
      .then(setData)
      .catch(() => setError('failed'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return (
      <AuthLayout title={t('nav.analytics')}>
        <div
          className="max-w-2xl w-full space-y-4"
          aria-busy="true"
          aria-label={t('analytics.loading')}
        >
          <Skeleton className="h-40 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </AuthLayout>
    )
  }

  if (error || !data) {
    return (
      <AuthLayout title={t('nav.analytics')}>
        <Card className="text-center">
          <p className="text-lg font-semibold text-text-1 mb-3">
            {t('analytics.failedLoad')}
          </p>
          <Button variant="primary" onClick={fetchAnalytics}>
            {t('common.tryAgain')}
          </Button>
        </Card>
      </AuthLayout>
    )
  }

  const revenueThisMonth = data.revenueThisMonth ?? 0
  const revenueLastMonth = data.revenueLastMonth ?? 0
  const completedThisMonth = data.completedThisMonth ?? 0
  const appointmentsThisMonth = data.appointmentsThisMonth ?? 0
  const pendingPaymentsTotal = data.pendingPaymentsTotal ?? 0
  const topCustomers = data.topCustomers ?? []
  const trend = data.revenueTrend ?? []
  const hasPending = pendingPaymentsTotal > 0
  // Mode-aware presentation: appointment wording/cards only for SERVICES.
  // PRODUCTS/FREELANCE omit the appointments card and appointment-specific
  // labels (revenue/completed/top-customer math is unchanged).
  const isServices = (business?.mode ?? 'SERVICES') === 'SERVICES'

  const percentChange =
    revenueLastMonth > 0
      ? Math.round(
          ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100,
        )
      : null

  // Comparison bars (revenue this vs last).
  const maxRev = Math.max(revenueThisMonth, revenueLastMonth, 1)
  const thisPct = Math.min(100, Math.round((revenueThisMonth / maxRev) * 100))
  const lastPct = Math.min(100, Math.round((revenueLastMonth / maxRev) * 100))

  // Sparkline + top-customer bar scales.
  const maxTrend = Math.max(...trend.map((p) => p.revenue), 1)
  const maxSpent = Math.max(...topCustomers.map((c) => c.totalSpent), 1)

  const heroSub =
    percentChange === null
      ? t('analytics.noLastMonth')
      : t('analytics.vsLastMonth', { amount: formatUZS(revenueLastMonth) })

  return (
    <AuthLayout title={t('nav.analytics')}>
      <div className="max-w-2xl w-full space-y-4">
        {/* Dismissible email capture — never gates the analytics below. */}
        {shouldShowEmailPrompt(business) && <EmailCaptureCard />}

        {/* Premium revenue hero — accent fill, delta chip, 6-month sparkline. */}
        <div className="relative overflow-hidden rounded-xl bg-accent-active dark:bg-accent text-accent-on p-5 shadow-accent">
          {/* Faint corner glow (inherits accent-on via currentColor). */}
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full"
            style={{ backgroundColor: 'currentColor', opacity: 0.1 }}
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs uppercase tracking-wide">
                {t('home.revenueLabel')}
              </p>
              {percentChange !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-bold ${
                    percentChange >= 0
                      ? 'bg-accent-on text-accent-active'
                      : 'bg-error-soft text-error-strong'
                  }`}
                >
                  <span aria-hidden>{percentChange >= 0 ? '↑' : '↓'}</span>
                  {Math.abs(percentChange)}%
                </span>
              )}
            </div>
            <p
              className="tabular-nums font-extrabold mt-2"
              style={{ fontSize: 'var(--fs-h1)', lineHeight: 1.05 }}
            >
              {formatUZS(revenueThisMonth)}
            </p>
            <p className="text-sm mt-1">{heroSub}</p>

            {trend.length > 1 && (
              <div className="mt-5">
                <div className="flex items-end gap-1.5" style={{ height: 48 }}>
                  {trend.map((pt, i) => {
                    const h =
                      maxTrend > 0
                        ? Math.max(8, Math.round((pt.revenue / maxTrend) * 100))
                        : 8
                    const current = i === trend.length - 1
                    return (
                      <div
                        key={pt.month}
                        className="flex-1 rounded-t-[3px]"
                        style={{
                          height: `${h}%`,
                          backgroundColor: 'currentColor',
                          opacity: current ? 1 : 0.35,
                        }}
                        title={`${monthLabel(pt.month)}: ${formatUZS(pt.revenue)}`}
                      />
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span>{monthLabel(trend[0].month)}</span>
                  <span>{t('analytics.lastSixMonths')}</span>
                  <span>{monthLabel(trend[trend.length - 1].month)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Completed (+ Appointments for SERVICES only), iconized */}
        {isServices ? (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label={t('analytics.completedThisMonth')}
              value={completedThisMonth.toString()}
              icon="paid"
            />
            <StatCard
              label={t('analytics.appointmentsThisMonth')}
              value={appointmentsThisMonth.toString()}
              icon="calendar"
            />
          </div>
        ) : (
          <StatCard
            label={t('analytics.completedThisMonth')}
            value={completedThisMonth.toString()}
            icon="paid"
          />
        )}

        {/* Pending payments */}
        <Card>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                hasPending
                  ? 'bg-warning-soft text-warning-strong'
                  : 'bg-surface-2 text-text-3'
              }`}
            >
              <Icon name="pending" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-2">{t('home.statPending')}</p>
              <p
                className={`text-base font-bold tabular-nums ${
                  hasPending ? 'text-warning-strong' : 'text-text-3'
                }`}
              >
                {hasPending
                  ? formatUZS(pendingPaymentsTotal)
                  : t('analytics.allPaymentsReceived')}
              </p>
            </div>
          </div>
        </Card>

        {/* Revenue: this vs last month */}
        <Card>
          <CardHeader title={t('analytics.revenueComparison')} />
          <div className="space-y-3">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-xs font-medium text-text-2">
                  {t('analytics.thisMonth')}
                </p>
                <p className="text-xs font-semibold text-text-1 tabular-nums">
                  {formatUZS(revenueThisMonth)}
                </p>
              </div>
              <div className="h-2 w-full rounded-pill bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-pill"
                  style={{
                    transform: `scaleX(${thisPct / 100})`,
                    transformOrigin: 'left',
                    transition: 'transform var(--dur-base) var(--ease)',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-xs font-medium text-text-2">
                  {t('analytics.lastMonth')}
                </p>
                <p className="text-xs font-semibold text-text-1 tabular-nums">
                  {formatUZS(revenueLastMonth)}
                </p>
              </div>
              <div className="h-2 w-full rounded-pill bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-border-strong rounded-pill"
                  style={{
                    transform: `scaleX(${lastPct / 100})`,
                    transformOrigin: 'left',
                    transition: 'transform var(--dur-base) var(--ease)',
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-text-3 pt-1">
              {t('home.revenueSubCompleted', { count: completedThisMonth })}
            </p>
          </div>
        </Card>

        {/* Top customers — ranked with spend bars */}
        <Card>
          <CardHeader title={t('analytics.topCustomers')} />
          <p className="text-xs text-text-3 mb-3">
            {t('analytics.lastNinetyDays')}
          </p>

          {topCustomers.length === 0 ? (
            <p className="text-base text-text-3 text-center py-8">
              {t('analytics.emptyTopCustomers')}
            </p>
          ) : (
            <div className="space-y-3.5">
              {topCustomers.slice(0, 5).map((customer, index) => {
                const pct = Math.max(
                  4,
                  Math.round((customer.totalSpent / maxSpent) * 100),
                )
                const isTop = index === 0
                return (
                  <div key={customer.id} className="flex items-center gap-3">
                    <span
                      className={`w-5 text-center text-sm font-bold tabular-nums flex-shrink-0 ${
                        isTop ? 'text-accent' : 'text-text-3'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <Avatar name={customer.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-base font-semibold text-text-1 truncate">
                          {customer.name}
                        </p>
                        <p className="text-base font-semibold text-text-1 tabular-nums flex-shrink-0">
                          {formatUZS(customer.totalSpent)}
                        </p>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-pill bg-surface-2 overflow-hidden">
                        <div
                          className={`h-full rounded-pill ${isTop ? 'bg-accent' : 'bg-border-strong'}`}
                          style={{
                            transform: `scaleX(${pct / 100})`,
                            transformOrigin: 'left',
                            transition: 'transform var(--dur-base) var(--ease)',
                          }}
                        />
                      </div>
                      {isServices && (
                        <p className="text-xs text-text-2 mt-1">
                          {t('analytics.appointmentCount', {
                            n: customer.appointmentCount,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </AuthLayout>
  )
}
