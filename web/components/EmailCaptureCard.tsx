'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/icons/Icon'
import { updateEmailConsent, dismissEmailPrompt } from '@/lib/api'
import { useBusiness } from '@/lib/businessContext'
import { useI18n } from '@/lib/i18n/i18nContext'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Owner email-capture MODAL: a dimmed + blurred backdrop over Analytics. It NEVER
// gates the data — the parent mounts it ONLY per the show-logic
// (shouldShowEmailPrompt), and every dismiss path (Skip, the close control, or a
// backdrop tap) records the dismissal via dismissEmailPrompt, then refetches the
// business context so the parent's show-logic unmounts it live and the capped
// reappearance rule is respected. Consent is SEPARATE and unchecked by default.
//
// Mobile: the overlay is a full-height vertical scroller (overflow-y-auto) with
// the panel centered, so when the on-screen keyboard opens the focused email
// input scrolls into view and is never covered.
export default function EmailCaptureCard() {
  const { refetch } = useBusiness()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const valid = EMAIL_RE.test(email.trim())

  async function save() {
    if (!valid || saving) return
    setSaving(true)
    try {
      await updateEmailConsent({ email: email.trim(), newsletterConsent: consent })
      await refetch()
    } catch {
      setSaving(false)
    }
  }

  async function dismiss() {
    if (saving) return
    setSaving(true)
    try {
      await dismissEmailPrompt()
      await refetch()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('emailPrompt.heading')}
      onClick={dismiss}
      className="fixed inset-0 z-50 overflow-y-auto bg-text-1/40 backdrop-blur-sm"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-xl bg-surface p-6 shadow-lg"
        >
          <button
            type="button"
            onClick={dismiss}
            disabled={saving}
            aria-label={t('common.close')}
            className="absolute right-4 top-4 text-text-3 hover:text-text-1 transition-colors"
          >
            <Icon name="close" size={20} />
          </button>

          <h2 className="text-lg font-bold text-text-1 pr-8">
            {t('emailPrompt.heading')}
          </h2>
          <p className="text-sm text-text-2 mt-1 mb-4">
            {t('emailPrompt.subtext')}
          </p>

          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <label className="flex items-start gap-2.5 mt-3 text-sm text-text-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span>{t('emailPrompt.consent')}</span>
          </label>

          <div className="flex gap-3 mt-5">
            <Button
              variant="primary"
              onClick={save}
              disabled={!valid || saving}
              loading={saving}
            >
              {t('common.save')}
            </Button>
            <Button variant="secondary" onClick={dismiss} disabled={saving}>
              {t('emailPrompt.skip')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
