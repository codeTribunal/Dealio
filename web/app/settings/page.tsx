'use client'
import { useState, useEffect } from 'react'
import { Copy, CheckCircle, Calendar } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  getBusiness,
  updateBusiness,
  updatePaymentMethod,
  generateCalendarToken,
  disableCalendarSync,
  getReminderSettings,
  updateReminderSettings,
  type ReminderSettings,
} from '@/lib/api'
import { useBusiness } from '@/lib/businessContext'
import { useI18n, codeToEnum, type Locale } from '@/lib/i18n/i18nContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import type { Business } from '@/types'

function formatCardNumber(raw: string): string {
  return raw.replace(/(.{4})/g, '$1 ').trim()
}

type TFn = (key: string, params?: Record<string, string | number>) => string

function timingLabel(t: TFn, hours: number): string {
  if (hours < 24) {
    return hours === 1 ? t('settings.hourBefore') : t('settings.hoursBefore', { count: hours })
  }
  const days = Math.floor(hours / 24)
  return days === 1 ? t('settings.dayBefore') : t('settings.daysBefore', { count: days })
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

// Public base URL for ICS feeds — the API root without the /api/v1 prefix.
const calendarBaseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')

export default function SettingsPage() {
  const { refetch: refetchContext } = useBusiness()
  const { t, setLocale } = useI18n()
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

  const [calendarToken, setCalendarToken] = useState<string | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)

  const [reminderSettings, setReminderSettings] =
    useState<ReminderSettings | null>(null)

  const calendarUrl = calendarToken
    ? `${calendarBaseUrl}/calendar/${calendarToken}.ics`
    : ''

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
        setCalendarToken(data.calendarToken || null)
      })
      .catch(() => setError(t('settings.failedLoad')))
      .finally(() => setLoading(false))
  }

  // 3-language selector: update UI immediately, persist business.language for the bot.
  async function selectLanguage(code: Locale) {
    const enumVal = codeToEnum(code)
    setLocale(code)
    setLanguage(enumVal)
    try {
      const updated = await updateBusiness({ language: enumVal })
      setBusiness(updated)
      await refetchContext()
    } catch {
      showSaved(t('common.errorGeneric'))
    }
  }

  useEffect(() => {
    fetchBusiness()
    getReminderSettings().then(setReminderSettings).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updateReminder(
    key: keyof ReminderSettings,
    value: boolean | number
  ) {
    if (!reminderSettings) return
    const previous = reminderSettings
    setReminderSettings({ ...reminderSettings, [key]: value })
    try {
      await updateReminderSettings({ [key]: value })
    } catch {
      setReminderSettings(previous)
      showSaved(t('settings.reminderSaveFailed'))
    }
  }

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
      showSaved(t('settings.profileSaved'))
      await refetchContext()
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
      showSaved(t('settings.paymentSaved'))
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleCalendar(enable: boolean) {
    setCalendarLoading(true)
    try {
      if (enable) {
        const token = await generateCalendarToken()
        setCalendarToken(token)
      } else {
        await disableCalendarSync()
        setCalendarToken(null)
      }
      await refetchContext()
    } catch {
      showSaved(t('settings.calendarFailed'))
    } finally {
      setCalendarLoading(false)
    }
  }

  function handleCopyCalendarUrl() {
    navigator.clipboard.writeText(calendarUrl)
    showSaved(t('settings.calendarCopied'))
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
    await refetchContext()
  }

  if (loading) {
    return (
      <AuthLayout title={t('settings.title')}>
        <LoadingSpinner />
      </AuthLayout>
    )
  }

  if (error || !business) {
    return (
      <AuthLayout title={t('settings.title')}>
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            {t('settings.failedLoad')}
          </p>
          <button
            onClick={fetchBusiness}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('settings.title')}>
      <div className="max-w-2xl w-full space-y-6">

        {/* Business Profile */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">{t('settings.businessProfile')}</h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('common.edit')}
              </button>
            )}
          </div>

          {!editingProfile ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <p className="text-sm text-gray-600">{t('settings.businessName')}</p>
                <p className="text-sm font-medium text-gray-900">{business.name}</p>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <p className="text-sm text-gray-600">{t('settings.description')}</p>
                <p className="text-sm font-medium text-gray-900">
                  {business.description || '—'}
                </p>
              </div>
              <div className="flex justify-between items-center py-2">
                <p className="text-sm text-gray-600">{t('settings.language')}</p>
                <p className="text-sm font-medium text-gray-900">
                  {business.language === 'UZBEK'
                    ? "O'zbek"
                    : business.language === 'ENGLISH'
                    ? 'English'
                    : 'Русский'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {t('settings.businessName')}
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
                  {t('settings.description')}
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
                  {t('settings.language')}
                </label>
                <LanguageSwitcher onChange={selectLanguage} />
                <p className="text-xs text-gray-400 mt-2">{t('settings.languageHint')}</p>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className={btnSave}
                >
                  {t('common.save')}
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
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Business Mode */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('settings.businessMode')}</h2>
          <p className="text-sm text-gray-500 mb-4">
            {t('settings.businessModeHint')}
          </p>

          {[
            {
              value: 'PRODUCTS',
              title: t('settings.modeProductsTitle'),
              subtitle: t('settings.modeProductsSubtitle'),
            },
            {
              value: 'SERVICES',
              title: t('settings.modeServicesTitle'),
              subtitle: t('settings.modeServicesSubtitle'),
            },
            {
              value: 'FREELANCE',
              title: t('settings.modeFreelanceTitle'),
              subtitle: t('settings.modeFreelanceSubtitle'),
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
            <h2 className="text-base font-semibold text-gray-900">{t('settings.paymentMethod')}</h2>
            {!editingPayment && (
              <button
                onClick={() => setEditingPayment(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('common.edit')}
              </button>
            )}
          </div>

          {!editingPayment ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <p className="text-sm text-gray-600">{t('settings.cardNumber')}</p>
                <p className="text-sm font-medium text-gray-900 font-mono">
                  {business.cardNumber
                    ? formatCardNumber(business.cardNumber)
                    : '—'}
                </p>
              </div>
              <div className="flex justify-between items-center py-2">
                <p className="text-sm text-gray-600">{t('settings.bank')}</p>
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
                  {t('settings.cardNumber')}
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
                  {t('settings.bank')}
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
                  {t('common.save')}
                </button>
                <button
                  onClick={() => {
                    setCardNumber(business.cardNumber || '')
                    setCardBank(business.cardBank || 'UZCARD')
                    setEditingPayment(false)
                  }}
                  className={btnCancel}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Calendar sync */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">{t('settings.calendarSync')}</h2>
          <p className="text-sm text-gray-500 mb-5">
            {t('settings.calendarSyncHint')}
          </p>

          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">{t('settings.syncToCalendar')}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('settings.calendarWorksWith')}
              </p>
            </div>
            <div className={calendarLoading ? 'opacity-50 pointer-events-none' : ''}>
              <Toggle
                active={!!calendarToken}
                onClick={() => handleToggleCalendar(!calendarToken)}
              />
            </div>
          </div>

          {calendarToken && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  {t('settings.calendarLink')}
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl">
                  <span className="flex-1 text-xs text-gray-600 font-mono truncate">
                    {calendarUrl}
                  </span>
                  <button
                    onClick={handleCopyCalendarUrl}
                    className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={`https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(calendarUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  {t('settings.addGoogle')}
                </a>
                <a
                  href={calendarUrl.replace(/^https?:\/\//, 'webcal://')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  {t('settings.addApple')}
                </a>
              </div>

              <p className="text-xs text-gray-400">
                {t('settings.samsungNote')}
              </p>
            </div>
          )}
        </div>

        {/* Reminders */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">{t('settings.reminders')}</h2>
          <p className="text-sm text-gray-500 mb-5">
            {t('settings.remindersHint')}
          </p>

          {reminderSettings && (
            <div className="space-y-1 divide-y divide-gray-100">
              {/* SERVICES → appointment reminders */}
              {business.mode.includes('SERVICES') && (
                <ReminderRow
                  t={t}
                  title={t('settings.reminderApptTitle')}
                  subtitle={t('settings.reminderApptSubtitle')}
                  enabled={reminderSettings.appointmentEnabled}
                  hoursBefore={reminderSettings.appointmentHoursBefore}
                  onToggle={(v) => updateReminder('appointmentEnabled', v)}
                  onTiming={(h) => updateReminder('appointmentHoursBefore', h)}
                  options={[1, 2, 3, 6, 12, 24, 48]}
                />
              )}

              {business.mode.includes('SERVICES') &&
                reminderSettings.appointmentEnabled && (
                  <ReminderRow
                    t={t}
                    title={t('settings.reminderSecondTitle')}
                    subtitle={t('settings.reminderSecondSubtitle')}
                    enabled={reminderSettings.appointmentSecondEnabled}
                    hoursBefore={reminderSettings.appointmentSecondHoursBefore}
                    onToggle={(v) =>
                      updateReminder('appointmentSecondEnabled', v)}
                    onTiming={(h) =>
                      updateReminder('appointmentSecondHoursBefore', h)}
                    options={[1, 2, 3, 6]}
                  />
                )}

              {/* PRODUCTS → delivery reminders */}
              {business.mode.includes('PRODUCTS') && (
                <ReminderRow
                  t={t}
                  title={t('settings.reminderDeliveryTitle')}
                  subtitle={t('settings.reminderDeliverySubtitle')}
                  enabled={reminderSettings.deliveryEnabled}
                  hoursBefore={reminderSettings.deliveryHoursBefore}
                  onToggle={(v) => updateReminder('deliveryEnabled', v)}
                  onTiming={(h) => updateReminder('deliveryHoursBefore', h)}
                  options={[3, 6, 12, 24, 48]}
                />
              )}

              {/* FREELANCE → deadline reminders */}
              {business.mode.includes('FREELANCE') && (
                <ReminderRow
                  t={t}
                  title={t('settings.reminderDeadlineTitle')}
                  subtitle={t('settings.reminderDeadlineSubtitle')}
                  enabled={reminderSettings.deadlineEnabled}
                  hoursBefore={reminderSettings.deadlineHoursBefore}
                  onToggle={(v) => updateReminder('deadlineEnabled', v)}
                  onTiming={(h) => updateReminder('deadlineHoursBefore', h)}
                  options={[12, 24, 48, 72, 168]}
                />
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4">
            {t('settings.remindersFootnote')}
          </p>
        </div>

        {/* Telegram Bot */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('settings.telegramBot')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <p className="text-sm text-gray-600">{t('settings.botUsername')}</p>
              <p className="text-sm font-medium text-gray-900">
                {business.botUsername
                  ? `@${business.botUsername}`
                  : t('settings.notConfigured')}
              </p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-sm text-gray-600">{t('settings.botLink')}</p>
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

function ReminderRow({
  t,
  title,
  subtitle,
  enabled,
  hoursBefore,
  onToggle,
  onTiming,
  options,
}: {
  t: TFn
  title: string
  subtitle: string
  enabled: boolean
  hoursBefore: number
  onToggle: (v: boolean) => void
  onTiming: (h: number) => void
  options: number[]
}) {
  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${
            enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              enabled ? 'right-0.5' : 'left-0.5'
            }`}
          />
        </button>
      </div>
      {enabled && (
        <select
          value={hoursBefore}
          onChange={(e) => onTiming(Number(e.target.value))}
          className="mt-3 px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {options.map((h) => (
            <option key={h} value={h}>
              {timingLabel(t, h)}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
