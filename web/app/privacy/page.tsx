'use client'

// Public privacy policy. No auth gate: renders for logged-out visitors, not
// wrapped in AuthLayout. All changeable content and legal body text come from
// web/lib/legalConfig.ts; tokens are substituted at render time.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  legalConfig,
  privacyPolicy,
  privacyTitles,
  offerTitles,
  dateLineByLang,
} from '@/lib/legalConfig'
import { resolveLang, applyTokens, FALLBACK_LANG, type Lang } from '@/lib/resolveLang'

const LANG_ORDER: Lang[] = ['uz', 'ru', 'en']
const LANG_LABELS: Record<Lang, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
}

// The processor list index within the privacy policy (section 5, "Third parties").
const PROCESSORS_SECTION_INDEX = 4

export default function PrivacyPage() {
  // Render with the fallback language on the server and first client paint, then
  // resolve the real language after mount to avoid a hydration mismatch.
  const [lang, setLang] = useState<Lang>(FALLBACK_LANG)
  useEffect(() => {
    setLang(resolveLang())
  }, [])

  const sections = privacyPolicy[lang]

  return (
    <main className="min-h-screen bg-surface text-text-1">
      <div className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-20">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {privacyTitles[lang]}
        </h1>
        <p className="mt-2 text-sm text-text-2">
          {applyTokens(dateLineByLang[lang], legalConfig)}
        </p>

        {/* Language toggle: keyboard-operable buttons; the active option is
            distinguished by weight and an underline in addition to the accent. */}
        <div role="group" aria-label="Language" className="mt-6 flex gap-5 text-sm">
          {LANG_ORDER.map((code) => {
            const active = code === lang
            return (
              <button
                key={code}
                type="button"
                aria-pressed={active}
                onClick={() => setLang(code)}
                className={
                  active
                    ? 'font-bold text-accent underline underline-offset-4'
                    : 'font-medium text-text-2 hover:text-text-1'
                }
              >
                {LANG_LABELS[code]}
              </button>
            )
          })}
        </div>

        <div className="mt-12 space-y-10">
          {sections.map((section, index) => (
            <section key={index}>
              <h2 className="text-lg font-bold">
                {index + 1}. {section.heading}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed">
                {section.paragraphs.map((paragraph, pIndex) => (
                  <p key={pIndex}>{applyTokens(paragraph, legalConfig)}</p>
                ))}
              </div>

              {/* Section 5: third parties, rendered from config.processors as a
                  plain list (no boxed card). Surrounding paragraph stays a TODO. */}
              {index === PROCESSORS_SECTION_INDEX && (
                <ul className="mt-4 space-y-2 leading-relaxed">
                  {legalConfig.processors.map((processor) => (
                    <li key={processor.name}>
                      <span className="font-semibold">{processor.name}.</span>{' '}
                      <span className="text-text-2">
                        {applyTokens(processor.purpose, legalConfig)}.{' '}
                        {applyTokens(processor.location, legalConfig)}.
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* Footer: link to the OTHER document using a relative path. */}
        <footer className="mt-16 border-t border-border pt-6 text-sm">
          <Link
            href="/offer"
            className="text-accent underline underline-offset-4"
          >
            {offerTitles[lang]}
          </Link>
        </footer>
      </div>
    </main>
  )
}
