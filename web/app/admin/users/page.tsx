'use client'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { getAdminUsers, AdminUser } from '@/lib/adminApi'
import { getInitials } from '@/lib/format'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout title="Admin users">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {loading && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-600">No admin users</p>
          </div>
        )}

        {!loading &&
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 px-5 py-4 border-b border-gray-800 last:border-b-0"
            >
              <div className="w-9 h-9 rounded-full bg-blue-900 text-blue-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.role === 'SUPER_ADMIN'
                    ? 'bg-purple-900 text-purple-300'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Support'}
              </span>
            </div>
          ))}
      </div>
    </AdminLayout>
  )
}
