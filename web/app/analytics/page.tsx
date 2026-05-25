'use client'
import { useState, useEffect, useCallback } from 'react'
import { Star } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getAnalytics } from '@/lib/api'
import { formatUZS, getInitials } from '@/lib/format'
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
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            Could not load analytics
          </p>
          <button
            onClick={fetchAnalytics}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </AuthLayout>
    )
  }

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

  return (
    <AuthLayout title="Analytics">
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Revenue this month</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatUZS(revenueThisMonth)}
          </p>
          {revenueLastMonth > 0 ? (
            percentChange === 0 ? (
              <p className="text-sm text-gray-500 mt-1">Same as last month</p>
            ) : percentChange !== null && percentChange > 0 ? (
              <p className="text-sm text-green-600 mt-1">
                ↑ {percentChange}% vs last month
              </p>
            ) : (
              <p className="text-sm text-red-600 mt-1">
                ↓ {Math.abs(percentChange!)}% vs last month
              </p>
            )
          ) : (
            <p className="text-sm text-gray-400 mt-1">No data last month</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Orders this month</p>
          <p className="text-2xl font-bold text-gray-900">
            {ordersThisMonth.toString()}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {completedThisMonth} completed
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Avg order value</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatUZS(averageOrderValue)}
          </p>
          <p className="text-sm text-gray-400 mt-1">per order</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Pending payments</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatUZS(pendingPaymentsTotal)}
          </p>
          <p className="text-sm text-gray-400 mt-1">awaiting confirmation</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Top customers</h3>
          <p className="text-xs text-gray-400 mb-4">Last 90 days</p>

          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No customer data yet
            </p>
          ) : (
            topCustomers.slice(0, 5).map((customer, index) => (
              <div
                key={customer.id}
                className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-b-0"
              >
                <span className="w-6 text-sm font-bold text-gray-400 flex-shrink-0">
                  {index + 1}
                </span>
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {getInitials(customer.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {customer.orderCount} order{customer.orderCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatUZS(customer.totalSpent)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Best selling</h3>

          {bestSellingProduct === null ? (
            <p className="text-sm text-gray-400 text-center py-4">No sales data yet</p>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {bestSellingProduct.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {bestSellingProduct.unitsSold} units sold
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
