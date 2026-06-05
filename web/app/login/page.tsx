'use client'
import { useState } from 'react'
import { loginRequest, loginVerify } from '@/lib/api'
import { setToken } from '@/lib/auth'
import { useI18n } from '@/lib/i18n/i18nContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const { t } = useI18n()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode() {
    if (!phone) return
    setLoading(true)
    setError(null)
    try {
      // Always succeeds (backend returns a generic 200 to avoid enumeration).
      await loginRequest(phone)
      setStep('code')
    } catch {
      setError(t('login.sendFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!code) return
    setLoading(true)
    setError(null)
    try {
      const data = await loginVerify(phone, code)
      setToken(data.token)
      // Hard navigation so the BusinessProvider re-initializes with the token.
      window.location.href = data.business ? '/' : '/onboarding'
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? ''
      if (status === 429 || /many|attempt/i.test(msg)) {
        setError(t('login.tooManyAttempts'))
      } else {
        setError(t('login.invalidCode'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 640px 420px at 50% 40%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%)',
        }}
      />

      <Card padded={false} className="relative w-full max-w-md shadow-lg p-8 sm:p-10">
        <div className="flex items-center justify-between mb-6">
          <div className="w-11 h-11 rounded-md bg-accent text-accent-on flex items-center justify-center font-extrabold text-lg shadow-accent">
            C
          </div>
          <LanguageSwitcher />
        </div>

        <h1
          className="text-text-1"
          style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-extra)', lineHeight: 1.1 }}
        >
          {t('login.title')}
        </h1>

        {step === 'phone' ? (
          <>
            <p className="text-sm text-text-2 mt-2 mb-6">{t('login.telegramSubtitle')}</p>

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
            <p className="text-sm text-text-2 mt-2 mb-6">{t('login.codeSent')}</p>

            <label className="block text-sm font-medium text-text-2 mb-1.5">
              {t('login.verificationCode')}
            </label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={t('login.codePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleVerify()}
            />

            {error && <p className="text-sm text-error-strong mt-2">{error}</p>}

            <div className="mt-5 space-y-2">
              <Button
                variant="primary"
                fullWidth
                loading={loading}
                disabled={code.length < 6}
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
