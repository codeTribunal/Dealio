'use client'
import { useState, useEffect } from 'react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/icons/Icon'
import { getServices, createService, updateService } from '@/lib/api'
import { formatUZS, currencyWord } from '@/lib/format'
import { useI18n } from '@/lib/i18n/i18nContext'
import type { Service } from '@/types'

// Pill toggle matching the settings/scheduling switches.
function Toggle({
  active,
  onClick,
  disabled = false,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`w-11 h-6 rounded-pill relative cursor-pointer transition-colors flex-shrink-0 ${
        active ? 'bg-accent' : 'bg-border-strong'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-surface rounded-pill shadow-sm transition-transform ${
          active ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export default function ServicesPage() {
  const { t } = useI18n()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('60')
  const [price, setPrice] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function fetchServices() {
    setLoading(true)
    setError(null)
    getServices()
      .then(setServices)
      .catch(() => setError('Could not load services'))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    fetchServices()
  }, [])

  function openCreate() {
    setEditing(null)
    setName('')
    setDuration('60')
    setPrice('')
    setActive(true)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setName(s.name)
    setDuration(String(s.durationMinutes))
    setPrice(String(s.price))
    setActive(s.active)
    setFormError(null)
    setShowForm(true)
  }

  async function handleToggle(s: Service) {
    setTogglingId(s.id)
    // Optimistic flip, reconciled with the server response.
    setServices((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)),
    )
    try {
      const updated = await updateService(s.id, { active: !s.active })
      setServices((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, active: updated.active } : x)),
      )
    } catch {
      // Revert on failure.
      setServices((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, active: s.active } : x)),
      )
    } finally {
      setTogglingId(null)
    }
  }

  async function handleSave() {
    const d = Number(duration)
    const p = Number(price)
    if (!name.trim()) {
      setFormError('Enter a service name')
      return
    }
    if (!d || d <= 0) {
      setFormError('Enter a valid duration')
      return
    }
    if (Number.isNaN(p) || p < 0) {
      setFormError('Enter a valid price')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        const updated = await updateService(editing.id, {
          name: name.trim(),
          durationMinutes: d,
          price: p,
          active,
        })
        setServices((prev) =>
          prev.map((x) => (x.id === editing.id ? updated : x)),
        )
      } else {
        const created = await createService({
          name: name.trim(),
          durationMinutes: d,
          price: p,
          active,
        })
        setServices((prev) => [...prev, created])
      }
      setShowForm(false)
    } catch {
      setFormError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthLayout title="Services">
      <div className="max-w-2xl w-full space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-text-2">The services customers can book.</p>
          <Button
            variant="primary"
            size="sm"
            leftIcon="add"
            className="flex-shrink-0"
            onClick={openCreate}
          >
            New service
          </Button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <Card className="text-center">
            <p className="text-sm text-error-strong">{error}</p>
            <Button variant="primary" className="mt-3" onClick={fetchServices}>
              {t('common.tryAgain')}
            </Button>
          </Card>
        ) : services.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-sm text-text-2">No services yet</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {services.map((s) => (
              <Card key={s.id} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-semibold text-text-1 truncate">
                    {s.name}
                  </p>
                  <p className="text-xs text-text-2 tabular-nums mt-0.5">
                    {s.durationMinutes} min · {formatUZS(s.price)}
                  </p>
                </button>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-pill flex-shrink-0 ${
                    s.active
                      ? 'bg-success-soft text-success-strong'
                      : 'bg-warning-soft text-warning-strong'
                  }`}
                >
                  {s.active ? 'Active' : 'Paused'}
                </span>
                <Toggle
                  active={s.active}
                  disabled={togglingId === s.id}
                  onClick={() => handleToggle(s)}
                />
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / edit slide-over */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-text-1/30"
            onClick={() => setShowForm(false)}
          />
          <div className="relative z-50 w-full max-w-md bg-surface border-l border-border shadow-lg flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <p className="text-lg font-bold text-text-1">
                {editing ? 'Edit service' : 'New service'}
              </p>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
                className="text-text-3 hover:text-text-1 transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Haircut"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-2 mb-1.5">
                    Duration (min)
                  </label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                    className="tabular-nums"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-2 mb-1.5">
                    Price ({currencyWord()})
                  </label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    className="tabular-nums"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-text-1">Active</p>
                  <p className="text-xs text-text-2">
                    Customers can book this service.
                  </p>
                </div>
                <Toggle active={active} onClick={() => setActive((v) => !v)} />
              </div>
              {formError && (
                <div className="p-3 bg-error-soft border border-error-strong rounded-md">
                  <p className="text-sm text-error-strong">{formError}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex-shrink-0 space-y-3">
              <Button
                variant="primary"
                fullWidth
                loading={saving}
                onClick={handleSave}
              >
                {t('common.save')}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowForm(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}
