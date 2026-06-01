'use client'
import { useState, useEffect } from 'react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Icon } from '@/components/icons/Icon'
import { useI18n } from '@/lib/i18n/i18nContext'
import { formatUZS } from '@/lib/format'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  type Product,
} from '@/lib/api'

export default function CatalogPage() {
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

  function loadProducts() {
    setLoading(true)
    setError(null)
    getProducts()
      .then((data) => setProducts(data))
      .catch(() => setError('Failed to load products'))
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
    setFormError(null)
    setShowDeleteConfirm(false)
    setShowForm(true)
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
      setFormError('Product name is required')
      return
    }
    if (!formPrice || isNaN(Number(formPrice)) || Number(formPrice) <= 0) {
      setFormError('Enter a valid price')
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
      }
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, payload)
        setProducts(prev => prev.map(p =>
          p.id === editingProduct.id ? updated : p))
        showSaved('Product updated')
      } else {
        const created = await createProduct(payload)
        setProducts(prev => [...prev, created])
        showSaved('Product created')
      }
      handleClose()
    } catch {
      setFormError('Failed to save. Please try again.')
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
      showSaved('Product deleted')
    } catch {
      setFormError('Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (
    product: Product,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    try {
      const updated = await toggleProductActive(product.id)
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, active: updated.active } : p))
    } catch {
      // silent fail on toggle
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const title = t('nav.catalog')

  return (
    <AuthLayout title={title}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-text-1">{title}</h1>
          <p className="text-sm text-text-2 mt-1">
            {products.length} product{products.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 md:flex-none md:w-64">
            <Input
              leftIcon="search"
              type="text"
              placeholder="Search products..."
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
            New product
          </Button>
        </div>
      </div>

      {/* ── List / states ────────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <Card>
          <p className="text-sm text-error-strong">
            {error}
            <button
              className="ml-2 text-sm font-semibold text-accent hover:text-accent-hover"
              onClick={() => loadProducts()}
            >
              Try again
            </button>
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <Card className="col-span-full">
              <div className="text-center py-12">
                <div className="mx-auto mb-4 w-16 h-16 rounded-lg bg-accent-soft flex items-center justify-center text-accent">
                  <Icon name="catalog" size={28} />
                </div>
                <p className="text-sm text-text-2 mb-3">No products yet</p>
                <Button variant="ghost" leftIcon="add" onClick={handleNew}>
                  Add your first product
                </Button>
              </div>
            </Card>
          ) : (
            filtered.map((product) => (
              <Card
                key={product.id}
                padded={false}
                onClick={() => handleEdit(product)}
                className="p-5 cursor-pointer hover:border-border-strong hover:shadow-md transition-shadow"
              >
                {/* Placeholder image tile — no image upload exists yet */}
                <div
                  aria-hidden="true"
                  className="w-full aspect-square max-h-32 mb-3 rounded-md bg-accent-soft flex items-center justify-center text-accent"
                >
                  <Icon name="catalog" size={36} />
                </div>

                {/* Header row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-bold text-text-1 truncate">
                      {product.name}
                    </p>
                    {product.description && (
                      <p className="text-xs text-text-2 mt-0.5 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                  {/* Active toggle — token-styled switch */}
                  <button
                    type="button"
                    aria-pressed={product.active}
                    onClick={(e) => handleToggleActive(product, e)}
                    className={`w-10 h-5 rounded-pill relative cursor-pointer transition-colors flex-shrink-0 ${
                      product.active ? 'bg-accent' : 'bg-border-strong'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-surface rounded-pill shadow-sm transition-transform ${
                        product.active ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Price */}
                <p className="text-base font-bold text-text-1 tabular-nums mb-2">
                  {formatUZS(product.price)}
                </p>

                {/* Stock + prep info */}
                <div className="flex items-center gap-2 text-xs text-text-2">
                  {product.unlimited ? (
                    <span>Made to order</span>
                  ) : (
                    <span>{product.stockQty ?? 0} in stock</span>
                  )}
                  {product.prepTime && (
                    <>
                      <span>•</span>
                      <span>{product.prepTime} prep time</span>
                    </>
                  )}
                </div>

                {/* State badge */}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold mt-3 ${
                    product.active
                      ? 'bg-success-soft text-success-strong'
                      : 'bg-warning-soft text-warning-strong'
                  }`}
                >
                  {product.active ? 'Active' : 'Paused'}
                </span>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Product form slide-over ──────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-text-1/30"
            onClick={handleClose}
          />
          <div className="relative z-50 w-full max-w-lg bg-surface border-l border-border shadow-lg flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <p className="text-lg font-bold text-text-1">
                {editingProduct ? 'Edit product' : 'New product'}
              </p>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="text-text-3 hover:text-text-1 transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Product name */}
              <div>
                <label className="block text-sm font-medium text-text-1 mb-1.5">
                  Product name *
                </label>
                <Input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Product name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-1 mb-1.5">
                  Description
                </label>
                <Textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What is this product?"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-text-1 mb-1.5">
                  Price (UZS) *
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
                <label className="block text-sm font-medium text-text-1 mb-1.5">
                  Stock
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormUnlimited(true)}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                      formUnlimited
                        ? 'bg-accent text-accent-on'
                        : 'border border-border bg-surface text-text-1 hover:bg-surface-2'
                    }`}
                  >
                    Made to order
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormUnlimited(false)}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                      !formUnlimited
                        ? 'bg-accent text-accent-on'
                        : 'border border-border bg-surface text-text-1 hover:bg-surface-2'
                    }`}
                  >
                    Limited stock
                  </button>
                </div>
              </div>

              {!formUnlimited && (
                <div>
                  <label className="block text-sm font-medium text-text-1 mb-1.5">
                    Stock quantity
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
                <label className="block text-sm font-medium text-text-1 mb-1.5">
                  Preparation time
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
                    className="flex-1 bg-surface border border-border rounded-md py-2.5 px-3.5 text-sm text-text-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>

              {/* Active status */}
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-md border border-border">
                <div>
                  <p className="text-sm font-semibold text-text-1">Active</p>
                  <p className="text-xs text-text-2">
                    Visible to customers in the bot
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
                  <p className="text-sm text-error-strong">{formError}</p>
                </div>
              )}

              <Button
                variant="primary"
                fullWidth
                loading={saving}
                onClick={handleSave}
              >
                {saving
                  ? 'Saving...'
                  : editingProduct
                  ? 'Save changes'
                  : 'Create product'}
              </Button>

              {editingProduct && !showDeleteConfirm && (
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </Button>
              )}
              {editingProduct && showDeleteConfirm && (
                <div className="p-4 bg-error-soft border border-error-strong rounded-md">
                  <p className="text-sm font-semibold text-error-strong mb-1">
                    Delete this item?
                  </p>
                  <p className="text-xs text-error-strong mb-3">
                    This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      fullWidth
                      loading={deleting}
                      onClick={handleDelete}
                    >
                      {deleting ? 'Deleting...' : 'Yes, delete'}
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-text-1 text-surface px-4 py-3 rounded-md text-sm font-medium shadow-md z-50 flex items-center gap-2">
          <span className="text-success-soft">
            <Icon name="paid" size={16} />
          </span>
          {savedMessage}
        </div>
      )}
    </AuthLayout>
  )
}
