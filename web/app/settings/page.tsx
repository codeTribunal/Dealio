'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Icon } from '@/components/icons/Icon'
import {
  getBusiness,
  updateBusiness,
  updateEmailConsent,
  updateBotToken,
  updatePayment,
  generateCalendarToken,
  disableCalendarSync,
  getReminderSettings,
  updateReminderSettings,
  type ReminderSettings,
} from '@/lib/api'
import { useBusiness } from '@/lib/businessContext'
import { PRODUCTS_MODE_ENABLED } from '@/lib/featureFlags'
import { formatCardNumber, validateCardNumber } from '@/lib/card'
import { useI18n, codeToEnum, type Locale } from '@/lib/i18n/i18nContext'
import { useToast } from '@/lib/toast'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { WorkingHoursCard } from '@/components/scheduling/WorkingHoursCard'
import { BlockedTimeCard } from '@/components/scheduling/BlockedTimeCard'
import type { Business } from '@/types'

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
  'bg-surface border border-border rounded-md py-2.5 px-3.5 text-base text-text-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors'

// Public base URL for ICS feeds — the API root without the /api/v1 prefix.
const calendarBaseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '')

export default function SettingsPage() {
  const { refetch: refetchContext } = useBusiness()
  const { t, setLocale } = useI18n()
  const { showToast } = useToast()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const [editingProfile, setEditingProfile] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [newsletterConsent, setNewsletterConsent] = useState(false)
  const [language, setLanguage] = useState('UZBEK')

  const [mode, setMode] = useState<string>('SERVICES')
  // Pending mode the owner picked, awaiting confirmation in the warning dialog.
  const [modeSwitchTarget, setModeSwitchTarget] = useState<string | null>(null)
  const [modeSwitching, setModeSwitching] = useState(false)

  const [calendarToken, setCalendarToken] = useState<string | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)

  const [editingBot, setEditingBot] = useState(false)
  const [botToken, setBotToken] = useState('')

  // Payment card (P2P transfer) — gated by business.cardPaymentsEnabled.
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardError, setCardError] = useState<string | null>(null)
  const [savingCard, setSavingCard] = useState(false)

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
        setAddress(data.address || '')
        setEmail(data.ownerEmail || '')
        setNewsletterConsent(data.newsletterConsent ?? false)
        setLanguage(data.language)
        setMode(data.mode)
        setCalendarToken(data.calendarToken || null)
        setCardNumber(data.cardNumber || '')
        setCardHolderName(data.cardHolderName || '')
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
      showToast(t('common.errorGeneric'), 'error')
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
      showToast(t('settings.reminderSaveFailed'), 'error')
    }
  }

  function showSaved(message: string) {
    setSavedMessage(message)
    setTimeout(() => setSavedMessage(null), 3000)
  }

  async function saveProfile() {
    const trimmedEmail = email.trim()
    if (trimmedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      showSaved(t('settings.emailInvalid'))
      return
    }
    setSaving(true)
    try {
      // Email/consent (User) first, so the PATCH /business flatten below returns
      // the fresh ownerEmail into the page + context. Empty clears the email.
      await updateEmailConsent({
        email: trimmedEmail || null,
        newsletterConsent,
      })
      const updated = await updateBusiness({ name, description, address: address.trim() || null, language })
      setBusiness(updated)
      setEditingProfile(false)
      showSaved(t('settings.profileSaved'))
      await refetchContext()
    } finally {
      setSaving(false)
    }
  }

  async function saveBotToken() {
    if (!botToken.trim()) return
    setSaving(true)
    try {
      const updated = await updateBotToken({ botToken: botToken.trim() })
      setBusiness((b) => (b ? { ...b, botUsername: updated.botUsername } : b))
      setEditingBot(false)
      setBotToken('')
      showSaved(t('settings.botTokenUpdated'))
      await refetchContext()
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response
        ?.data?.error
      showSaved(msg ?? t('common.errorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  async function saveCard() {
    // Guard the money route: a mistyped card silently misroutes every future
    // customer payment, so the number must be a full Uzcard/Humo card before
    // it can be saved. Empty clears the card.
    const validation = validateCardNumber(cardNumber)
    if (validation) {
      setCardError(
        validation === 'length'
          ? t('settings.cardInvalidLength')
          : t('settings.cardInvalidPrefix'),
      )
      return
    }
    setCardError(null)
    setSavingCard(true)
    try {
      const num = formatCardNumber(cardNumber)
      const holder = cardHolderName.trim()
      // An empty number clears the card (no holder without a number).
      const updated = await updatePayment({
        cardNumber: num || null,
        cardHolderName: num ? holder || null : null,
      })
      setBusiness(updated)
      setCardNumber(updated.cardNumber || '')
      setCardHolderName(updated.cardHolderName || '')
      showSaved(t('settings.cardSaved'))
    } catch {
      showToast(t('common.errorGeneric'), 'error')
    } finally {
      setSavingCard(false)
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
      showToast(t('settings.calendarFailed'), 'error')
    } finally {
      setCalendarLoading(false)
    }
  }

  function handleCopyCalendarUrl() {
    navigator.clipboard.writeText(calendarUrl)
    showSaved(t('settings.calendarCopied'))
  }

  // Picking the other mode does NOT save immediately — it opens a hard warning
  // dialog. The save happens only on confirm (confirmModeSwitch).
  function requestModeSwitch(value: string) {
    if (!business || value === mode) return
    setModeSwitchTarget(value)
  }

  async function confirmModeSwitch() {
    const value = modeSwitchTarget
    if (!value || !business) return
    setModeSwitching(true)
    try {
      const updated = await updateBusiness({ mode: value })
      setMode(value)
      setBusiness(updated)
      await refetchContext()
      setModeSwitchTarget(null)
    } catch {
      showToast(t('common.errorGeneric'), 'error')
    } finally {
      setModeSwitching(false)
    }
  }

  // Localized mode display name + data noun, for the warning copy.
  const modeDisplayName = (m: string) =>
    m === 'SERVICES'
      ? t('settings.modeNameServices')
      : m === 'PRODUCTS'
        ? t('nav.orders')
        : t('settings.modeNameFreelance')
  const modeDataNoun = (m: string) =>
    m === 'SERVICES'
      ? t('settings.modeDataServices')
      : m === 'PRODUCTS'
        ? t('settings.modeDataProducts')
        : t('settings.modeDataFreelance')

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
                <p className="text-base font-medium text-text-1">{business.name}</p>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <p className="text-sm text-text-2">{t('settings.description')}</p>
                <p className="text-base font-medium text-text-1">
                  {business.description || '—'}
                </p>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <p className="text-sm text-text-2">{t('settings.address')}</p>
                <p className="text-base font-medium text-text-1">
                  {business.address || '—'}
                </p>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <p className="text-sm text-text-2">{t('settings.email')}</p>
                <p className="text-base font-medium text-text-1">
                  {business.ownerEmail || '—'}
                </p>
              </div>
              <div className="flex justify-between items-center py-2">
                <p className="text-sm text-text-2">{t('settings.language')}</p>
                <p className="text-base font-medium text-text-1">
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
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('settings.businessName')}
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('settings.description')}
                </label>
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('settings.address')}
                </label>
                <Textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <p className="text-xs text-text-3 mt-1.5">
                  {t('settings.addressHint')}
                </p>
              </div>
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('settings.email')}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <label className="flex items-start gap-2.5 mt-3 text-base text-text-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newsletterConsent}
                    onChange={(e) => setNewsletterConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>{t('emailPrompt.consent')}</span>
                </label>
              </div>
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
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
                    setAddress(business.address || '')
                    setEmail(business.ownerEmail || '')
                    setNewsletterConsent(business.newsletterConsent ?? false)
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
          <p className="text-base text-text-2 mb-4">
            {t('settings.businessModeHint')}
          </p>

          {/* Single-select business type — a dropdown styled like the page's
              other selects. Picking another mode opens the hard-warning modal
              (requestModeSwitch); it does NOT save until the owner confirms.
              value={mode} keeps the control bound to the current scalar mode,
              so Cancel reverts it. */}
          <div className="inline-flex bg-surface-2 rounded-lg p-1">
            {/* PRODUCTS mode is parked for launch: hide the option unless the
                flag is on or this business is already in PRODUCTS mode. */}
            {(PRODUCTS_MODE_ENABLED || mode === 'PRODUCTS'
              ? ['SERVICES', 'FREELANCE', 'PRODUCTS']
              : ['SERVICES', 'FREELANCE']
            ).map((m) => {
              const active = mode === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => requestModeSwitch(m)}
                  className={`rounded-md px-4 py-2 text-base font-semibold transition-colors ${
                    active
                      ? 'bg-surface text-text-1 shadow-sm'
                      : 'text-text-2 hover:text-text-1'
                  }`}
                  style={{ transitionDuration: 'var(--dur-base)' }}
                >
                  {modeDisplayName(m)}
                </button>
              )
            })}
          </div>
        </Card>

        {/* ── Services (SERVICES mode only) ────────────────────── */}
        {business.mode === 'SERVICES' && (
          <Card>
            <CardHeader title="Services" />
            <div className="divide-y divide-border">
              <Link
                href="/services"
                className="flex items-center justify-between py-3 group"
              >
                <span className="text-base font-medium text-text-1">
                  Manage services
                </span>
                <span className="text-text-3 group-hover:text-text-1 transition-colors">
                  ›
                </span>
              </Link>
            </div>
          </Card>
        )}

        {/* ── Staff (all modes — Orders & Projects businesses have staff too) ── */}
        <Card>
          <CardHeader title="Staff" />
          <div className="divide-y divide-border">
            <Link
              href="/staff"
              className="flex items-center justify-between py-3 group"
            >
              <span className="text-base font-medium text-text-1">
                Manage staff
              </span>
              <span className="text-text-3 group-hover:text-text-1 transition-colors">
                ›
              </span>
            </Link>
          </div>
        </Card>

        {/* ── Scheduling (SERVICES mode only) ──────────────────── */}
        {business.mode === 'SERVICES' && (
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

        {/* ── Calendar sync ────────────────────────────────────── */}
        <Card>
          <CardHeader title={t('settings.calendarSync')} />
          <p className="text-base text-text-2 mb-5">
            {t('settings.calendarSyncHint')}
          </p>

          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <p className="text-base font-medium text-text-1">
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
          <p className="text-base text-text-2 mb-5">
            {t('settings.remindersHint')}
          </p>

          {reminderSettings && (
            <div className="divide-y divide-border">
              {/* SERVICES → appointment reminders */}
              {business.mode === 'SERVICES' && (
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

              {business.mode === 'SERVICES' &&
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

              {/* PRODUCTS → delivery reminders: removed — PRODUCTS mode is
                  disabled and mode is now a SERVICES|FREELANCE scalar, so this
                  block can never render. Reminder settings keys remain in the API. */}

              {/* FREELANCE → deadline reminders */}
              {business.mode === 'FREELANCE' && (
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
          <CardHeader
            title={t('settings.telegramBot')}
            right={
              !editingBot ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingBot(true)}
                >
                  {t('settings.changeBot')}
                </Button>
              ) : undefined
            }
          />

          {!editingBot ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <p className="text-sm text-text-2">{t('settings.botUsername')}</p>
                <p className="text-base font-medium text-text-1">
                  {business.botUsername
                    ? `@${business.botUsername}`
                    : t('settings.notConfigured')}
                </p>
              </div>
              <div className="flex justify-between items-center py-2">
                <p className="text-sm text-text-2">{t('settings.botLink')}</p>
                {business.botUsername ? (
                  <div className="flex items-center gap-2">
                    <p className="text-base text-accent font-medium">
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
                  <p className="text-base text-text-3">—</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('settings.pasteToken')}
                </label>
                <Input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="1234567890:AAHxyz..."
                  className="font-mono"
                />
                <p className="text-xs text-text-3 mt-2">
                  {t('settings.botTokenHint')}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="primary" loading={saving} onClick={saveBotToken}>
                  {t('common.save')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBotToken('')
                    setEditingBot(false)
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Payment card — gated by the GLOBAL cardPaymentsEnabled flag.
            Default ON: only an explicit `false` hides it (PATCH /business
            responses omit the flag, so absent must mean visible). ── */}
        {business.cardPaymentsEnabled !== false && (
          <Card>
            <CardHeader title={t('settings.paymentCard')} />
            <p className="text-base text-text-2 mb-4">{t('settings.paymentHint')}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('settings.cardNumber')}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => {
                    setCardNumber(formatCardNumber(e.target.value))
                    setCardError(null)
                  }}
                  placeholder="8600 1234 5678 9012"
                  aria-invalid={cardError !== null}
                />
                {cardError && (
                  <p className="text-sm font-medium text-error-strong mt-1.5" role="alert">
                    {cardError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-base font-medium text-text-2 mb-1.5">
                  {t('settings.cardHolder')}
                </label>
                <Input
                  type="text"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                  placeholder="KARIMOV AZIZ"
                />
              </div>
              <Button variant="primary" loading={savingCard} onClick={saveCard}>
                {t('common.save')}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-text-1 text-surface px-4 py-3 rounded-md text-base font-medium shadow-md z-50 flex items-center gap-2">
          <span className="text-success-soft">
            <Icon name="paid" size={16} />
          </span>
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Mode-switch hard warning */}
      {modeSwitchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-text-1/30"
            onClick={() => (modeSwitching ? null : setModeSwitchTarget(null))}
          />
          <Card className="relative z-10 w-full max-w-md">
            <p className="text-base font-bold text-text-1 mb-2">
              {t('settings.modeSwitchTitle')}
            </p>
            <p className="text-base text-text-2 mb-5">
              {t('settings.modeSwitchBody', {
                from: modeDisplayName(mode),
                to: modeDisplayName(modeSwitchTarget),
                data: modeDataNoun(mode),
              })}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                disabled={modeSwitching}
                onClick={() => setModeSwitchTarget(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button variant="danger" loading={modeSwitching} onClick={confirmModeSwitch}>
                {t('settings.modeSwitchConfirm', { to: modeDisplayName(modeSwitchTarget) })}
              </Button>
            </div>
          </Card>
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
          <p className="text-base font-medium text-text-1">{title}</p>
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
