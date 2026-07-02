'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'
import { StatCard } from '@/components/ui/StatCard'
import { QuickActions, type QuickActionItem } from '@/components/ui/QuickActions'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Icon, type IconName } from '@/components/icons/Icon'
import { useBusiness } from '@/lib/businessContext'
import { useI18n } from '@/lib/i18n/i18nContext'
import { getHome, getAnalytics } from '@/lib/api'
import { formatUZS, formatRelativeTime } from '@/lib/format'
import type { HomeData, AnalyticsData, Business } from '@/types'

interface ActivityRow {
  id: string
  icon: IconName
  href: string
  text: string
  meta: string
  amount?: number
  at: string
}

interface QueueRow {
  id: string
  href: string
  name: string
  meta: string
  amount: number
  at: string
}

// The payment queue: customers who tapped "I have paid" and are waiting for
// the owner to confirm. Orders and in-advance appointments, newest claim
// first. Rows navigate to the detail screen (payment proof + confirm sheet) —
// never confirm blind from home.
function buildQueue(
  home: HomeData,
  t: ReturnType<typeof useI18n>['t'],
): QueueRow[] {
  const rows: QueueRow[] = []
  for (const p of home.pendingPayments) {
    rows.push({
      id: `order-${p.id}`,
      href: `/orders/${p.id}`,
      name: p.customer.name,
      meta: t('home.queueOrderMeta', { n: p.orderNumber }),
      amount: p.total,
      at: p.updatedAt,
    })
  }
  for (const a of home.pendingAppointmentPayments ?? []) {
    rows.push({
      id: `appt-${a.id}`,
      href: '/appointments',
      name: a.customer.name,
      meta: a.serviceName,
      amount: a.price,
      at: a.updatedAt,
    })
  }
  rows.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
  return rows
}

function buildQuickActions(
  business: Business | null,
  router: ReturnType<typeof useRouter>,
  t: ReturnType<typeof useI18n>['t'],
): QuickActionItem[] {
  // Per-mode quick actions, kept IDENTICAL to the Flutter home (intentionally
  // duplicating the sidebar — the prior no-duplication rule is reversed):
  //   SERVICES  → Services + Staff
  //   PRODUCTS  → Catalog + Calendar
  //   FREELANCE → Staff + Calendar
  // (A FREELANCE "Todo" button is still omitted — no Todo screen exists yet.)
  // Reads the live business.mode (same source as the sidebar); defaults to
  // SERVICES until business loads.
  const mode = business?.mode ?? 'SERVICES'

  if (mode === 'PRODUCTS') {
    return [
      { icon: 'catalog', label: t('nav.catalog'), onClick: () => router.push('/catalog') },
      { icon: 'calendar', label: t('nav.calendar'), onClick: () => router.push('/calendar') },
    ]
  }
  if (mode === 'SERVICES') {
    return [
      { icon: 'catalog', label: t('nav.services'), onClick: () => router.push('/services') },
      { icon: 'staff', label: t('nav.staff'), onClick: () => router.push('/staff') },
    ]
  }
  if (mode === 'FREELANCE') {
    return [
      { icon: 'staff', label: t('nav.staff'), onClick: () => router.push('/staff') },
      { icon: 'calendar', label: t('nav.calendar'), onClick: () => router.push('/calendar') },
    ]
  }
  return []
}

function buildActivity(
  home: HomeData,
  t: ReturnType<typeof useI18n>['t'],
): ActivityRow[] {
  const rows: ActivityRow[] = []

  for (const o of home.todayOrders) {
    rows.push({
      id: `order-${o.id}`,
      icon: 'orders',
      href: `/orders/${o.id}`,
      text: t('home.activityNewOrder', { n: o.orderNumber }),
      meta: o.customer.name,
      amount: o.total,
      at: o.createdAt,
    })
  }
  for (const c of home.newCustomers) {
    rows.push({
      id: `customer-${c.id}`,
      icon: 'customers',
      href: `/customers/${c.id}`,
      text: t('home.activityNewCustomer'),
      meta: c.name,
      at: c.createdAt,
    })
  }
  for (const m of home.recentMilestones) {
    rows.push({
      id: `milestone-${m.id}`,
      icon: 'projects',
      href: `/projects`,
      text: t('home.activityMilestoneApproved'),
      meta: `${m.milestoneName} — ${m.projectName}`,
      at: m.updatedAt,
    })
  }

  // Newest first, cap at 10
  rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return rows.slice(0, 10)
}

export default function HomePage() {
  const router = useRouter()
  const { business } = useBusiness()
  const { t } = useI18n()
  const [home, setHome] = useState<HomeData | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([getHome(), getAnalytics()])
      .then(([h, a]) => {
        setHome(h)
        setAnalytics(a)
      })
      .catch(() => setError(t('home.failedLoad')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken])

  const quickActions = useMemo(
    () => buildQuickActions(business, router, t),
    [business, router, t],
  )

  const activity = useMemo(() => (home ? buildActivity(home, t) : []), [home, t])
  const queue = useMemo(() => (home ? buildQueue(home, t) : []), [home, t])

  // Mode-aware home cards. business.mode is a single value, so it selects the
  // one "today" activity metric that matters (orders / appointments / projects);
  // Pending payments is universal. This is why a products business never sees a
  // "Today's appointments" card. SERVICES is the default until business loads.
  const mode = business?.mode ?? 'SERVICES'

  return (
    <AuthLayout title={t('home.title')}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <p className="text-base font-semibold text-error-strong">{error}</p>
          <Button variant="primary" onClick={() => setRetryToken((tk) => tk + 1)}>
            {t('common.tryAgain')}
          </Button>
        </div>
      ) : home && analytics ? (
        <div className="space-y-6">
          {/* Greeting */}
          {business && (
            <h1
              className="text-text-1"
              style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-extra)', lineHeight: 1.1 }}
            >
              {business.name}
            </h1>
          )}

          {/* Payment queue — the one thing the owner must act on. Hidden when
              empty: the queue vanishing after the last confirm IS the feedback,
              and home stays calm instead of celebrating nothing. */}
          {queue.length > 0 && (
            <Card padded={false} className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 bg-accent-soft">
                <p className="text-lg font-bold text-text-1">{t('home.queueTitle')}</p>
                <span className="min-w-7 h-7 px-2 rounded-pill bg-accent text-accent-on text-sm font-bold inline-flex items-center justify-center flex-shrink-0">
                  {queue.length}
                </span>
              </div>
              {queue.slice(0, 5).map((row) => (
                <Link
                  key={row.id}
                  href={row.href}
                  className="flex items-center gap-4 px-5 py-3.5 border-t border-border hover:bg-surface-2 transition-colors"
                  style={{ transitionDuration: 'var(--dur-base)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-text-1 truncate">{row.name}</p>
                    <p className="text-xs text-text-2 truncate">{row.meta}</p>
                  </div>
                  <p className="text-base font-bold text-text-1 tabular-nums flex-shrink-0">
                    {formatUZS(row.amount)}
                  </p>
                </Link>
              ))}
              {queue.length > 5 && (
                <Link
                  href={home.pendingPayments.length > 0 ? '/orders' : '/appointments'}
                  className="block px-5 py-3 border-t border-border text-base font-semibold text-accent hover:text-accent-hover"
                >
                  {t('home.queueViewAll', { n: queue.length })}
                </Link>
              )}
            </Card>
          )}

          {/* StatCard bento row — mode-aware "today" activity card
              (orders / appointments / projects) + realised revenue. Revenue is
              deliberately a secondary card, not a hero: the actionable queue
              above owns the top of the page. */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label={
                mode === 'PRODUCTS'
                  ? t('home.statOrdersToday')
                  : mode === 'FREELANCE'
                    ? t('home.statProjectsToday')
                    : t('home.statAppointmentsToday')
              }
              value={String(
                mode === 'PRODUCTS'
                  ? home.todayOrders.length
                  : mode === 'FREELANCE'
                    ? home.todayProjects.length
                    : home.todayAppointments.length,
              )}
            />
            <StatCard
              label={t('home.revenueLabel')}
              value={formatUZS(analytics.revenueThisMonth)}
              money={analytics.revenueThisMonth > 0}
            />
          </div>

          {/* QuickActions — neumorphic tiles. Hidden when empty (PRODUCTS &
              FREELANCE have no non-sidebar actions), so the row collapses with
              no empty card or leftover spacing. */}
          {quickActions.length > 0 && <QuickActions items={quickActions} />}

          {/* Activity feed */}
          <Card padded={false}>
            <div className="px-5 pt-5">
              <CardHeader
                title={t('home.activityTitle')}
                right={
                  activity.length > 0 ? (
                    <Link
                      // Mode-relevant target: the feed is mostly orders for a
                      // seller and milestones for a freelancer — "view all"
                      // should land where those live.
                      href={
                        mode === 'PRODUCTS'
                          ? '/orders'
                          : mode === 'FREELANCE'
                            ? '/projects'
                            : '/customers'
                      }
                      className="text-base font-semibold text-accent hover:text-accent-hover"
                    >
                      {t('home.activityViewAll')}
                    </Link>
                  ) : undefined
                }
              />
            </div>

            {activity.length === 0 ? (
              <div className="text-center py-12 text-base text-text-2">
                {t('home.activityEmpty')}
              </div>
            ) : (
              <div>
                {activity.map((row) => (
                  <Link
                    key={row.id}
                    href={row.href}
                    className="flex items-center gap-4 px-5 py-3 border-t border-border hover:bg-surface-2 transition-colors"
                    style={{ transitionDuration: 'var(--dur-base)' }}
                  >
                    <span className="w-9 h-9 rounded-md bg-accent-soft text-accent flex items-center justify-center flex-shrink-0">
                      <Icon name={row.icon} size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-text-1 truncate">{row.text}</p>
                      <p className="text-xs text-text-2 truncate">
                        {row.meta} · {formatRelativeTime(row.at, t)}
                      </p>
                    </div>
                    {row.amount !== undefined && (
                      <p className="text-base font-semibold text-text-1 tabular-nums flex-shrink-0">
                        {formatUZS(row.amount)}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </AuthLayout>
  )
}
