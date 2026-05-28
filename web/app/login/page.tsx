'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { requestOtp, verifyOtp, getBusiness } from '@/lib/api'
import { setToken } from '@/lib/auth'
import { useI18n } from '@/lib/i18n/i18nContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

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
        router.replace('/customers')
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
          className="text-blue-600 underline font-medium"
        >
          {link}
        </a>
        {text.slice(idx + link.length)}
      </>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-10 w-full max-w-md mx-4 md:mx-auto">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t('login.title')}</h1>

        {step === 'phone' ? (
          <>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              {t('login.subtitle')}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('login.phoneLabel')}
            </label>
            <input
              type="tel"
              placeholder={t('login.phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendCode()}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <button
              onClick={handleSendCode}
              disabled={loading || !phone}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('login.sending') : t('login.sendCode')}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              {t('login.otpSubtitle', { phone })}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('login.verificationCode')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder={t('login.codePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleVerify()}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

            <label className="flex items-start gap-2 mt-5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={generalConsent}
                onChange={(e) => setGeneralConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>{renderConsentGeneral()}</span>
            </label>

            <label className="flex items-start gap-2 mt-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={crossBorderConsent}
                onChange={(e) => setCrossBorderConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>{t('login.consentCrossBorder')}</span>
            </label>

            <button
              onClick={handleVerify}
              disabled={loading || !canVerify}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('login.verifying') : t('login.verify')}
            </button>
            <button
              onClick={() => {
                setStep('phone')
                setCode('')
                setError(null)
              }}
              className="w-full mt-3 text-sm text-blue-600"
            >
              {t('login.changeNumber')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
