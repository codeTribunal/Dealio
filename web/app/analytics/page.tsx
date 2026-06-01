'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/icons/Icon'
import { getAnalytics } from '@/lib/api'
import { formatUZS } from '@/lib/format'
import type { AnalyticsData } from '@/types'

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(() => {
    setLoading(true)
    setError(null)
    getAnalytics()
      .then((data) => {
        console.log('analytics response:', data)
        setData(data)
      })
      .catch(() => setError('failed'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return (
      <AuthLayout title="Analytics">
        <LoadingSpinner />
      </AuthLayout>
    )
  }

  if (error || !data) {
    return (
      <AuthLayout title="Analytics">
        <Card className="text-center">
          <p className="text-lg font-semibold text-text-1 mb-3">
            Could not load analytics
          </p>
          <Button variant="primary" onClick={fetchAnalytics}>
            Try again
          </Button>
        </Card>
      </AuthLayout>
    )
  }

  // Existing field mapping preserved verbatim — flagged in the report; do not
  // adjust here even if a value renders empty.
  const revenueThisMonth = data.revenueThisMonth ?? 0
  const revenueLastMonth = data.revenueLastMonth ?? 0
  const ordersThisMonth = data.ordersThisMonth ?? 0
  const completedThisMonth = data.completedThisMonth ?? 0
  const averageOrderValue = data.averageOrderValue ?? 0
  const pendingPaymentsTotal = data.pendingPaymentsTotal ?? 0
  const topCustomers = data.topCustomers ?? []
  const bestSellingProduct = data.bestSellingProduct ?? null

  const percentChange =
    revenueLastMonth > 0
      ? Math.round(
          ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        )
      : null

  // For the small token-bar comparison (revenue this vs last).
  const maxRev = Math.max(revenueThisMonth, revenueLastMonth, 1)
  const thisPct = Math.min(100, Math.round((revenueThisMonth / maxRev) * 100))
  const lastPct = Math.min(100, Math.round((revenueLastMonth / maxRev) * 100))

  return (
    <AuthLayout title="Analytics">
      {/* ── Top bento: 4 stat cards ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <StatCard
          label="Revenue this month"
          value={formatUZS(revenueThisMonth)}
          money
          delta={
            percentChange === null
              ? undefined
              : percentChange === 0
              ? { value: 'same as last month', positive: true }
              : {
                  value: `${Math.abs(percentChange)}% vs last month`,
                  positive: percentChange > 0,
                }
          }
        />
        <StatCard
          label="Orders this month"
          value={ordersThisMonth.toString()}
        />
        <StatCard
          label="Avg order value"
          value={formatUZS(averageOrderValue)}
          money
        />
        <StatCard
          label="Pending payments"
          value={formatUZS(pendingPaymentsTotal)}
          money
        />
      </div>

      {/* ── This vs last month comparison (token-styled bars) ──── */}
      <Card className="mb-6">
        <CardHeader title="Revenue: this month vs last" />
        <div className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-xs font-medium text-text-2">This month</p>
              <p className="text-xs font-semibold text-text-1 tabular-nums">
                {formatUZS(revenueThisMonth)}
              </p>
            </div>
            <div className="h-2 w-full rounded-pill bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-accent rounded-pill transition-all"
                style={{ width: `${thisPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-xs font-medium text-text-2">Last month</p>
              <p className="text-xs font-semibold text-text-1 tabular-nums">
                {formatUZS(revenueLastMonth)}
              </p>
            </div>
            <div className="h-2 w-full rounded-pill bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-border-strong rounded-pill transition-all"
                style={{ width: `${lastPct}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-text-3 pt-1">
            {completedThisMonth} completed this month
          </p>
        </div>
      </Card>

      {/* ── Bottom row: top customers + best selling ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Top customers" />
          <p className="text-xs text-text-3 mb-3">Last 90 days</p>

          {topCustomers.length === 0 ? (
            <p className="text-sm text-text-3 text-center py-8">
              No customer data yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {topCustomers.slice(0, 5).map((customer, index) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="w-5 text-sm font-bold text-text-3 flex-shrink-0 text-center tabular-nums">
                    {index + 1}
                  </span>
                  <Avatar name={customer.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-1 truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-text-2">
                      {customer.orderCount} order
                      {customer.orderCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-text-1 tabular-nums flex-shrink-0">
                    {formatUZS(customer.totalSpent)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Best selling" />

          {bestSellingProduct === null ? (
            <p className="text-sm text-text-3 text-center py-8">
              No sales data yet
            </p>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-accent-soft rounded-md">
              <div className="w-10 h-10 rounded-md bg-surface text-accent flex items-center justify-center flex-shrink-0">
                <Icon name="growth" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-1 truncate">
                  {bestSellingProduct.name}
                </p>
                <p className="text-xs text-text-2 mt-0.5 tabular-nums">
                  {bestSellingProduct.unitsSold} units sold
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AuthLayout>
  )
}
