'use client'
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import en from './en.json'
import uz from './uz.json'
import ru from './ru.json'
import Cookies from 'js-cookie'

export type Locale = 'en' | 'uz' | 'ru'
const dictionaries: Record<Locale, unknown> = { en, uz, ru }
const LOCALE_COOKIE = 'crm_locale'

interface I18nValue {
  locale: Locale
  t: (key: string, params?: Record<string, string | number>) => string
  setLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nValue>({
  locale: 'uz',
  t: (key) => key,
  setLocale: () => {},
})

function resolveInitial(): Locale {
  if (typeof window === 'undefined') return 'uz'
  const cookie = Cookies.get(LOCALE_COOKIE) as Locale | undefined
  if (cookie && ['en', 'uz', 'ru'].includes(cookie)) return cookie
  const browser = navigator.language.slice(0, 2)
  if (browser === 'ru') return 'ru'
  if (browser === 'en') return 'en'
  return 'uz'
}

// Get nested value by dot path: "nav.customers"
function getNested(obj: unknown, path: string): string | undefined {
  const result = path
    .split('.')
    .reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], obj)
  return typeof result === 'string' ? result : undefined
}

// Map business.language enum to locale code and back.
export function enumToCode(languageEnum: string): Locale {
  switch (languageEnum) {
    case 'RUSSIAN':
      return 'ru'
    case 'ENGLISH':
      return 'en'
    default:
      return 'uz'
  }
}

export function codeToEnum(code: Locale): string {
  switch (code) {
    case 'ru':
      return 'RUSSIAN'
    case 'en':
      return 'ENGLISH'
    default:
      return 'UZBEK'
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('uz')

  useEffect(() => {
    setLocaleState(resolveInitial())
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    Cookies.set(LOCALE_COOKIE, next, { expires: 365, sameSite: 'strict' })
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = dictionaries[locale]
      let value = getNested(dict, key) ?? getNested(dictionaries.en, key) ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v))
        }
      }
      return value
    },
    [locale],
  )

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

// True once the locale cookie has been explicitly set by the user.
export function hasLocaleCookie(): boolean {
  return Cookies.get(LOCALE_COOKIE) !== undefined
}
