'use client'
import { useState, useEffect } from 'react'
import AuthLayout from '@/components/AuthLayout'
import { useModeGuard } from '@/lib/businessContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Icon } from '@/components/icons/Icon'
import { SlideOver } from '@/components/ui/SlideOver'
import { useI18n } from '@/lib/i18n/i18nContext'
import { formatUZS, currencyWord } from '@/lib/format'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
} from '@/lib/api'

export default function CatalogPage() {
  const guardReady = useModeGuard('PRODUCTS')
  const { t } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  // Form fields
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formStockQty, setFormStockQty] = useState('')
  const [formUnlimited, setFormUnlimited] = useState(true)
  const [formPrepTimeValue, setFormPrepTimeValue] = useState('')
  const [formPrepTimeUnit, setFormPrepTimeUnit] = useState('hours')
  const [formActive, setFormActive] = useState(true)
  const [formPhotoUrl, setFormPhotoUrl] = useState('')

  function loadProducts() {
    setLoading(true)
    setError(null)
    getProducts()
      .then((data) => setProducts(data))
      .catch(() => setError(t('catalog.failedLoad')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleNew = () => {
    setEditingProduct(null)
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormStockQty('')
    setFormUnlimited(true)
    setFormPrepTimeValue('')
    setFormPrepTimeUnit('hours')
    setFormActive(true)
    setFormPhotoUrl('')
    setFormError(null)
    setShowDeleteConfirm(false)
    setShowForm(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormName(product.name)
    setFormDescription(product.description || '')
    setFormPrice(String(product.price))
    setFormStockQty(product.stockQty ? String(product.stockQty) : '')
    setFormUnlimited(product.unlimited)
    const match = product.prepTime?.match(/(\d+)\s*(\w+)/)
    setFormPrepTimeValue(match?.[1] || '')
    setFormPrepTimeUnit(match?.[2] || 'hours')
    setFormActive(product.active)
    // Single owner-facing photo URL: prefill from the first stored photo.
    setFormPhotoUrl(product.photos[0] ?? '')
    setFormError(null)
    setShowDeleteConfirm(false)
    setShowForm(true)
  }

  // A trimmed, non-empty photo URL must parse as an http(s) URL — the backend
  // validates with z.string().url(), so we mirror that here to fail fast.
  const isValidHttpUrl = (value: string): boolean => {
    try {
      const u = new URL(value)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingProduct(null)
    setFormError(null)
    setShowDeleteConfirm(false)
  }

  const showSaved = (message: string) => {
    setSavedMessage(message)
    setTimeout(() => setSavedMessage(null), 3000)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError(t('catalog.nameRequired'))
      return
    }
    if (!formPrice || isNaN(Number(formPrice)) || Number(formPrice) <= 0) {
      setFormError(t('catalog.priceInvalid'))
      return
    }
    const photoUrl = formPhotoUrl.trim()
    if (photoUrl && !isValidHttpUrl(photoUrl)) {
      setFormError(t('catalog.photoUrlInvalid'))
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        price: Number(formPrice),
        stockQty: (!formUnlimited && formStockQty)
          ? Number(formStockQty) : undefined,
        unlimited: formUnlimited,
        prepTime: formPrepTimeValue
          ? `${formPrepTimeValue} ${formPrepTimeUnit}`
          : undefined,
        active: formActive,
        // Owner-facing single photo URL (no upload infra yet). Send [url] when
        // set, else [] so editing can clear a previously-set photo.
        photos: photoUrl ? [photoUrl] : [],
      }
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, payload)
        setProducts(prev => prev.map(p =>
          p.id === editingProduct.id ? updated : p))
        showSaved(t('catalog.productUpdated'))
      } else {
        const created = await createProduct(payload)
        setProducts(prev => [...prev, created])
        showSaved(t('catalog.productCreated'))
      }
      handleClose()
    } catch {
      setFormError(t('scheduling.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingProduct) return
    setDeleting(true)
    try {
      await deleteProduct(editingProduct.id)
      setProducts(prev => prev.filter(p => p.id !== editingProduct.id))
      handleClose()
      showSaved(t('catalog.productDeleted'))
    } catch {
      setFormError(t('scheduling.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  // Row toggle removed — active/paused is edited only on the product form (via
  // its Active switch, saved through updateProduct). The toggleProductActive API
  // method is intentionally kept in lib/api.ts per spec.

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  // prepTime is stored as an English token pair ("2 hours") — parse it so the
  // displayed unit follows the dashboard language. Unknown formats fall back
  // to the raw stored value.
  const prepTimeKeyByUnit: Record<string, string> = {
    minutes: 'catalog.prepTimeMinutes',
    hours: 'catalog.prepTimeHours',
    days: 'catalog.prepTimeDays',
    weeks: 'catalog.prepTimeWeeks',
  }
  const formatPrepTime = (prepTime: string): string => {
    const match = prepTime.match(/(\d+)\s*(\w+)/)
    const key = match ? prepTimeKeyByUnit[match[2]] : undefined
    return match && key ? t(key, { n: match[1] }) : prepTime
  }

  const title = t('nav.catalog')

  if (!guardReady) return null

  return (
    <AuthLayout title={title}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-text-1">{title}</h1>
          <p className="text-sm text-text-2 mt-1">
            {t('catalog.productCount', { count: products.length })}
          </p>
        </div>
        {/* One add-affordance by state: search + this button show only when the
            catalog is populated; an empty catalog uses the big center CTA below
            (never both), mirroring the app's empty-vs-populated rule. */}
        {products.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 md:flex-none md:w-64">
              <Input
                leftIcon="search"
                type="text"
                placeholder={t('catalog.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              leftIcon="add"
              onClick={handleNew}
              className="whitespace-nowrap"
            >
              {t('catalog.newProduct')}
            </Button>
          </div>
        )}
      </div>

      {/* ── List / states ────────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <Card>
          <p className="text-base text-error-strong">
            {error}
            <button
              className="ml-2 text-base font-semibold text-accent hover:text-accent-hover"
              onClick={() => loadProducts()}
            >
              {t('common.tryAgain')}
            </button>
          </p>
        </Card>
      ) : products.length === 0 ? (
        // Empty catalog → big center CTA only (header button is hidden).
        <Card>
          <div className="text-center py-16">
            <div className="mx-auto mb-4 w-16 h-16 rounded-lg bg-accent-soft flex items-center justify-center text-accent">
              <Icon name="catalog" size={28} />
            </div>
            <p className="text-base font-semibold text-text-1 mb-1">
              {t('catalog.empty')}
            </p>
            <p className="text-sm text-text-2 mb-5">{t('catalog.emptyHint')}</p>
            <Button variant="primary" leftIcon="add" onClick={handleNew}>
              {t('catalog.addProduct')}
            </Button>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-base text-text-2 text-center py-10">
            {t('catalog.noMatch')}
          </p>
        </Card>
      ) : (
        // Compact list rows (mirrors the app): small icon, name + price + stock
        // chip + prep, Active/Paused tag on the right. No image, no row toggle.
        <div className="space-y-2">
          {filtered.map((product) => {
            const outOfStock =
              !product.unlimited && (product.stockQty ?? 0) === 0
            return (
              <Card
                key={product.id}
                padded={false}
                onClick={() => handleEdit(product)}
                className="p-4 cursor-pointer hover:border-border-strong hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  {/* Small leading icon tile (no product images in this app) */}
                  <div className="w-12 h-12 flex-shrink-0 rounded-md bg-accent-soft flex items-center justify-center text-accent">
                    <Icon name="catalog" size={22} />
                  </div>

                  {/* Name + price + stock + prep */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-text-1 truncate">
                      {product.name}
                    </p>
                    {product.description && (
                      <p className="text-xs text-text-2 truncate mt-0.5">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-bold text-text-1 tabular-nums">
                        {formatUZS(product.price)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          outOfStock
                            ? 'bg-error-soft text-error-strong'
                            : 'bg-surface-2 text-text-2'
                        }`}
                      >
                        {product.unlimited
                          ? t('catalog.madeToOrder')
                          : t('catalog.inStock', {
                              count: product.stockQty ?? 0,
                            })}
                      </span>
                    </div>
                    {product.prepTime && (
                      <p className="text-xs text-text-3 mt-1">
                        {formatPrepTime(product.prepTime)}
                      </p>
                    )}
                  </div>

                  {/* Active/Paused tag — vertically centered, no toggle */}
                  <span
                    className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold ${
                      product.active
                        ? 'bg-success-soft text-success-strong'
                        : 'bg-warning-soft text-warning-strong'
                    }`}
                  >
                    {product.active ? t('common.active') : t('common.paused')}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Product form slide-over ──────────────────────────────── */}
      <SlideOver
        open={showForm}
        onClose={handleClose}
        title={
          editingProduct ? t('catalog.editProduct') : t('catalog.newProduct')
        }
        closeLabel={t('common.close')}
      >
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Product name */}
          <div>
            <label className="block text-base font-medium text-text-1 mb-1.5">
              {t('catalog.nameLabel')} *
            </label>
            <Input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t('catalog.nameLabel')}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-base font-medium text-text-1 mb-1.5">
              {t('settings.description')}
            </label>
            <Textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder={t('catalog.descriptionPlaceholder')}
            />
          </div>

          {/* Photo URL (owner-facing single link; no upload infra yet) */}
          <div>
            <label className="block text-base font-medium text-text-1 mb-1.5">
              {t('catalog.photoUrlLabel')}
            </label>
            <Input
              type="url"
              inputMode="url"
              value={formPhotoUrl}
              onChange={(e) => setFormPhotoUrl(e.target.value)}
              placeholder={t('catalog.photoUrlPlaceholder')}
            />
            <p className="mt-1.5 text-sm text-text-3">{t('catalog.photoUrlHint')}</p>
            {formPhotoUrl.trim() && isValidHttpUrl(formPhotoUrl.trim()) && (
              <div className="mt-3 h-32 w-32 overflow-hidden rounded-md border border-border bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formPhotoUrl.trim()}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Broken/blocked link: swap the preview for a small notice
                    // rather than a browser broken-image glyph.
                    const img = e.currentTarget
                    img.style.display = 'none'
                    const note = img.nextElementSibling as HTMLElement | null
                    if (note) note.style.display = 'flex'
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget
                    img.style.display = 'block'
                    const note = img.nextElementSibling as HTMLElement | null
                    if (note) note.style.display = 'none'
                  }}
                />
                <div
                  className="hidden h-full w-full items-center justify-center p-2 text-center text-sm text-text-3"
                >
                  {t('catalog.photoPreviewFailed')}
                </div>
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-base font-medium text-text-1 mb-1.5">
              {t('catalog.priceLabel')} ({currencyWord()}) *
            </label>
            <Input
              type="number"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              min="0"
              placeholder="150000"
              className="tabular-nums"
            />
          </div>

          {/* Stock mode */}
          <div>
            <label className="block text-base font-medium text-text-1 mb-1.5">
              {t('catalog.stockLabel')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormUnlimited(true)}
                className={`px-4 py-2 rounded-md text-base font-semibold transition-colors ${
                  formUnlimited
                    ? 'bg-accent text-accent-on'
                    : 'border border-border bg-surface text-text-1 hover:bg-surface-2'
                }`}
              >
                {t('catalog.madeToOrder')}
              </button>
              <button
                type="button"
                onClick={() => setFormUnlimited(false)}
                className={`px-4 py-2 rounded-md text-base font-semibold transition-colors ${
                  !formUnlimited
                    ? 'bg-accent text-accent-on'
                    : 'border border-border bg-surface text-text-1 hover:bg-surface-2'
                }`}
              >
                {t('catalog.limitedStock')}
              </button>
            </div>
          </div>

          {!formUnlimited && (
            <div>
              <label className="block text-base font-medium text-text-1 mb-1.5">
                {t('catalog.stockQtyLabel')}
              </label>
              <Input
                type="number"
                value={formStockQty}
                onChange={(e) => setFormStockQty(e.target.value)}
                min="0"
                className="tabular-nums"
              />
            </div>
          )}

          {/* Preparation time — number + unit dropdown (logic preserved) */}
          <div>
            <label className="block text-base font-medium text-text-1 mb-1.5">
              {t('catalog.prepTimeLabel')}
            </label>
            <div className="flex gap-2">
              <div className="w-24">
                <Input
                  type="number"
                  value={formPrepTimeValue}
                  onChange={(e) => setFormPrepTimeValue(e.target.value)}
                  placeholder="2"
                  min="1"
                  className="tabular-nums"
                />
              </div>
              <select
                value={formPrepTimeUnit}
                onChange={(e) => setFormPrepTimeUnit(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-md py-2.5 px-3.5 text-base text-text-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors"
              >
                <option value="minutes">{t('catalog.unitMinutes')}</option>
                <option value="hours">{t('catalog.unitHours')}</option>
                <option value="days">{t('catalog.unitDays')}</option>
                <option value="weeks">{t('catalog.unitWeeks')}</option>
              </select>
            </div>
          </div>

          {/* Active status */}
          <div className="flex items-center justify-between p-4 bg-surface-2 rounded-md border border-border">
            <div>
              <p className="text-base font-semibold text-text-1">
                {t('common.active')}
              </p>
              <p className="text-xs text-text-2">
                {t('catalog.activeHint')}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={formActive}
              onClick={() => setFormActive(!formActive)}
              className={`w-10 h-5 rounded-pill relative cursor-pointer transition-colors flex-shrink-0 ${
                formActive ? 'bg-accent' : 'bg-border-strong'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-surface rounded-pill shadow-sm transition-transform ${
                  formActive ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex-shrink-0 space-y-3">
          {formError && (
            <div className="p-3 bg-error-soft border border-error-strong rounded-md">
              <p className="text-base text-error-strong">{formError}</p>
            </div>
          )}

          <Button
            variant="primary"
            fullWidth
            loading={saving}
            onClick={handleSave}
          >
            {saving
              ? t('catalog.saving')
              : editingProduct
              ? t('common.saveChanges')
              : t('catalog.createProduct')}
          </Button>

          {editingProduct && !showDeleteConfirm && (
            <Button
              variant="danger"
              fullWidth
              onClick={() => setShowDeleteConfirm(true)}
            >
              {t('common.delete')}
            </Button>
          )}
          {editingProduct && showDeleteConfirm && (
            <div className="p-4 bg-error-soft border border-error-strong rounded-md">
              <p className="text-base font-semibold text-error-strong mb-1">
                {t('catalog.deleteTitle')}
              </p>
              <p className="text-xs text-error-strong mb-3">
                {t('catalog.deleteBody')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  fullWidth
                  loading={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? t('catalog.deleting') : t('common.yesDelete')}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SlideOver>

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-text-1 text-surface px-4 py-3 rounded-md text-base font-medium shadow-md z-50 flex items-center gap-2">
          <span className="text-success-soft">
            <Icon name="paid" size={16} />
          </span>
          {savedMessage}
        </div>
      )}
    </AuthLayout>
  )
}
