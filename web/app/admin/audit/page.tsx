'use client'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { getAuditLog, AuditEntry } from '@/lib/adminApi'
import { formatDateTime } from '@/lib/format'

const LIMIT = 50

function getActionBadge(action: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    SUSPEND_BUSINESS: { label: 'Suspend', className: 'bg-red-900 text-red-300' },
    UNSUSPEND_BUSINESS: { label: 'Unsuspend', className: 'bg-green-900 text-green-300' },
    CHANGE_PLAN: { label: 'Change plan', className: 'bg-blue-900 text-blue-300' },
    IMPERSONATE_BUSINESS: { label: 'Impersonate', className: 'bg-yellow-900 text-yellow-300' },
    CREATE_ADMIN_USER: { label: 'Create admin', className: 'bg-purple-900 text-purple-300' },
  }
  return map[action] || { label: action, className: 'bg-gray-700 text-gray-300' }
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    getAuditLog({ page, limit: LIMIT })
      .then((result) => {
        setEntries(result.data)
        setTotal(result.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  return (
    <AdminLayout title="Audit log">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {/* Desktop header — hidden on mobile */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">Time</div>
          <div className="col-span-2">Admin</div>
          <div className="col-span-3">Action</div>
          <div className="col-span-3">Target</div>
          <div className="col-span-2">IP</div>
        </div>

        {loading && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-600">No audit entries</p>
          </div>
        )}

        {!loading &&
          entries.map((entry) => {
            const badge = getActionBadge(entry.action)
            return (
              <div key={entry.id}>
                {/* Mobile card */}
                <div className="lg:hidden px-4 py-4 border-b border-gray-800 last:border-b-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {entry.adminUser.name}
                    {entry.ipAddress ? ` • ${entry.ipAddress}` : ''}
                  </p>
                  <p className="text-xs text-gray-600 truncate mt-0.5">
                    {entry.targetId}
                  </p>
                </div>

                {/* Desktop row */}
                <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-gray-800 last:border-b-0 items-center">
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-white">
                      {entry.adminUser.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.adminUser.email}
                    </p>
                  </div>
                  <div className="col-span-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <p className="text-xs text-gray-400 truncate">
                      {entry.targetId.slice(0, 20)}
                      {entry.targetId.length > 20 ? '…' : ''}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">
                      {entry.ipAddress || '—'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}

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
