import Cookies from 'js-cookie'

const TOKEN_KEY = 'crm_token'

export function getToken(): string | null {
  return Cookies.get(TOKEN_KEY) || null
}

export function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, { expires: 30, sameSite: 'strict' })
}

export function clearToken(): void {
  Cookies.remove(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
