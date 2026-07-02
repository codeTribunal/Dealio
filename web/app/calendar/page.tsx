'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/icons/Icon'
import { useBusiness, useModeGuard } from '@/lib/businessContext'
import { useI18n } from '@/lib/i18n/i18nContext'
import { getOrders, getProjects } from '@/lib/api'
import { formatUZS, formatDate } from '@/lib/format'

// One dated row on the schedule.
interface ScheduleItem {
  date: string // ISO
  title: string
  subtitle?: string
  status: string
  kind: 'order' | 'project' | 'milestone'
  href: string
  trailing?: string
}

// Milestone status pill — the Badge primitive doesn't cover milestone codes
// (same approach as the projects page), so render a small token-driven span.
function milestoneTone(status: string): string {
  switch (status) {
    case 'SUBMITTED_FOR_REVIEW':
      return 'bg-warning-soft text-warning-strong'
    case 'APPROVED':
      return 'bg-success-soft text-success-strong'
    case 'PAYMENT_RECEIVED':
      return 'bg-accent-soft text-accent'
    default:
      return 'bg-surface-2 text-text-2 border border-border'
  }
}
function milestoneLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    SUBMITTED_FOR_REVIEW: 'In review',
    APPROVED: 'Approved',
    PAYMENT_RECEIVED: 'Paid',
  }
  return map[status] || status
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
// Local calendar-day key (YYYY-MM-DD) so grouping matches the displayed label.
function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function CalendarPage() {
  const guardReady = useModeGuard(['PRODUCTS', 'FREELANCE'])
  const { business } = useBusiness()
  const { t } = useI18n()
  const mode = business?.mode
  const [items, setItems] = useState<ScheduleItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!guardReady || !mode) return
    let cancelled = false
    setItems(null)
    setError(null)
    const run = async (): Promise<ScheduleItem[]> => {
      if (mode === 'FREELANCE') {
        const { projects } = await getProjects({ limit: 200 })
        const out: ScheduleItem[] = []
        for (const p of projects) {
          if (p.deadline) {
            out.push({
              date: p.deadline,
              title: p.name,
              subtitle: t('calendar.projectDeadline'),
              status: p.status,
              kind: 'project',
              href: `/projects/${p.id}`,
            })
          }
          for (const m of p.milestones) {
            if (m.dueDate) {
              out.push({
                date: m.dueDate,
                title: m.name,
                subtitle: p.name,
                status: m.status,
                kind: 'milestone',
                href: `/projects/${p.id}`,
              })
            }
          }
        }
        return out
      }
      // PRODUCTS → orders by delivery date.
      const { orders } = await getOrders({ limit: 200 })
      return orders
        .filter((o) => o.deliveryDate)
        .map((o) => ({
          date: o.deliveryDate as string,
          title: t('calendar.orderNumber', { n: o.orderNumber }),
          status: o.orderStatus,
          kind: 'order' as const,
          href: `/orders/${o.id}`,
          trailing: formatUZS(o.total),
        }))
    }
    run()
      .then((r) => !cancelled && setItems(r))
      .catch(() => !cancelled && setError(t('calendar.failedLoad')))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardReady, mode, retry])

  // Group by calendar day, soonest/earliest first (overdue above Today, then
  // Today → Tomorrow → later), matching the Today/Tomorrow/date ordering.
  const groups = useMemo(() => {
    const byDay = new Map<string, ScheduleItem[]>()
    for (const it of items ?? []) {
      const key = dayKey(it.date)
      const arr = byDay.get(key)
      if (arr) arr.push(it)
      else byDay.set(key, [it])
    }
    return Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])

  function dayLabel(iso: string): string {
    const d = new Date(iso)
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diff = Math.round((dd.getTime() - today.getTime()) / 86400000)
    if (diff === 0) return t('common.today')
    if (diff === 1) return t('calendar.tomorrow')
    if (diff === -1) return t('calendar.yesterday')
    return formatDate(iso)
  }

  if (!guardReady) return null

  const emptyTitle =
    mode === 'FREELANCE'
      ? t('calendar.emptyDeadlinesTitle')
      : t('calendar.emptyOrdersTitle')
  const emptyMessage =
    mode === 'FREELANCE'
      ? t('calendar.emptyDeadlinesMessage')
      : t('calendar.emptyOrdersMessage')

  return (
    <AuthLayout title={t('calendar.title')}>
      <div className="max-w-2xl w-full">
        {error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="text-base text-error-strong">{error}</p>
            <Button variant="primary" onClick={() => setRetry((r) => r + 1)}>
              {t('common.tryAgain')}
            </Button>
          </div>
        ) : items === null ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
            <Icon name="calendar" size={40} className="text-text-3" />
            <p className="text-base font-semibold text-text-1">{emptyTitle}</p>
            <p className="text-base text-text-2">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(([key, rows]) => (
              <div key={key}>
                <p className="text-lg font-bold text-text-2 mb-2 px-1">
                  {dayLabel(rows[0].date)}
                </p>
                <div className="space-y-2">
                  {rows.map((it, i) => (
                    <Link
                      key={`${it.href}-${it.kind}-${i}`}
                      href={it.href}
                      className="flex items-center gap-3 bg-surface rounded-lg border border-border px-4 py-3 hover:border-border-strong hover:shadow-sm transition-all"
                      style={{ transitionDuration: 'var(--dur-base)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-text-1 truncate">
                          {it.title}
                        </p>
                        {it.subtitle && (
                          <p className="text-xs text-text-2 truncate mt-0.5">
                            {it.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {it.kind === 'milestone' ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold ${milestoneTone(it.status)}`}
                          >
                            {milestoneLabel(it.status)}
                          </span>
                        ) : (
                          <Badge status={it.status} type={it.kind} />
                        )}
                        {it.trailing && (
                          <p className="text-base font-semibold text-text-1 tabular-nums">
                            {it.trailing}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
