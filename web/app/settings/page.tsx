'use client'
import { useState, useEffect } from 'react'
import { Copy, CheckCircle } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { getBusiness, updateBusiness, updatePaymentMethod } from '@/lib/api'
import type { Business } from '@/types'

function formatCardNumber(raw: string): string {
  return raw.replace(/(.{4})/g, '$1 ').trim()
}

function Toggle({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
        active ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          active ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </div>
  )
}

const inputClass =
  'w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

const btnSave =
  'bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors'

const btnCancel =
  'border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors'

const btnActive = 'bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors'
const btnInactive = 'border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors'

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const [editingProfile, setEditingProfile] = useState(false)
  const [editingPayment, setEditingPayment] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('UZBEK')

  const [cardNumber, setCardNumber] = useState('')
  const [cardBank, setCardBank] = useState('UZCARD')

  const [modes, setModes] = useState<string[]>([])

  function fetchBusiness() {
    setLoading(true)
    setError(null)
    getBusiness()
      .then((data) => {
        setBusiness(data)
        setName(data.name)
        setDescription(data.description || '')
        setLanguage(data.language)
        setCardNumber(data.cardNumber || '')
        setCardBank(data.cardBank || 'UZCARD')
        setModes(data.mode)
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBusiness()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showSaved(message: string) {
    setSavedMessage(message)
    setTimeout(() => setSavedMessage(null), 3000)
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const updated = await updateBusiness({ name, description, language })
      setBusiness(updated)
      setEditingProfile(false)
      showSaved('Profile saved')
    } finally {
      setSaving(false)
    }
  }

  async function savePayment() {
    setSaving(true)
    try {
      const updated = await updatePaymentMethod({ cardNumber, cardBank })
      setBusiness(updated)
      setEditingPayment(false)
      showSaved('Payment method saved')
    } finally {
      setSaving(false)
    }
  }

  async function toggleMode(mode: string) {
    if (!business) return
    const isActive = modes.includes(mode)
    if (isActive && modes.length === 1) return
    const newModes = isActive
      ? modes.filter((m) => m !== mode)
      : [...modes, mode]
    setModes(newModes)
    const updated = await updateBusiness({ mode: newModes })
    setBusiness(updated)
  }

  if (loading) {
    return (
      <AuthLayout title="Settings">
        <LoadingSpinner />
      </AuthLayout>
    )
  }

  if (error || !business) {
    return (
      <AuthLayout title="Settings">
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load settings
          </p>
          <button
            onClick={fetchBusiness}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Settings">
      <div className="max-w-2xl space-y-6">

        {/* Business Profile */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Business profile</h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {!editingProfile ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <p className="text-sm text-gray-600">Business name</p>
                <p className="text-sm font-medium text-gray-900">{business.name}</p>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-sm font-medium text-gray-900">
                  {business.description || '—'}
                </p>
              </div>
              <div className="flex justify-between items-center py-2">
                <p className="text-sm text-gray-600">Language</p>
                <p className="text-sm font-medium text-gray-900">
                  {business.language === 'UZBEK' ? "O'zbek" : 'Русский'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Business name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Language
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setLanguage('UZBEK')}
                    className={language === 'UZBEK' ? btnActive : btnInactive}
                  >
                    O&apos;zbek
                  </button>
                  <button
                    onClick={() => setLanguage('RUSSIAN')}
                    className={language === 'RUSSIAN' ? btnActive : btnInactive}
                  >
                    Русский
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className={btnSave}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setName(business.name)
                    setDescription(business.description || '')
                    setLanguage(business.language)
                    setEditingProfile(false)
                  }}
                  className={btnCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Business Mode */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Business mode</h2>
          <p className="text-sm text-gray-500 mb-4">
            Select which features are active for your business.
          </p>

          {[
            {
              value: 'PRODUCTS',
              title: 'Product selling',
              subtitle: 'Sell products via Telegram bot',
            },
            {
              value: 'SERVICES',
              title: 'Services & appointments',
              subtitle: 'Accept bookings and manage calendar',
            },
            {
              value: 'FREELANCE',
              title: 'Freelance projects',
              subtitle: 'Track projects, milestones, invoices',
            },
          ].map(({ value, title, subtitle }) => (
            <div
              key={value}
              className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
              </div>
              <Toggle
                active={modes.includes(value)}
                onClick={() => toggleMode(value)}
              />
            </div>
          ))}
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Payment method</h2>
            {!editingPayment && (
              <button
                onClick={() => setEditingPayment(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {!editingPayment ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <p className="text-sm text-gray-600">Card number</p>
                <p className="text-sm font-medium text-gray-900 font-mono">
                  {business.cardNumber
                    ? formatCardNumber(business.cardNumber)
                    : '—'}
                </p>
              </div>
              <div className="flex justify-between items-center py-2">
                <p className="text-sm text-gray-600">Bank</p>
                <p className="text-sm font-medium text-gray-900">
                  {business.cardBank === 'UZCARD'
                    ? 'Uzcard'
                    : business.cardBank === 'HUMO'
                    ? 'Humo'
                    : '—'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Card number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={16}
                  placeholder="8600123456781234"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Bank
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCardBank('UZCARD')}
                    className={cardBank === 'UZCARD' ? btnActive : btnInactive}
                  >
                    Uzcard
                  </button>
                  <button
                    onClick={() => setCardBank('HUMO')}
                    className={cardBank === 'HUMO' ? btnActive : btnInactive}
                  >
                    Humo
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={savePayment}
                  disabled={saving}
                  className={btnSave}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setCardNumber(business.cardNumber || '')
                    setCardBank(business.cardBank || 'UZCARD')
                    setEditingPayment(false)
                  }}
                  className={btnCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Telegram Bot */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Telegram bot</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <p className="text-sm text-gray-600">Bot username</p>
              <p className="text-sm font-medium text-gray-900">
                {business.botUsername
                  ? `@${business.botUsername}`
                  : 'Not configured'}
              </p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-sm text-gray-600">Bot link</p>
              {business.botUsername ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-blue-600 font-medium">
                    https://t.me/{business.botUsername}
                  </p>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `https://t.me/${business.botUsername}`
                      )
                    }
                  >
                    <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span>{savedMessage}</span>
        </div>
      )}
    </AuthLayout>
  )
}
