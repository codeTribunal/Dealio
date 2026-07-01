// Language resolution and token substitution for the public legal pages.
// Client only: resolveLang reads window.location and navigator at call time, so
// call it after mount (in an effect) to avoid a hydration mismatch.

export type Lang = 'uz' | 'ru' | 'en'

// LAST-RESORT fallback ONLY. Steps 1 (URL ?lang) and 2 (browser language) take
// precedence whenever they resolve. Our market is Russian first, so ru is the
// single named fallback constant, not a hardcoded default.
export const FALLBACK_LANG: Lang = 'ru'

function isLang(value: string | null | undefined): value is Lang {
  return value === 'uz' || value === 'ru' || value === 'en'
}

// Resolve the initial language in priority order:
//   1. URL query ?lang= (uz | ru | en). The bot appends this from the business
//      language setting. Used whenever present and valid.
//   2. Browser Accept-Language via navigator.languages / navigator.language.
//   3. FALLBACK_LANG (ru), only when neither of the above resolves.
// The on-page toggle can override the result regardless of how it resolved.
export function resolveLang(): Lang {
  // 1. URL query param.
  try {
    const param = new URLSearchParams(window.location.search).get('lang')
    const normalized = param ? param.toLowerCase() : null
    if (isLang(normalized)) return normalized
  } catch {
    // window not available (e.g. server render): fall through.
  }

  // 2. Browser languages (strip any region, e.g. "ru-RU" becomes "ru").
  try {
    const candidates: string[] = []
    if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages)
    if (navigator.language) candidates.push(navigator.language)
    for (const candidate of candidates) {
      const base = candidate.toLowerCase().split('-')[0]
      if (isLang(base)) return base
    }
  } catch {
    // navigator not available: fall through.
  }

  // 3. Last resort.
  return FALLBACK_LANG
}

// Pure token substitution over a rendered string. Replaces every {{token}}:
//   - key present in config: the config value (even an unfilled placeholder),
//     stringified.
//   - key absent (unfilled or misspelled token): left LITERALLY as {{token}} so
//     it is visible on the page rather than silently blanked.
// Non-scalar config values (e.g. the processors array) have no meaningful inline
// form, so their tokens are also left literal. Never throws.
export function applyTokens(text: string, config: Record<string, unknown>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (whole: string, key: string) => {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      const value = config[key]
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value)
      }
      return whole
    }
    return whole
  })
}
