'use client'
import { useState, useEffect } from 'react'
import { Users, Search } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import CustomerCard from '@/components/CustomerCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getCustomers } from '@/lib/api'
import type { Customer } from '@/types'

const LIMIT = 30

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      getCustomers({ search, page, limit: LIMIT })
        .then((data) => {
          setCustomers(data.customers)
          setTotal(data.total)
        })
        .catch(() => setError('Failed to load customers'))
        .finally(() => setLoading(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [search, page])

  return (
    <AuthLayout title="Customers">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total customers</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, phone or @handle"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-4">Customer</div>
          <div className="col-span-2">Orders</div>
          <div className="col-span-3">Total spent</div>
          <div className="col-span-3">Last active</div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-sm text-red-600 p-6">
            {error}
            <button
              className="text-sm text-blue-600 ml-2"
              onClick={() => {
                setError(null)
                setLoading(true)
              }}
            >
              Try again
            </button>
          </p>
        ) : (customers ?? []).length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              {search ? 'No customers match your search' : 'No customers yet'}
            </p>
          </div>
        ) : (
          (customers ?? []).map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))
        )}
      </div>

      {total > LIMIT && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page * LIMIT >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
