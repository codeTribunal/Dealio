'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { requestOtp, verifyOtp, getBusiness } from '@/lib/api'
import { setToken } from '@/lib/auth'
import { useI18n } from '@/lib/i18n/i18nContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generalConsent, setGeneralConsent] = useState(false)
  const [crossBorderConsent, setCrossBorderConsent] = useState(false)

  const canVerify = !!code && generalConsent && crossBorderConsent

  async function handleSendCode() {
    setLoading(true)
    setError(null)
    try {
      await requestOtp(phone)
      setStep('otp')
    } catch {
      setError(t('login.sendFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setLoading(true)
    setError(null)
    try {
      const data = await verifyOtp(phone, code, {
        generalConsent,
        crossBorderConsent,
      })
      setToken(data.token)
      // Check whether this user already has a business; if not, send to onboarding
      try {
        await getBusiness()
        router.replace('/')
      } catch {
        router.replace('/onboarding')
      }
    } catch {
      setError(t('login.invalidCode'))
    } finally {
      setLoading(false)
    }
  }

  function renderConsentGeneral() {
    const text = t('login.consentGeneral')
    const link = t('login.consentGeneralLink')
    const idx = text.indexOf(link)
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline font-medium"
        >
          {link}
        </a>
        {text.slice(idx + link.length)}
      </>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden p-4">
      {/* Decorative radial cobalt glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 640px 420px at 50% 40%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%)',
        }}
      />

      <Card padded={false} className="relative w-full max-w-md shadow-lg p-8 sm:p-10">
        {/* Top row: brand + language switcher */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-11 h-11 rounded-md bg-accent text-accent-on flex items-center justify-center font-extrabold text-lg shadow-accent">
            C
          </div>
          <LanguageSwitcher />
        </div>

        {/* Heading */}
        <h1
          className="text-text-1"
          style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-extra)', lineHeight: 1.1 }}
        >
          {t('login.title')}
        </h1>

        {step === 'phone' ? (
          <>
            <p className="text-sm text-text-2 mt-2 mb-6">{t('login.subtitle')}</p>

            <label className="block text-sm font-medium text-text-2 mb-1.5">
              {t('login.phoneLabel')}
            </label>
            <Input
              type="tel"
              placeholder={t('login.phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendCode()}
            />

            {error && <p className="text-sm text-error-strong mt-2">{error}</p>}

            <div className="mt-5">
              <Button
                variant="primary"
                fullWidth
                loading={loading}
                disabled={!phone}
                onClick={handleSendCode}
              >
                {loading ? t('login.sending') : t('login.sendCode')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-text-2 mt-2 mb-6">
              {t('login.otpSubtitle', { phone })}
            </p>

            <label className="block text-sm font-medium text-text-2 mb-1.5">
              {t('login.verificationCode')}
            </label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={t('login.codePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleVerify()}
            />

            {error && <p className="text-sm text-error-strong mt-2">{error}</p>}

            {/* Consent checkboxes — preserved logic, restyled */}
            <label className="flex items-start gap-2.5 mt-5 text-sm text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generalConsent}
                onChange={(e) => setGeneralConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span>{renderConsentGeneral()}</span>
            </label>

            <label className="flex items-start gap-2.5 mt-3 text-sm text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={crossBorderConsent}
                onChange={(e) => setCrossBorderConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span>{t('login.consentCrossBorder')}</span>
            </label>

            <div className="mt-5 space-y-2">
              <Button
                variant="primary"
                fullWidth
                loading={loading}
                disabled={!canVerify}
                onClick={handleVerify}
              >
                {loading ? t('login.verifying') : t('login.verify')}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setStep('phone')
                  setCode('')
                  setError(null)
                }}
              >
                {t('login.changeNumber')}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
