'use client'
import { useState, useEffect } from 'react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Icon } from '@/components/icons/Icon'
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
import { WorkingHoursCard } from '@/components/scheduling/WorkingHoursCard'
import { BlockedTimeCard } from '@/components/scheduling/BlockedTimeCard'
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

// Token-styled toggle switch. Same a11y as the previous div-toggle but a button.
function Toggle({
  active,
  onClick,
  disabled = false,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`w-11 h-6 rounded-pill relative cursor-pointer transition-colors flex-shrink-0 ${
        active ? 'bg-accent' : 'bg-border-strong'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-surface rounded-pill shadow-sm transition-transform ${
          active ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

const SELECT_CLASS =
  'bg-surface border border-border rounded-md py-2.5 px-3.5 text-sm text-text-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors'

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
        <Card className="text-center">
          <p className="text-lg font-semibold text-text-1 mb-3">
            {t('settings.failedLoad')}
          </p>
          <Button variant="primary" onClick={fetchBusiness}>
            {t('common.tryAgain')}
          </Button>
        </Card>
      </AuthLayout>
    )
  }

  // Pill segmented button (Uzcard/Humo). Stays local to settings.
  const segButton = (active: boolean) =>
    `px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
      active
        ? 'bg-accent text-accent-on'
        : 'border border-border bg-surface text-text-1 hover:bg-surface-2'
    }`

  return (
    <AuthLayout title={t('settings.title')}>
      <div className="max-w-2xl w-full space-y-6">

        {/* ── Business Profile ─────────────────────────────────── */}
        <Card>
          <CardHeader
            title={t('settings.businessProfile')}
            right={
              !editingProfile ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingProfile(true)}
                >
                  {t('common.edit')}
                </Button>
              ) : undefined
            }
          />

          {!editingProfile ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <p className="text-sm text-text-2">{t('settings.businessName')}</p>
                <p className="text-sm font-medium text-text-1">{business.name}</p>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <p className="text-sm text-text-2">{t('settings.description')}</p>
                <p className="text-sm font-medium text-text-1">
                  {business.description || '—'}
                </p>
              </div>
              <div className="flex justify-between items-center py-2">
                <p className="text-sm text-text-2">{t('settings.language')}</p>
                <p className="text-sm font-medium text-text-1">
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
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  {t('settings.businessName')}
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  {t('settings.description')}
                </label>
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  {t('settings.language')}
                </label>
                <LanguageSwitcher onChange={selectLanguage} />
                <p className="text-xs text-text-3 mt-2">
                  {t('settings.languageHint')}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  loading={saving}
                  onClick={saveProfile}
                >
                  {t('common.save')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setName(business.name)
                    setDescription(business.description || '')
                    setLanguage(business.language)
                    setEditingProfile(false)
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Business Mode ────────────────────────────────────── */}
        <Card>
          <CardHeader title={t('settings.businessMode')} />
          <p className="text-sm text-text-2 mb-4">
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
              className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium text-text-1">{title}</p>
                <p className="text-xs text-text-2 mt-0.5">{subtitle}</p>
              </div>
              <Toggle
                active={modes.includes(value)}
                onClick={() => toggleMode(value)}
              />
            </div>
          ))}
        </Card>

        {/* ── Scheduling (SERVICES mode only) ──────────────────── */}
        {business.mode.includes('SERVICES') && (
          <>
            <WorkingHoursCard
              business={business}
              onSaved={(updated) => {
                setBusiness(updated)
                refetchContext()
              }}
              notify={showSaved}
            />
            <BlockedTimeCard notify={showSaved} />
          </>
        )}

        {/* ── Payment Method ───────────────────────────────────── */}
        <Card>
          <CardHeader
            title={t('settings.paymentMethod')}
            right={
              !editingPayment ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPayment(true)}
                >
                  {t('common.edit')}
                </Button>
              ) : undefined
            }
          />

          {!editingPayment ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <p className="text-sm text-text-2">{t('settings.cardNumber')}</p>
                <p className="text-sm font-medium text-text-1 font-mono tabular-nums">
                  {business.cardNumber
                    ? formatCardNumber(business.cardNumber)
                    : '—'}
                </p>
              </div>
              <div className="flex justify-between items-center py-2">
                <p className="text-sm text-text-2">{t('settings.bank')}</p>
                <p className="text-sm font-medium text-text-1">
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
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  {t('settings.cardNumber')}
                </label>
                <Input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={16}
                  placeholder="8600123456781234"
                  className="font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  {t('settings.bank')}
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCardBank('UZCARD')}
                    className={segButton(cardBank === 'UZCARD')}
                  >
                    Uzcard
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardBank('HUMO')}
                    className={segButton(cardBank === 'HUMO')}
                  >
                    Humo
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  loading={saving}
                  onClick={savePayment}
                >
                  {t('common.save')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCardNumber(business.cardNumber || '')
                    setCardBank(business.cardBank || 'UZCARD')
                    setEditingPayment(false)
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Calendar sync ────────────────────────────────────── */}
        <Card>
          <CardHeader title={t('settings.calendarSync')} />
          <p className="text-sm text-text-2 mb-5">
            {t('settings.calendarSyncHint')}
          </p>

          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <p className="text-sm font-medium text-text-1">
                {t('settings.syncToCalendar')}
              </p>
              <p className="text-xs text-text-2 mt-0.5">
                {t('settings.calendarWorksWith')}
              </p>
            </div>
            <Toggle
              active={!!calendarToken}
              onClick={() => handleToggleCalendar(!calendarToken)}
              disabled={calendarLoading}
            />
          </div>

          {calendarToken && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-2">
                  {t('settings.calendarLink')}
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded-md">
                  <span className="flex-1 text-xs text-text-2 font-mono truncate">
                    {calendarUrl}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCalendarUrl}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={`https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(calendarUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="secondary" fullWidth leftIcon="calendar">
                    {t('settings.addGoogle')}
                  </Button>
                </a>
                <a
                  href={calendarUrl.replace(/^https?:\/\//, 'webcal://')}
                  className="flex-1"
                >
                  <Button variant="secondary" fullWidth leftIcon="calendar">
                    {t('settings.addApple')}
                  </Button>
                </a>
              </div>

              <p className="text-xs text-text-3">
                {t('settings.samsungNote')}
              </p>
            </div>
          )}
        </Card>

        {/* ── Reminders ────────────────────────────────────────── */}
        <Card>
          <CardHeader title={t('settings.reminders')} />
          <p className="text-sm text-text-2 mb-5">
            {t('settings.remindersHint')}
          </p>

          {reminderSettings && (
            <div className="divide-y divide-border">
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

          <p className="text-xs text-text-3 mt-4">
            {t('settings.remindersFootnote')}
          </p>
        </Card>

        {/* ── Telegram Bot ─────────────────────────────────────── */}
        <Card>
          <CardHeader title={t('settings.telegramBot')} />
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <p className="text-sm text-text-2">{t('settings.botUsername')}</p>
              <p className="text-sm font-medium text-text-1">
                {business.botUsername
                  ? `@${business.botUsername}`
                  : t('settings.notConfigured')}
              </p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-sm text-text-2">{t('settings.botLink')}</p>
              {business.botUsername ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-accent font-medium">
                    https://t.me/{business.botUsername}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `https://t.me/${business.botUsername}`
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-text-3">—</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-text-1 text-surface px-4 py-3 rounded-md text-sm font-medium shadow-md z-50 flex items-center gap-2">
          <span className="text-success-soft">
            <Icon name="paid" size={16} />
          </span>
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
          <p className="text-sm font-medium text-text-1">{title}</p>
          <p className="text-xs text-text-2 mt-0.5">{subtitle}</p>
        </div>
        <Toggle active={enabled} onClick={() => onToggle(!enabled)} />
      </div>
      {enabled && (
        <select
          value={hoursBefore}
          onChange={(e) => onTiming(Number(e.target.value))}
          className={`mt-3 ${SELECT_CLASS}`}
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
