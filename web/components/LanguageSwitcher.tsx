'use client'
import { useI18n, type Locale } from '@/lib/i18n/i18nContext'

// Language names are always shown in their own language, never translated.
const OPTIONS: { code: Locale; label: string }[] = [
  { code: 'uz', label: "O'zbek" },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]

/**
 * Segmented language selector.
 * - On login (no business yet) pass no onChange — it only updates the UI locale.
 * - On settings, pass onChange to also persist business.language.
 */
export default function LanguageSwitcher({
  onChange,
}: {
  onChange?: (code: Locale) => void
}) {
  const { locale, setLocale } = useI18n()

  const select = (code: Locale) => {
    setLocale(code)
    onChange?.(code)
  }

  return (
    <div className="inline-flex rounded-lg border border-border overflow-hidden">
      {OPTIONS.map((o) => {
        const active = locale === o.code
        return (
          <button
            key={o.code}
            type="button"
            onClick={() => select(o.code)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-accent text-accent-on'
                : 'bg-surface text-text-2 hover:bg-surface-2'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
