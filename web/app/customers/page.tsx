'use client'
import { useState, useEffect } from 'react'
import AuthLayout from '@/components/AuthLayout'
import CustomerCard from '@/components/CustomerCard'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/icons/Icon'
import { getCustomers, restoreCustomer } from '@/lib/api'
import { useI18n } from '@/lib/i18n/i18nContext'
import type { Customer } from '@/types'

const LIMIT = 30

export default function CustomersPage() {
  const { t } = useI18n()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [retryToken, setRetryToken] = useState(0)
  const [showDeleted, setShowDeleted] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      getCustomers({ search, page, limit: LIMIT, includeDeleted: showDeleted })
        .then((data) => {
          setCustomers(data.customers)
          setTotal(data.total)
        })
        .catch(() => setError(t('customers.failedLoad')))
        .finally(() => setLoading(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [search, page, retryToken, showDeleted])

  async function handleRestore(cid: string) {
    setRestoringId(cid)
    try {
      await restoreCustomer(cid)
      setRetryToken((tok) => tok + 1)
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <AuthLayout title={t('customers.title')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-text-1"
            style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-extra)', lineHeight: 1.1 }}
          >
            {t('customers.title')}
          </h1>
          <p className="text-sm text-text-2 mt-1">
            {t('customers.totalCustomers', { count: total })}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-80">
            <Input
              leftIcon="search"
              placeholder={t('customers.searchHint')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Button
            variant={showDeleted ? 'primary' : 'secondary'}
            size="sm"
            className="flex-shrink-0 whitespace-nowrap"
            onClick={() => {
              setShowDeleted((v) => !v)
              setPage(1)
            }}
          >
            {t('common.showDeleted')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card padded={false} className="overflow-hidden">
        {/* Column header — desktop only */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-2 border-b border-border text-xs font-semibold uppercase tracking-wide text-text-2">
          <div className="col-span-5">{t('customers.colCustomer')}</div>
          <div className="col-span-2">{t('customers.colOrders')}</div>
          <div className="col-span-3">{t('customers.colTotalSpent')}</div>
          <div className="col-span-2">{t('customers.colLastActive')}</div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={32} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <p className="text-base text-error-strong">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null)
                setLoading(true)
                setRetryToken((tok) => tok + 1)
              }}
            >
              {t('common.tryAgain')}
            </Button>
          </div>
        ) : (customers ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <Icon name="customers" size={40} className="text-text-3" />
            <p className="text-base text-text-2">
              {search ? t('customers.emptyFiltered') : t('customers.empty')}
            </p>
          </div>
        ) : (
          (customers ?? []).map((customer) =>
            customer.deleted ? (
              <div
                key={customer.id}
                className="flex items-center justify-between gap-3 border-b border-border last:border-b-0 px-5 py-4 opacity-70"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-text-1 truncate">{customer.name}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-semibold bg-error-soft text-error-strong">
                      {t('common.deletedBadge')}
                    </span>
                  </div>
                  <p className="text-xs text-text-2 truncate mt-0.5">
                    {customer.telegramUsername
                      ? `@${customer.telegramUsername}`
                      : customer.phone || '—'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={restoringId === customer.id}
                  onClick={() => handleRestore(customer.id)}
                  className="flex-shrink-0"
                >
                  {t('common.restore')}
                </Button>
              </div>
            ) : (
              <CustomerCard key={customer.id} customer={customer} />
            )
          )
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <p className="text-sm text-text-2">
              {t('customers.showing', {
                from: (page - 1) * LIMIT + 1,
                to: Math.min(page * LIMIT, total),
                total,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('common.previous')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * LIMIT >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </AuthLayout>
  )
}
