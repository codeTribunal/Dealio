// Localized lowercase currency word, kept in sync with the active app language
// by the i18n provider (setCurrencyLocale). Read-inside so the many formatUZS
// call sites don't each need the locale passed in. Defaults to the app's
// default language ('uz').
type CurrencyLocale = 'en' | 'uz' | 'ru'
let _currencyLocale: CurrencyLocale = 'uz'

export function setCurrencyLocale(locale: string): void {
  _currencyLocale = locale === 'en' || locale === 'ru' ? locale : 'uz'
}

// The current localized currency word: en→soum, uz→so'm (straight apostrophe
// U+0027), ru→сум.
export function currencyWord(): string {
  switch (_currencyLocale) {
    case 'en':
      return 'soum'
    case 'ru':
      return 'сум'
    default:
      return "so'm"
  }
}

export function formatUZS(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return amount.toLocaleString('uz-UZ').replace(/,/g, ' ') + ' ' + currencyWord()
}

// ── Localized dates ──────────────────────────────────────────────────────────
// Spec (CLAUDE.md): "15 yanvar 2026" (uz) / "15 января 2026" (ru). Browser
// Intl support for the uz locale is unreliable, and ru needs the genitive
// month for this format, so month/weekday names are explicit tables. Kept in
// sync with the Flutter app (app/lib/shared/utils/format.dart).
const MONTHS: Record<CurrencyLocale, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
}

// Index 0 = Sunday, matching Date.getDay().
const WEEKDAYS: Record<CurrencyLocale, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  uz: ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'],
  ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
}

const MONTHS_SHORT: Record<CurrencyLocale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
  ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
}

/** Localized short month name for chart axes and compact labels. */
export function formatMonthShort(monthIndex: number): string {
  return MONTHS_SHORT[_currencyLocale][((monthIndex % 12) + 12) % 12]
}

function composeDate(day: number, monthIndex: number, year: number): string {
  return `${day} ${MONTHS[_currencyLocale][monthIndex]} ${year}`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return composeDate(date.getDate(), date.getMonth(), date.getFullYear())
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${formatDate(dateString)}, ${time}`
}

/** Localized weekday name for a YYYY-MM-DD date string or ISO instant. */
export function formatWeekday(dateString: string): string {
  // Date-only strings parse as UTC midnight; anchor to noon so the weekday
  // can't shift a day in western-timezone browsers.
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? dateString + 'T12:00:00' : dateString,
  )
  return WEEKDAYS[_currencyLocale][date.getDay()]
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

type TFn = (key: string, params?: Record<string, string | number>) => string

export function formatRelativeTime(dateString: string, t?: TFn): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (!t) {
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return formatDate(dateString)
  }
  if (diffDays === 0) return t('common.today')
  if (diffDays === 1) return t('common.yesterday')
  if (diffDays < 7) return t('common.daysAgo', { count: diffDays })
  if (diffDays < 30) return t('common.weeksAgo', { count: Math.floor(diffDays / 7) })
  return formatDate(dateString)
}

// ── Tashkent (UTC+5, fixed, no DST) ─────────────────────────────────────────
// The scheduling backend treats every stored instant as Tashkent wall-clock at a
// fixed +5 offset. These helpers convert in both directions independent of the
// browser's own timezone, so blocked slots are correct everywhere.
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000

// Build the UTC ISO instant for a Tashkent wall-clock date + "HH:MM".
export function tashkentWallClockToIso(dateStr: string, hhmm: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m] = hhmm.split(':').map(Number)
  const utcMs = Date.UTC(y, mo - 1, d, h, m, 0, 0) - TASHKENT_OFFSET_MS
  return new Date(utcMs).toISOString()
}

// Display an instant as a Tashkent calendar date (localized month name).
export function formatDateTashkent(dateString: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date(dateString))
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)
  return composeDate(get('day'), get('month') - 1, get('year'))
}

// Display an instant as a Tashkent 24h time "HH:MM".
export function formatTimeTashkent(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatOrderStatus(status: string): string {
  const map: Record<string, string> = {
    NEW: 'New',
    PREPARING: 'Preparing',
    READY: 'Ready',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  }
  return map[status] || status
}

export function formatPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    PAYMENT_RECEIVED: 'Payment received',
    CONFIRMED: 'Confirmed',
  }
  return map[status] || status
}

export function formatProjectStatus(status: string): string {
  const map: Record<string, string> = {
    PROPOSAL_SENT: 'Proposal sent',
    IN_PROGRESS: 'In progress',
    REVIEW: 'In review',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  }
  return map[status] || status
}

export function formatAppointmentStatus(status: string): string {
  const map: Record<string, string> = {
    REQUESTED: 'Requested',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No-show',
  }
  return map[status] || status
}
