'use client'
import { useI18n } from '@/lib/i18n/i18nContext'

export type BadgeType = 'order' | 'payment' | 'appointment' | 'project'

type Tone = 'success' | 'warning' | 'error' | 'neutral'

// Semantic mapping — fixed regardless of brand accent.
// success = positive terminal, warning = OWNER action needed / in progress,
// error = terminal failure, neutral = healthy resting state (nothing to do).
// NEW and payment-PENDING are neutral so a fresh order never shows two amber
// pills — the caution tone is reserved for states that actually ask for
// attention (PAYMENT_RECEIVED above all). Mirrored in the Flutter AppBadge.
const TONES: Record<BadgeType, Record<string, Tone>> = {
  order: {
    NEW: 'neutral',
    PREPARING: 'warning',
    READY: 'success',
    DELIVERED: 'success',
    CANCELLED: 'error',
  },
  payment: {
    PENDING: 'neutral',
    PAYMENT_RECEIVED: 'warning',
    CONFIRMED: 'success',
  },
  appointment: {
    REQUESTED: 'warning',
    CONFIRMED: 'success',
    COMPLETED: 'success',
    CANCELLED: 'error',
    NO_SHOW: 'error',
  },
  project: {
    PROPOSAL_SENT: 'warning',
    IN_PROGRESS: 'warning',
    REVIEW: 'warning',
    COMPLETED: 'success',
    CANCELLED: 'error',
  },
}

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success-soft text-success-strong',
  warning: 'bg-warning-soft text-warning-strong',
  error: 'bg-error-soft text-error-strong',
  neutral: 'bg-surface-2 text-text-2 border border-border',
}

interface BadgeProps {
  status: string
  type: BadgeType
}

export function Badge({ status, type }: BadgeProps) {
  const { t } = useI18n()
  const tone: Tone = TONES[type][status] ?? 'warning'
  const label = t(`status.${status}`)
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  )
}
