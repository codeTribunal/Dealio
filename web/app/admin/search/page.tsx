'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { adminSearch, SearchResponse } from '@/lib/adminApi'

const LIMIT = 20

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>{children}</span>
  )
}

export default function AdminSearchPage() {
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | 'business' | 'customer'>('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const trimmed = q.trim()

  const run = useCallback(async () => {
    if (trimmed.length < 2) {
      setData(null)
      return
    }
    setLoading(true)
    try {
      const res = await adminSearch({ q: trimmed, type, page, limit: LIMIT, includeDeleted: showDeleted })
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [trimmed, type, page, showDeleted])

  useEffect(() => {
    const t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [run])

  const tooShort = trimmed.length === 1
  const filterBtn = (active: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  )

  return (
    <AdminLayout title="Search">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Global search</h1>
        <p className="text-sm text-gray-500">Businesses and customers across every tenant</p>
      </div>

      {/* Search box */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          autoFocus
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          placeholder="Search by name, phone, or @handle..."
          className="pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-base text-white placeholder-gray-600 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {filterBtn(type === 'all', 'All', () => {
          setType('all')
          setPage(1)
        })}
        {filterBtn(type === 'business', 'Businesses', () => {
          setType('business')
          setPage(1)
        })}
        {filterBtn(type === 'customer', 'Customers', () => {
          setType('customer')
          setPage(1)
        })}
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => {
              setShowDeleted(e.target.checked)
              setPage(1)
            }}
            className="accent-blue-600"
          />
          Show deleted
        </label>
      </div>

      {/* States */}
      {tooShort && <p className="text-base text-gray-500 px-1">Type at least 2 characters.</p>}

      {!tooShort && trimmed.length < 2 && (
        <p className="text-base text-gray-600 px-1">Start typing to search.</p>
      )}

      {trimmed.length >= 2 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {loading && <div className="px-5 py-8 text-center text-base text-gray-500">Searching...</div>}

          {!loading && data && data.items.length === 0 && (
            <div className="px-5 py-8 text-center text-base text-gray-600">No results for “{trimmed}”</div>
          )}

          {!loading && data && data.items.length > 0 && (
            <>
              <div className="px-5 py-2.5 bg-gray-800/60 border-b border-gray-700 text-xs text-gray-500">
                {data.counts.businesses} businesses · {data.counts.customers} customers
              </div>
              {data.items.map((item) =>
                item.kind === 'business' ? (
                  <Link
                    key={`b-${item.id}`}
                    href={`/admin/businesses/${item.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge color="bg-blue-900 text-blue-300">Business</Badge>
                        <p className="text-base font-semibold text-white truncate">{item.name}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.ownerPhone} · {item.plan} ·{' '}
                        <span className={item.status === 'suspended' ? 'text-red-400' : 'text-green-400'}>
                          {item.status}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs text-blue-400 flex-shrink-0">Open</span>
                  </Link>
                ) : (
                  <Link
                    key={`c-${item.id}`}
                    href={`/admin/businesses/${item.businessId}?tab=customers&customer=${item.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge color="bg-gray-700 text-gray-300">Customer</Badge>
                        <p className="text-base font-semibold text-white truncate">{item.name}</p>
                        {item.anonymizedAt && <Badge color="bg-purple-900 text-purple-300">Erased</Badge>}
                        {item.deleted && <Badge color="bg-red-900 text-red-300">Deleted</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {item.phone || '—'}
                        {item.telegramUsername ? ` · @${item.telegramUsername}` : ''} · in{' '}
                        <span className="text-gray-400">{item.businessName}</span>
                      </p>
                    </div>
                    <span className="text-xs text-blue-400 flex-shrink-0">Open</span>
                  </Link>
                )
              )}

              {data.total > LIMIT && (
                <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} of {data.total}
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
                      disabled={page * LIMIT >= data.total}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </AdminLayout>
  )
}
