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
  })
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return formatDate(dateString)
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
