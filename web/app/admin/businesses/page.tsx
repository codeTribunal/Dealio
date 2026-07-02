'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { getAdminBusinesses, AdminBusiness } from '@/lib/adminApi'
import { formatRelativeTime } from '@/lib/format'

const LIMIT = 20

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

export default function AdminBusinessesPage() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  const fetchBusinesses = useCallback(
    async (searchVal: string, plan: string, status: string, p: number) => {
      setLoading(true)
      try {
        const result = await getAdminBusinesses({
          search: searchVal || undefined,
          plan: plan !== 'ALL' ? plan : undefined,
          status: status !== 'ALL' ? status : undefined,
          page: p,
          limit: LIMIT,
        })
        setBusinesses(result.data)
        setTotal(result.total)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBusinesses(search, planFilter, statusFilter, page)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, planFilter, statusFilter, page, fetchBusinesses])

  const handleFilterChange = (type: 'plan' | 'status', value: string) => {
    setPage(1)
    if (type === 'plan') setPlanFilter(value)
    else setStatusFilter(value)
  }

  const filterBtn = (active: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  )

  return (
    <AdminLayout title="Businesses">
      {/* Top section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Businesses</h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search businesses..."
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-base text-white placeholder-gray-600 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['ALL', 'FREE', 'PRO', 'BUSINESS'].map((p) =>
          filterBtn(planFilter === p, p, () => handleFilterChange('plan', p))
        )}
        <div className="w-px bg-gray-700 mx-1 hidden sm:block" />
        {['ALL', 'ACTIVE', 'SUSPENDED'].map((s) =>
          filterBtn(statusFilter === s, s, () =>
            handleFilterChange('status', s)
          )
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {/* Desktop header — hidden on mobile */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-4">Business</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Customers</div>
          <div className="col-span-2">Created</div>
        </div>

        {loading && (
          <div className="px-5 py-8 text-center">
            <p className="text-base text-gray-500">Loading...</p>
          </div>
        )}

        {!loading && businesses.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-base text-gray-600">No businesses found</p>
          </div>
        )}

        {!loading &&
          businesses.map((business) => (
            <div key={business.id}>
              {/* Mobile card */}
              <div
                className="block lg:hidden px-4 py-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer last:border-b-0"
                onClick={() =>
                  router.push(`/admin/businesses/${business.id}`)
                }
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {business.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      @{business.botUsername || 'no bot'}
                    </p>
                  </div>
                  <PlanBadge plan={business.plan} />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        business.suspendedAt ? 'bg-red-400' : 'bg-green-400'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        business.suspendedAt
                          ? 'text-red-400'
                          : 'text-green-400'
                      }`}
                    >
                      {business.suspendedAt ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {business._count.customers} customers
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(business.createdAt)}
                  </p>
                </div>
              </div>

              {/* Desktop row */}
              <div
                className="hidden lg:grid grid-cols-12 gap-4 px-5 py-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors items-center cursor-pointer last:border-b-0"
                onClick={() =>
                  router.push(`/admin/businesses/${business.id}`)
                }
              >
                <div className="col-span-4">
                  <p className="text-base font-semibold text-white">
                    {business.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    @{business.botUsername || 'no bot'}
                  </p>
                </div>
                <div className="col-span-2">
                  <PlanBadge plan={business.plan} />
                </div>
                <div className="col-span-2">
                  {business.suspendedAt ? (
                    <span className="text-xs font-medium text-red-400">
                      Suspended
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-green-400">
                      Active
                    </span>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-base text-gray-300">
                    {business._count.customers}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-base text-gray-500">
                    {formatRelativeTime(business.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}{' '}
              of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * LIMIT >= total}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
