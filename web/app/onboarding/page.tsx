'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyBotToken, completeOnboarding } from '@/lib/api'

type Mode = 'SERVICES' | 'FREELANCE'
type Language = 'UZBEK' | 'RUSSIAN'
type Bank = 'UZCARD' | 'HUMO'

interface FormState {
  businessName: string
  mode: Mode
  language: Language
  botToken: string
  botUsername: string
  botName: string
  botLink: string
  cardNumber: string
  cardBank: Bank
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
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>({
    businessName: '',
    mode: 'SERVICES',
    language: 'UZBEK',
    botToken: '',
    botUsername: '',
    botName: '',
    botLink: '',
    cardNumber: '',
    cardBank: 'UZCARD',
  })
  const [verifying, setVerifying] = useState(false)
  const [tokenVerified, setTokenVerified] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  async function handleComplete() {
    setCompleting(true)
    setCompletionError(null)
    try {
      const result = await completeOnboarding({
        businessName: form.businessName,
        mode: form.mode,
        language: form.language,
        botToken: form.botToken,
        cardNumber: form.cardNumber || undefined,
        cardBank: form.cardNumber ? form.cardBank : undefined,
      })
      setForm((f) => ({ ...f, botLink: result.botLink, botUsername: result.botUsername }))
      setStep(5)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setCompletionError(msg ?? 'Something went wrong. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  function formatCard(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-lg p-8">

        {/* Progress bar (steps 1-4) */}
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

        {/* ── Step 3: Payment method ── */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="text-sm text-blue-600 mb-4">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">How will customers pay?</h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">You can change this later in Settings</p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card number (optional)
            </label>
            <input
              className={inputClass}
              placeholder="8600 1234 5678 1234"
              value={formatCard(form.cardNumber)}
              maxLength={19}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 16)
                setForm((f) => ({ ...f, cardNumber: digits }))
              }}
            />

            <p className="text-sm font-medium text-gray-700 mt-4 mb-2">Bank</p>
            <div className="flex gap-3">
              {(['UZCARD', 'HUMO'] as Bank[]).map((bank) => (
                <button
                  key={bank}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, cardBank: bank }))}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    form.cardBank === bank
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {bank === 'UZCARD' ? 'Uzcard' : 'Humo'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full mt-8 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
            <button
              onClick={() => {
                setForm((f) => ({ ...f, cardNumber: '' }))
                setStep(4)
              }}
              className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step 4: Review & launch ── */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} className="text-sm text-blue-600 mb-4">
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
                {
                  label: 'Payment',
                  value: form.cardNumber
                    ? `${form.cardNumber.replace(/(.{4})/g, '$1 ').trim()} (${form.cardBank === 'UZCARD' ? 'Uzcard' : 'Humo'})`
                    : 'Not set',
                },
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
              onClick={handleComplete}
              disabled={completing}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {completing ? 'Launching...' : 'Launch my CRM'}
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
              onClick={() => router.replace('/')}
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
