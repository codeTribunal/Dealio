export function formatUZS(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return amount.toLocaleString('uz-UZ').replace(/,/g, ' ') + ' UZS'
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
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

// Display an instant as a Tashkent calendar date.
export function formatDateTashkent(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    timeZone: 'Asia/Tashkent',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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
