'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Cookies from 'js-cookie'
import AdminLayout from '@/components/admin/AdminLayout'
import {
  AdminBusiness,
  getAdminBusiness,
  changePlan,
  suspendBusiness,
  unsuspendBusiness,
  impersonateBusiness,
  eraseBusiness,
  getAdminRole,
} from '@/lib/adminApi'
import { formatDate, getInitials } from '@/lib/format'
import BusinessDataManager from '@/components/admin/BusinessDataManager'

type RecentOrder = {
  id: string
  orderNumber: number
  total: number
  createdAt: string
}

type RecentCustomer = {
  id: string
  name: string
  createdAt: string
}

type BusinessDetail = AdminBusiness & {
  usageThisMonth: unknown
  recentOrders: RecentOrder[]
  recentCustomers: RecentCustomer[]
}

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

export default function AdminBusinessDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [business, setBusiness] = useState<BusinessDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [newPlan, setNewPlan] = useState('')
  const [planNote, setPlanNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [showEraseModal, setShowEraseModal] = useState(false)
  const [eraseConfirmText, setEraseConfirmText] = useState('')
  const [erasing, setErasing] = useState(false)
  const [eraseCounts, setEraseCounts] = useState<Record<string, number> | null>(null)
  const role = getAdminRole()

  useEffect(() => {
    getAdminBusiness(id)
      .then((data) => setBusiness(data as BusinessDetail))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const showSaved = (msg: string) => {
    setSavedMessage(msg)
    setTimeout(() => setSavedMessage(null), 3000)
  }

  const handleImpersonate = async () => {
    if (!business) return
    setImpersonating(true)
    try {
      const data = await impersonateBusiness(id)
      Cookies.set('crm_token', data.token, { expires: 1 / 96, sameSite: 'strict' })
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
      window.open(appUrl, '_blank')
      showSaved('Impersonation active (15 min)')
    } catch {
      showSaved('Failed to impersonate')
    } finally {
      setImpersonating(false)
    }
  }

  const handleUnsuspend = async () => {
    if (!business) return
    setSaving(true)
    try {
      const updated = await unsuspendBusiness(id)
      setBusiness((prev) => prev ? { ...prev, ...updated } : prev)
      showSaved('Business unsuspended')
    } finally {
      setSaving(false)
    }
  }

  const handleSuspend = async () => {
    if (!business) return
    setSaving(true)
    try {
      const updated = await suspendBusiness(id, suspendReason)
      setBusiness((prev) => prev ? { ...prev, ...updated } : prev)
      setShowSuspendModal(false)
      setSuspendReason('')
      showSaved('Business suspended')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePlan = async () => {
    if (!business || !newPlan) return
    setSaving(true)
    try {
      const updated = await changePlan(id, newPlan, planNote || undefined)
      setBusiness((prev) => prev ? { ...prev, ...updated } : prev)
      setShowPlanModal(false)
      setPlanNote('')
      showSaved('Plan updated')
    } finally {
      setSaving(false)
    }
  }

  const handleErase = async () => {
    if (!business || eraseConfirmText !== business.name) return
    setErasing(true)
    try {
      const res = await eraseBusiness(id)
      setEraseCounts(res.tableCounts)
    } catch {
      showSaved('Erase failed')
      setErasing(false)
    }
  }

  return (
    <AdminLayout title={business?.name || 'Business'}>
      {/* Saved message */}
      {savedMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-800 border border-green-700 text-green-200 text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {savedMessage}
        </div>
      )}

      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to businesses
      </button>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      )}

      {business && (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start mt-6">
          {/* Left column */}
          <div className="w-full lg:w-72 lg:flex-shrink-0 space-y-4">
            {/* Identity */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-blue-300 font-bold text-sm">
                  {getInitials(business.name)}
                </div>
                <div>
                  <p className="text-base font-bold text-white">
                    {business.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    @{business.botUsername || 'no bot'}
                  </p>
                </div>
              </div>

              {[
                { label: 'Owner phone', value: business.owner.phone },
                { label: 'Bot username', value: business.botUsername || '—' },
                { label: 'Language', value: business.language },
                { label: 'Created', value: formatDate(business.createdAt) },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between py-2 border-b border-gray-800 last:border-b-0"
                >
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xs text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Plan and status */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Plan
                </p>
                <PlanBadge plan={business.plan} />
              </div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Status
                </p>
                {business.suspendedAt ? (
                  <span className="text-xs text-red-400 font-medium">
                    Suspended
                  </span>
                ) : (
                  <span className="text-xs text-green-400 font-medium">
                    Active
                  </span>
                )}
              </div>
              {business.suspendedReason && (
                <p className="text-xs text-red-400 mt-2">
                  Reason: {business.suspendedReason}
                </p>
              )}
            </div>

            {/* Usage stats */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Usage
              </p>
              {[
                { label: 'Customers', value: business._count.customers },
                { label: 'Orders', value: business._count.orders },
                { label: 'Appointments', value: business._count.appointments },
                { label: 'Staff', value: business._count.staff },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xs font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Actions
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleImpersonate}
                  disabled={impersonating}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {impersonating ? 'Opening...' : 'View as owner'}
                </button>

                <button
                  onClick={() => {
                    setNewPlan(business.plan)
                    setShowPlanModal(true)
                  }}
                  className="w-full py-2.5 bg-gray-700 text-white rounded-xl text-xs font-semibold hover:bg-gray-600 transition-colors"
                >
                  Change plan
                </button>

                {!business.suspendedAt ? (
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    className="w-full py-2.5 border border-red-800 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-900/30 transition-colors"
                  >
                    Suspend business
                  </button>
                ) : (
                  <button
                    onClick={handleUnsuspend}
                    disabled={saving}
                    className="w-full py-2.5 bg-green-700 text-white rounded-xl text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    Unsuspend business
                  </button>
                )}
              </div>
            </div>

            {/* Danger zone — irreversible erasure (super-admin only) */}
            {role === 'SUPER_ADMIN' && (
              <div className="bg-gray-900 rounded-2xl border border-red-900/60 p-5">
                <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-semibold">
                  Danger zone
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Permanently erase this business and its owner account — all customers, orders,
                  appointments and projects. Irreversible (not a recoverable delete). The audit
                  record is kept.
                </p>
                <button
                  onClick={() => {
                    setEraseConfirmText('')
                    setEraseCounts(null)
                    setShowEraseModal(true)
                  }}
                  className="w-full py-2.5 bg-red-700 text-white rounded-xl text-xs font-bold hover:bg-red-800 transition-colors"
                >
                  Erase entire business
                </button>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex-1 min-w-0 space-y-4">
            <BusinessDataManager businessId={id} />
          </div>
        </div>
      )}

      {/* Suspend modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-white mb-2">
              Suspend business
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              The business owner will see this reason. Be professional.
            </p>
            <textarea
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension (min 10 characters)..."
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={suspendReason.length < 10 || saving}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Suspending...' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-white mb-4">
              Change plan
            </h3>
            <p className="text-sm text-gray-400 mb-2">
              Current plan: {business?.plan}
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { value: 'FREE', label: 'Free' },
                { value: 'PRO', label: 'Pro' },
                { value: 'BUSINESS', label: 'Business' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setNewPlan(value)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                    newPlan === value
                      ? 'bg-blue-600 text-white border-2 border-blue-500'
                      : 'bg-gray-800 text-gray-300 border-2 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={planNote}
              onChange={(e) => setPlanNote(e.target.value)}
              placeholder="Internal note (optional)..."
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePlan}
                disabled={!newPlan || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Erase (irreversible) modal */}
      {showEraseModal && business && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 rounded-2xl border border-red-800 p-6 w-full max-w-md">
            {eraseCounts ? (
              <>
                <h3 className="text-base font-bold text-white mb-2">Business erased</h3>
                <p className="text-sm text-gray-400 mb-3">Rows removed per table:</p>
                <div className="max-h-60 overflow-y-auto text-xs text-gray-300 mb-4 border border-gray-800 rounded-xl">
                  {Object.entries(eraseCounts).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between px-3 py-1.5 border-b border-gray-800 last:border-b-0"
                    >
                      <span className="text-gray-500">{k}</span>
                      <span className="text-white font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => router.replace('/admin/businesses')}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Back to businesses
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-red-400 mb-2">
                  Erase entire business
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                  This permanently deletes{' '}
                  <span className="text-white font-semibold">{business.name}</span>, its owner
                  account, and ALL of its data (customers, orders, appointments, projects). This
                  cannot be undone.
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Type the business name to confirm:
                </p>
                <input
                  value={eraseConfirmText}
                  onChange={(e) => setEraseConfirmText(e.target.value)}
                  placeholder={business.name}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEraseModal(false)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleErase}
                    disabled={erasing || eraseConfirmText !== business.name}
                    className="flex-1 px-4 py-2 bg-red-700 text-white rounded-xl text-sm font-bold hover:bg-red-800 disabled:opacity-40 transition-colors"
                  >
                    {erasing ? 'Erasing...' : 'Erase permanently'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
