'use client'
import { useState, useEffect } from 'react'
import { Plus, X, Search, AlertCircle, CheckCircle, Package } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
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

  return (
    <AuthLayout title="Catalog">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} product{products.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:flex-none md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex-shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add product
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="p-6">
          <p className="text-sm text-red-600">
            {error}
            <button
              className="text-sm text-blue-600 ml-2"
              onClick={() => loadProducts()}
            >
              Try again
            </button>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16 col-span-full">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm mb-2">No products yet</p>
              <button
                onClick={handleNew}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first product
              </button>
            </div>
          ) : (
            filtered.map((product) => (
              <div
                key={product.id}
                onClick={() => handleEdit(product)}
                className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {product.name}
                    </p>
                    {product.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                  {/* Active toggle */}
                  <div
                    onClick={(e) => handleToggleActive(product, e)}
                    className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors flex-shrink-0 ${
                      product.active ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      product.active ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </div>
                </div>

                {/* Price */}
                <p className="text-base font-bold text-gray-900 mb-2">
                  {formatUZS(product.price)}
                </p>

                {/* Stock info */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
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

                {/* Inactive badge */}
                {!product.active && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 mt-2">
                    Paused
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Product form panel */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={handleClose}
          />
          <div className="relative z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
            {/* header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <p className="text-lg font-bold text-gray-900">
                {editingProduct ? 'Edit product' : 'New product'}
              </p>
              <button onClick={handleClose}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Field 1 — Product name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Product name"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Field 2 — Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What is this product?"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Field 3 — Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Price (UZS) *
                </label>
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  min="0"
                  placeholder="150000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Field 4 — Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Stock
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormUnlimited(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formUnlimited
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Made to order
                  </button>
                  <button
                    onClick={() => setFormUnlimited(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !formUnlimited
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Limited stock
                  </button>
                </div>
              </div>

              {!formUnlimited && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Stock quantity
                  </label>
                  <input
                    type="number"
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(e.target.value)}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Field 5 — Preparation time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Preparation time
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formPrepTimeValue}
                    onChange={(e) => setFormPrepTimeValue(e.target.value)}
                    placeholder="2"
                    min="1"
                    className="w-24 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={formPrepTimeUnit}
                    onChange={(e) => setFormPrepTimeUnit(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>

              {/* Field 6 — Active status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">Active</p>
                  <p className="text-xs text-gray-500">Visible to customers in the bot</p>
                </div>
                <div
                  onClick={() => setFormActive(!formActive)}
                  className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors flex-shrink-0 ${
                    formActive ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    formActive ? 'right-0.5' : 'left-0.5'
                  }`} />
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="p-6 border-t border-gray-200 flex-shrink-0 space-y-3">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : editingProduct ? 'Save changes' : 'Create product'}
              </button>

              {editingProduct && !showDeleteConfirm && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              )}
              {editingProduct && showDeleteConfirm && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm font-semibold text-red-800 mb-1">
                    Delete this item?
                  </p>
                  <p className="text-xs text-red-600 mb-3">
                    This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                      {deleting ? 'Deleting...' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          {savedMessage}
        </div>
      )}
    </AuthLayout>
  )
}
