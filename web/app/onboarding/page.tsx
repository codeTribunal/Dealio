'use client'
import { useState } from 'react'
import { verifyBotToken, completeOnboarding, enrollStart, enrollVerify } from '@/lib/api'
import { setToken } from '@/lib/auth'

type Mode = 'SERVICES' | 'FREELANCE'
type Language = 'UZBEK' | 'RUSSIAN'

interface FormState {
  businessName: string
  mode: Mode
  language: Language
  botToken: string
  botUsername: string
  botName: string
  botLink: string
}

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

// Product-seller mode is disabled — onboarding offers only appointment-based
// (SERVICES) and project-based (FREELANCE) businesses.
const modeOptions: { value: Mode; title: string; subtitle: string }[] = [
  { value: 'SERVICES', title: 'Appointments', subtitle: 'For salons, barbers, doctors, tutors' },
  { value: 'FREELANCE', title: 'Projects', subtitle: 'For freelancers, designers, influencers' },
]

const botInstructions = [
  'Open Telegram and search for @BotFather',
  'Send the message: /newbot',
  'Choose a name for your bot (e.g. Zulfiya Cakes)',
  'Choose a username ending in _bot (e.g. zulfiya_cakes_bot)',
  'Copy the token BotFather gives you',
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>({
    businessName: '',
    mode: 'SERVICES',
    language: 'UZBEK',
    botToken: '',
    botUsername: '',
    botName: '',
    botLink: '',
  })
  const [verifying, setVerifying] = useState(false)
  const [tokenVerified, setTokenVerified] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Step 5 — Telegram verification (owner auth). enrollToken + botDeepLink come
  // from /auth/enroll/start; the code + consents complete /auth/enroll/verify.
  const [enrollToken, setEnrollToken] = useState('')
  const [botDeepLink, setBotDeepLink] = useState('')
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [linkExpired, setLinkExpired] = useState(false)
  const [code, setCode] = useState('')
  const [generalConsent, setGeneralConsent] = useState(false)
  const [crossBorderConsent, setCrossBorderConsent] = useState(false)

  // Single-select: a business is created with exactly one mode (SERVICES or
  // FREELANCE), stored and sent as a single scalar value.
  function toggleMode(value: Mode) {
    setForm((f) => ({ ...f, mode: value }))
  }

  async function handleVerify() {
    setVerifying(true)
    setTokenError(null)
    try {
      const data = await verifyBotToken(form.botToken)
      setForm((f) => ({ ...f, botUsername: data.botUsername, botName: data.botName }))
      setTokenVerified(true)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setTokenError(msg ?? 'Could not verify token. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  // Track whether the Telegram enrollment already succeeded, so a later failure
  // in business creation can be retried WITHOUT re-verifying (code is single-use).
  const [enrolled, setEnrolled] = useState(false)

  // Review → final step: move to the Telegram verification step and request a
  // fresh enrollment deep link.
  function goToVerify() {
    setStep(4)
    startEnrollment()
  }

  async function startEnrollment() {
    setEnrollLoading(true)
    setEnrollError(null)
    setLinkExpired(false)
    try {
      const res = await enrollStart()
      setEnrollToken(res.token)
      setBotDeepLink(res.botDeepLink)
    } catch {
      setEnrollError('Could not start Telegram verification. Please try again.')
    } finally {
      setEnrollLoading(false)
    }
  }

  function openTelegram() {
    if (linkExpired || !botDeepLink) {
      // Regenerate an expired/missing link first, then the user taps again.
      startEnrollment()
      return
    }
    window.open(botDeepLink, '_blank', 'noopener,noreferrer')
  }

  // Verify the Telegram code (+ consents) → store the 30-day JWT → create the
  // business bound to the now-authenticated user → done.
  async function handleVerifyAndLaunch() {
    if (!enrolled && (code.length < 6 || !generalConsent || !crossBorderConsent)) return
    setCompleting(true)
    setEnrollError(null)
    setCompletionError(null)
    try {
      if (!enrolled) {
        const auth = await enrollVerify({
          token: enrollToken,
          code,
          generalConsent,
          crossBorderConsent,
        })
        setToken(auth.token)
        setEnrolled(true)
      }

      const result = await completeOnboarding({
        businessName: form.businessName,
        mode: form.mode,
        language: form.language,
        botToken: form.botToken,
      })
      setForm((f) => ({ ...f, botLink: result.botLink, botUsername: result.botUsername }))
      setStep(5)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? ''
      if (!enrolled && /link|expired/i.test(msg)) {
        setLinkExpired(true)
        setEnrollError('Your verification link expired. Tap "Connect Telegram" to get a new one.')
      } else if (!enrolled && (status === 401 || /code/i.test(msg))) {
        setEnrollError('Invalid or expired code. Please check and try again.')
      } else {
        setEnrollError(msg || 'Something went wrong. Please try again.')
      }
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8">

        {/* Progress bar (steps 1-5) */}
        {step < 5 && (
          <div className="flex gap-1.5 mb-8">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full ${
                  n <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        {/* ── Step 1: Business details ── */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Set up your business</h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">Tell us about your business</p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business name
            </label>
            <input
              className={inputClass}
              placeholder="e.g. Maftuna Cakes"
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            />

            <p className="text-sm font-medium text-gray-700 mt-5 mb-3">Business type</p>
            <div className="space-y-2">
              {modeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMode(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                    form.mode === opt.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={`font-semibold text-sm ${form.mode === opt.value ? 'text-blue-700' : 'text-gray-800'}`}>
                    {opt.title}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.subtitle}</p>
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-gray-700 mt-5 mb-3">Language</p>
            <div className="flex gap-3">
              {(['UZBEK', 'RUSSIAN'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, language: lang }))}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    form.language === lang
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {lang === 'UZBEK' ? "O'zbek" : 'Русский'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.businessName.trim()}
              className="w-full mt-8 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {/* ── Step 2: Telegram bot ── */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="text-sm text-blue-600 mb-4">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Create your Telegram bot</h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              Your customers will use this bot to book appointments and track projects
            </p>

            <div className="space-y-3 mb-6">
              {botInstructions.map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700">{text}</p>
                </div>
              ))}
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste your bot token
            </label>
            <input
              className={inputClass}
              placeholder="1234567890:AAHxyz..."
              value={form.botToken}
              onChange={(e) => {
                setForm((f) => ({ ...f, botToken: e.target.value }))
                setTokenVerified(false)
                setTokenError(null)
              }}
            />
            {tokenError && (
              <p className="text-red-600 text-xs mt-1">{tokenError}</p>
            )}

            {!tokenVerified ? (
              <button
                onClick={handleVerify}
                disabled={verifying || !form.botToken}
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Verify token'}
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 mt-3 text-green-600 text-sm font-semibold">
                  <span>✓</span>
                  <span>@{form.botUsername} is ready!</span>
                </div>
                <button
                  onClick={() => setStep(3)}
                  className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Review & launch ── */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="text-sm text-blue-600 mb-4">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Almost done!</h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">Review your details before launching</p>

            <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
              {[
                { label: 'Business name', value: form.businessName },
                {
                  label: 'Type',
                  value: { SERVICES: 'Services', FREELANCE: 'Freelance' }[form.mode],
                },
                { label: 'Language', value: form.language === 'UZBEK' ? "O'zbek" : 'Русский' },
                { label: 'Bot', value: `@${form.botUsername}` },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  className={`flex justify-between px-5 py-3.5 text-sm ${
                    i < arr.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-semibold text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>

            {completionError && (
              <p className="text-red-600 text-sm mb-3">{completionError}</p>
            )}
            <button
              onClick={goToVerify}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {/* ── Step 4: Verify via Telegram (owner auth) ── */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} className="text-sm text-blue-600 mb-4">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Verify via Telegram</h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              One last step to secure your account
            </p>

            <ol className="space-y-3 mb-5">
              {[
                'Tap "Connect Telegram" below to open our bot',
                'Tap "Share my phone number" in the chat',
                'The bot sends you a 6-digit code — enter it here',
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700">{text}</p>
                </li>
              ))}
            </ol>

            <button
              onClick={openTelegram}
              disabled={enrollLoading}
              className="w-full mb-5 border-2 border-blue-200 text-blue-700 py-3 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 7.2l-1.68 7.93c-.12.56-.44.7-.9.43l-2.5-1.84-1.2 1.16c-.13.13-.25.25-.51.25l.18-2.56 4.64-4.19c.2-.18-.05-.28-.31-.1L7.92 14.36l-2.47-.77c-.54-.17-.55-.54.11-.8l9.63-3.72c.46-.17.86.11.7.79l.01.34z" />
              </svg>
              {enrollLoading ? 'Preparing…' : linkExpired ? 'Get a new link' : 'Connect Telegram'}
            </button>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              6-digit code
            </label>
            <input
              className={`${inputClass} tracking-[0.4em] text-center font-semibold`}
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />

            {/* Consent — captured once, here at enrollment. */}
            <label className="flex items-start gap-2.5 mt-5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={generalConsent}
                onChange={(e) => setGeneralConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span>
                I have read the{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">
                  Privacy Policy
                </a>{' '}
                and consent to the processing of my personal data in accordance with the Law of
                the Republic of Uzbekistan &quot;On Personal Data&quot;.
              </span>
            </label>
            <label className="flex items-start gap-2.5 mt-3 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={crossBorderConsent}
                onChange={(e) => setCrossBorderConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span>
                I consent to the storage and transfer of my personal data on servers located
                outside Uzbekistan (Railway, Cloudflare).
              </span>
            </label>

            {enrollError && <p className="text-red-600 text-sm mt-3">{enrollError}</p>}

            <button
              onClick={handleVerifyAndLaunch}
              disabled={
                completing ||
                (!enrolled && (code.length < 6 || !generalConsent || !crossBorderConsent))
              }
              className="w-full mt-5 bg-blue-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {completing ? 'Verifying…' : 'Verify & launch'}
            </button>
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === 5 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">You&apos;re all set!</h1>
            <p className="text-gray-500 text-sm mb-8">
              Your CRM is ready. Share your bot link with customers.
            </p>
            <div className="border-2 border-blue-200 rounded-xl px-5 py-4 flex items-center gap-3 mb-8 text-left">
              <svg className="w-7 h-7 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 7.2l-1.68 7.93c-.12.56-.44.7-.9.43l-2.5-1.84-1.2 1.16c-.13.13-.25.25-.51.25l.18-2.56 4.64-4.19c.2-.18-.05-.28-.31-.1L7.92 14.36l-2.47-.77c-.54-.17-.55-.54.11-.8l9.63-3.72c.46-.17.86.11.7.79l.01.34z"/>
              </svg>
              <span className="font-semibold text-blue-700 flex-1">@{form.botUsername}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(form.botLink)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="text-blue-600 text-xs font-semibold hover:text-blue-800"
              >
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
            </div>
            <button
              onClick={() => {
                // Hard nav so the BusinessProvider re-initializes with the new
                // session and the dashboard loads the freshly-created business.
                window.location.href = '/'
              }}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
