'use client'
import { useState } from 'react'
import { verifyBotToken, completeOnboarding, enrollStart, enrollVerify } from '@/lib/api'
import { setToken } from '@/lib/auth'
import { useI18n, enumToCode } from '@/lib/i18n/i18nContext'

type Mode = 'PRODUCTS' | 'SERVICES' | 'FREELANCE'
type Language = 'UZBEK' | 'RUSSIAN' | 'ENGLISH'

// Language names are always shown in their own language, never translated.
const languageLabels: Record<Language, string> = {
  UZBEK: "O'zbek",
  RUSSIAN: 'Русский',
  ENGLISH: 'English',
}

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
  'w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'

// Legal consent text with the Privacy Policy link spliced in. Reuses the
// legally-reviewed login.consentGeneral string; the link phrase
// (login.consentGeneralLink) appears verbatim inside it in every locale.
function GeneralConsentText() {
  const { t } = useI18n()
  const text = t('login.consentGeneral')
  const linkText = t('login.consentGeneralLink')
  const idx = text.indexOf(linkText)
  const link = (
    <a
      href="/privacy"
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline font-medium"
    >
      {linkText}
    </a>
  )
  if (idx === -1) {
    // Defensive fallback if a translation ever drops the link phrase.
    return (
      <span>
        {text} ({link})
      </span>
    )
  }
  return (
    <span>
      {text.slice(0, idx)}
      {link}
      {text.slice(idx + linkText.length)}
    </span>
  )
}

export default function OnboardingPage() {
  const { t, setLocale } = useI18n()
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

  // Onboarding business types. Order mirrors the Mode enum (PRODUCTS/SERVICES/FREELANCE).
  const modeOptions: { value: Mode; title: string; subtitle: string }[] = [
    {
      value: 'PRODUCTS',
      title: t('onboarding.modeProductsTitle'),
      subtitle: t('onboarding.modeProductsSubtitle'),
    },
    {
      value: 'SERVICES',
      title: t('onboarding.modeServicesTitle'),
      subtitle: t('onboarding.modeServicesSubtitle'),
    },
    {
      value: 'FREELANCE',
      title: t('onboarding.modeFreelanceTitle'),
      subtitle: t('onboarding.modeFreelanceSubtitle'),
    },
  ]

  const modeTitles: Record<Mode, string> = {
    PRODUCTS: t('onboarding.modeProductsTitle'),
    SERVICES: t('onboarding.modeServicesTitle'),
    FREELANCE: t('onboarding.modeFreelanceTitle'),
  }

  const botInstructions = [
    t('onboarding.botInstruction1'),
    t('onboarding.botInstruction2'),
    t('onboarding.botInstruction3'),
    t('onboarding.botInstruction4'),
    t('onboarding.botInstruction5'),
  ]

  const verifySteps = [
    t('onboarding.verifyStep1'),
    t('onboarding.verifyStep2'),
    t('onboarding.verifyStep3'),
  ]

  // Single-select: a business is created with exactly one mode (SERVICES or
  // FREELANCE), stored and sent as a single scalar value.
  function toggleMode(value: Mode) {
    setForm((f) => ({ ...f, mode: value }))
  }

  // Picking the business language also switches the onboarding UI itself, so
  // the rest of the flow (including the legal consents) reads in that language.
  function selectLanguage(lang: Language) {
    setForm((f) => ({ ...f, language: lang }))
    setLocale(enumToCode(lang))
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
      setTokenError(msg ?? t('onboarding.tokenVerifyFailed'))
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
      setEnrollError(t('onboarding.enrollStartFailed'))
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
        setEnrollError(t('onboarding.linkExpiredError'))
      } else if (!enrolled && (status === 401 || /code/i.test(msg))) {
        setEnrollError(t('onboarding.invalidCode'))
      } else {
        setEnrollError(msg || t('onboarding.errorGeneric'))
      }
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-2 flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-lg p-8">

        {/* Progress bar (steps 1-5) */}
        {step < 5 && (
          <div className="flex gap-1.5 mb-8">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full ${
                  n <= step ? 'bg-accent' : 'bg-surface-2'
                }`}
              />
            ))}
          </div>
        )}

        {/* ── Step 1: Business details ── */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-text-1">{t('onboarding.title')}</h1>
            <p className="text-base text-text-2 mt-1 mb-6">{t('onboarding.subtitle')}</p>

            <label className="block text-base font-medium text-text-2 mb-1">
              {t('settings.businessName')}
            </label>
            <input
              className={inputClass}
              placeholder={t('onboarding.businessNamePlaceholder')}
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            />

            <p className="text-base font-medium text-text-2 mt-5 mb-3">{t('onboarding.businessType')}</p>
            <div className="space-y-2">
              {modeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleMode(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                    form.mode === opt.value
                      ? 'border-accent bg-accent-soft'
                      : 'border-border bg-white hover:border-border'
                  }`}
                >
                  <span className={`font-semibold text-base ${form.mode === opt.value ? 'text-accent' : 'text-text-1'}`}>
                    {opt.title}
                  </span>
                  <p className="text-xs text-text-2 mt-0.5">{opt.subtitle}</p>
                </button>
              ))}
            </div>

            <p className="text-base font-medium text-text-2 mt-5 mb-3">{t('settings.language')}</p>
            <div className="flex gap-3">
              {(['UZBEK', 'RUSSIAN', 'ENGLISH'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => selectLanguage(lang)}
                  className={`flex-1 py-2.5 rounded-xl border text-base font-semibold transition-colors ${
                    form.language === lang
                      ? 'bg-accent text-accent-on border-accent'
                      : 'border-border text-text-2 hover:border-border-strong'
                  }`}
                >
                  {languageLabels[lang]}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.businessName.trim()}
              className="w-full mt-8 bg-accent text-accent-on py-3 rounded-xl text-base font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {t('onboarding.continue')}
            </button>
          </div>
        )}

        {/* ── Step 2: Telegram bot ── */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="text-sm text-accent mb-4">
              ← {t('common.back')}
            </button>
            <h1 className="text-2xl font-bold text-text-1">{t('onboarding.botStepTitle')}</h1>
            <p className="text-base text-text-2 mt-1 mb-6">
              {t('onboarding.botStepSubtitle')}
            </p>

            <div className="space-y-3 mb-6">
              {botInstructions.map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-on text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-base text-text-2">{text}</p>
                </div>
              ))}
            </div>

            <label className="block text-base font-medium text-text-2 mb-1">
              {t('settings.pasteToken')}
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
              <p className="text-error-strong text-xs mt-1">{tokenError}</p>
            )}

            {!tokenVerified ? (
              <button
                onClick={handleVerify}
                disabled={verifying || !form.botToken}
                className="w-full mt-4 bg-accent text-accent-on py-3 rounded-xl text-base font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {verifying ? t('login.verifying') : t('onboarding.verifyToken')}
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 mt-3 text-success-strong text-base font-semibold">
                  <span>✓</span>
                  <span>{t('onboarding.botReady', { username: form.botUsername })}</span>
                </div>
                <button
                  onClick={() => setStep(3)}
                  className="w-full mt-4 bg-accent text-accent-on py-3 rounded-xl text-base font-semibold hover:bg-accent-hover transition-colors"
                >
                  {t('onboarding.continue')}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Review & launch ── */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="text-sm text-accent mb-4">
              ← {t('common.back')}
            </button>
            <h1 className="text-2xl font-bold text-text-1">{t('onboarding.reviewTitle')}</h1>
            <p className="text-base text-text-2 mt-1 mb-6">{t('onboarding.reviewSubtitle')}</p>

            <div className="border border-border rounded-xl overflow-hidden mb-6">
              {[
                { label: t('settings.businessName'), value: form.businessName },
                { label: t('onboarding.reviewType'), value: modeTitles[form.mode] },
                { label: t('settings.language'), value: languageLabels[form.language] },
                { label: t('onboarding.reviewBot'), value: `@${form.botUsername}` },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  className={`flex justify-between px-5 py-3.5 text-base ${
                    i < arr.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <span className="text-text-2">{row.label}</span>
                  <span className="font-semibold text-text-1">{row.value}</span>
                </div>
              ))}
            </div>

            {completionError && (
              <p className="text-error-strong text-base mb-3">{completionError}</p>
            )}
            <button
              onClick={goToVerify}
              className="w-full bg-accent text-accent-on py-3.5 rounded-xl text-base font-bold hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {t('onboarding.continue')}
            </button>
          </div>
        )}

        {/* ── Step 4: Verify via Telegram (owner auth) ── */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} className="text-sm text-accent mb-4">
              ← {t('common.back')}
            </button>
            <h1 className="text-2xl font-bold text-text-1">{t('onboarding.verifyTitle')}</h1>
            <p className="text-base text-text-2 mt-1 mb-6">
              {t('onboarding.verifySubtitle')}
            </p>

            <ol className="space-y-3 mb-5">
              {verifySteps.map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-on text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-base text-text-2">{text}</p>
                </li>
              ))}
            </ol>

            <button
              onClick={openTelegram}
              disabled={enrollLoading}
              className="w-full mb-5 border-2 border-accent text-accent py-3 rounded-xl text-base font-semibold hover:bg-accent-soft transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 7.2l-1.68 7.93c-.12.56-.44.7-.9.43l-2.5-1.84-1.2 1.16c-.13.13-.25.25-.51.25l.18-2.56 4.64-4.19c.2-.18-.05-.28-.31-.1L7.92 14.36l-2.47-.77c-.54-.17-.55-.54.11-.8l9.63-3.72c.46-.17.86.11.7.79l.01.34z" />
              </svg>
              {enrollLoading
                ? t('onboarding.preparing')
                : linkExpired
                  ? t('onboarding.getNewLink')
                  : t('onboarding.connectTelegram')}
            </button>

            <label className="block text-base font-medium text-text-2 mb-1">
              {t('onboarding.codeLabel')}
            </label>
            <input
              className={`${inputClass} tracking-[0.4em] text-center font-semibold`}
              inputMode="numeric"
              maxLength={6}
              placeholder={t('login.codePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />

            {/* Consent — captured once, here at enrollment. */}
            <label className="flex items-start gap-2.5 mt-5 text-base text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generalConsent}
                onChange={(e) => setGeneralConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <GeneralConsentText />
            </label>
            <label className="flex items-start gap-2.5 mt-3 text-base text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={crossBorderConsent}
                onChange={(e) => setCrossBorderConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span>{t('login.consentCrossBorder')}</span>
            </label>

            {enrollError && <p className="text-error-strong text-base mt-3">{enrollError}</p>}

            <button
              onClick={handleVerifyAndLaunch}
              disabled={
                completing ||
                (!enrolled && (code.length < 6 || !generalConsent || !crossBorderConsent))
              }
              className="w-full mt-5 bg-accent text-accent-on py-3.5 rounded-xl text-base font-bold hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {completing ? t('login.verifying') : t('onboarding.verifyAndLaunch')}
            </button>
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === 5 && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-success flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-text-1 mb-3">{t('onboarding.doneTitle')}</h1>
            <p className="text-text-2 text-base mb-8">
              {t('onboarding.doneSubtitle')}
            </p>
            <div className="border-2 border-accent rounded-xl px-5 py-4 flex items-center gap-3 mb-8 text-left">
              <svg className="w-7 h-7 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 7.2l-1.68 7.93c-.12.56-.44.7-.9.43l-2.5-1.84-1.2 1.16c-.13.13-.25.25-.51.25l.18-2.56 4.64-4.19c.2-.18-.05-.28-.31-.1L7.92 14.36l-2.47-.77c-.54-.17-.55-.54.11-.8l9.63-3.72c.46-.17.86.11.7.79l.01.34z"/>
              </svg>
              <span className="font-semibold text-accent flex-1">@{form.botUsername}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(form.botLink)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="text-accent text-xs font-semibold hover:text-accent"
              >
                {copied ? t('onboarding.copied') : t('onboarding.copyLink')}
              </button>
            </div>
            <button
              onClick={() => {
                // Hard nav so the BusinessProvider re-initializes with the new
                // session and the dashboard loads the freshly-created business.
                window.location.href = '/'
              }}
              className="w-full bg-accent text-accent-on py-3.5 rounded-xl text-base font-bold hover:bg-accent-hover transition-colors"
            >
              {t('onboarding.goToDashboard')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
