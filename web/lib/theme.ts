import Cookies from 'js-cookie'

export type Theme = 'light' | 'dark'

const COOKIE = 'crm_theme'

export function getTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark'
  }
  const c = Cookies.get(COOKIE)
  return c === 'dark' ? 'dark' : 'light'
}

export function setTheme(t: Theme): void {
  Cookies.set(COOKIE, t, { expires: 365, sameSite: 'lax' })
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', t === 'dark')
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
