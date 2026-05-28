'use client'
import { useEffect, useState } from 'react'
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
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
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
            <h3 className="text-sm font-semibold text-white mb-4">Plans</h3>
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
              <h3 className="text-sm font-semibold text-white mb-4">
                Recent signups
              </h3>
              {metrics.recentSignups.length === 0 && (
                <p className="text-sm text-gray-600 text-center py-4">
                  No recent signups
                </p>
              )}
              {metrics.recentSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
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
              <h3 className="text-sm font-semibold text-white mb-4">
                Recent suspensions
              </h3>
              {metrics.recentSuspensions.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-4">
                  No suspensions
                </p>
              ) : (
                metrics.recentSuspensions.map((s) => (
                  <div
                    key={s.id}
                    className="py-2.5 border-b border-gray-800 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-red-400 mt-0.5 truncate">
                      {s.suspendedReason}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
