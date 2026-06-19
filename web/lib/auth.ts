import Cookies from 'js-cookie'

const TOKEN_KEY = 'crm_token'

export function getToken(): string | null {
  return Cookies.get(TOKEN_KEY) || null
}

export function setToken(token: string): void {
  // 30-day cookie — matches the backend's 30-day JWT so a returning user stays
  // logged in across sessions until the token actually expires.
  Cookies.set(TOKEN_KEY, token, { expires: 30, sameSite: 'strict' })
}

export function clearToken(): void {
  Cookies.remove(TOKEN_KEY)
}

/** Decode the `exp` (seconds since epoch) from a JWT payload, or null. */
function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number }
    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

/**
 * True only when a token is present AND not expired. An expired token is
 * cleared as a side effect so the next check sends the user to the arrival
 * screen (the "re-verify every 30 days" behavior).
 */
export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  const exp = decodeJwtExp(token)
  if (exp !== null && exp * 1000 <= Date.now()) {
    clearToken()
    return false
  }
  return true
}

/** Decode the `phone` claim from the stored JWT, or null. The token is signed
 *  as { userId, phone }, so this works without re-fetching the user. */
export function getPhone(): string | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { phone?: string }
    return typeof json.phone === 'string' ? json.phone : null
  } catch {
    return null
  }
}
