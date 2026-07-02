'use client'
import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import {
  getPlatformSettings,
  updatePlatformSettings,
  getAdminRole,
} from '@/lib/adminApi'

/**
 * Platform settings — global, superadmin-controlled flags.
 *
 * The card-payments toggle is shown read-only to SUPPORT and is usable only by
 * SUPER_ADMIN. The backend ALSO enforces SUPER_ADMIN on PATCH, so hiding the
 * control here is defence-in-depth, not the security boundary.
 */
export default function AdminSettingsPage() {
  const [cardPaymentsEnabled, setCardPaymentsEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSuperAdmin = getAdminRole() === 'SUPER_ADMIN'

  useEffect(() => {
    getPlatformSettings()
      .then((s) => setCardPaymentsEnabled(s.cardPaymentsEnabled))
      .catch(() => setError('Could not load platform settings'))
      .finally(() => setLoading(false))
  }, [])

  async function toggle() {
    if (cardPaymentsEnabled === null || saving) return
    const next = !cardPaymentsEnabled
    setSaving(true)
    setError(null)
    setCardPaymentsEnabled(next) // optimistic
    try {
      const s = await updatePlatformSettings(next)
      setCardPaymentsEnabled(s.cardPaymentsEnabled)
    } catch {
      setCardPaymentsEnabled(!next) // revert
      setError('Could not update — Super Admin access required.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-900/50 text-blue-300 flex items-center justify-center flex-shrink-0">
              <CreditCard size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-white">Card payments</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Show card setup &amp; checkout display platform-wide. When off, the
                card-number/bank setup (onboarding &amp; Settings) and the bot
                checkout card display are hidden for every business. Payment
                tracking (&ldquo;I have paid&rdquo;, payment confirmation, reminders)
                is unaffected.
              </p>
            </div>

            {loading || cardPaymentsEnabled === null ? (
              <span className="text-xs text-gray-500 flex-shrink-0">Loading…</span>
            ) : isSuperAdmin ? (
              <button
                type="button"
                role="switch"
                aria-checked={cardPaymentsEnabled}
                disabled={saving}
                onClick={toggle}
                className={`w-12 h-7 rounded-full relative transition-colors flex-shrink-0 ${
                  cardPaymentsEnabled ? 'bg-blue-600' : 'bg-gray-700'
                } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                    cardPaymentsEnabled ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 flex-shrink-0">
                {cardPaymentsEnabled ? 'On' : 'Off'}
              </span>
            )}
          </div>

          {!isSuperAdmin && (
            <p className="text-xs text-gray-600 mt-4 border-t border-gray-800 pt-3">
              Only a Super Admin can change this setting.
            </p>
          )}
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        </div>
      </div>
    </AdminLayout>
  )
}
