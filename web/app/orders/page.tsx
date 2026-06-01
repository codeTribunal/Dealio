'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { Icon } from '@/components/icons/Icon'
import { getOrders, getProducts, getCustomers, createOrder, type Product } from '@/lib/api'
import { formatUZS } from '@/lib/format'
import type { Order, Customer } from '@/types'

const LIMIT = 30

const FILTER_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'New', value: 'NEW' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Awaiting payment', value: 'AWAITING_PAYMENT' },
]

const SELECT_CLS =
  'w-full bg-surface border border-border rounded-md py-2.5 px-3.5 text-sm text-text-1 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [retryToken, setRetryToken] = useState(0)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  // Order form state
  const [orderCustomerId, setOrderCustomerId] = useState('')
  const [orderItems, setOrderItems] = useState<{
    productId: string
    quantity: number
    price: number
    name: string
  }[]>([])
  const [orderDeliveryMethod, setOrderDeliveryMethod] =
    useState<'PICKUP' | 'DELIVERY'>('PICKUP')
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState('')
  const [orderDeliveryDate, setOrderDeliveryDate] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderSaving, setOrderSaving] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    Promise.all([
      getProducts(),
      getCustomers({ limit: 100 }),
    ])
      .then(([productsData, customersData]) => {
        setProducts(productsData)
        setCustomers(customersData.customers)
      })
      .catch(() => {})
  }, [])

  function showSaved(message: string) {
    setSavedMessage(message)
    setTimeout(() => setSavedMessage(null), 3000)
  }

  const addOrderItem = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    const existing = orderItems.find(i => i.productId === productId)
    if (existing) {
      setOrderItems(prev => prev.map(i =>
        i.productId === productId
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ))
    } else {
      setOrderItems(prev => [...prev, {
        productId: product.id,
        quantity: 1,
        price: product.price,
        name: product.name
      }])
    }
  }

  const removeOrderItem = (productId: string) => {
    setOrderItems(prev => prev.filter(i => i.productId !== productId))
  }

  const updateOrderItemQuantity = (
    productId: string,
    quantity: number
  ) => {
    if (quantity <= 0) {
      removeOrderItem(productId)
      return
    }
    setOrderItems(prev => prev.map(i =>
      i.productId === productId ? { ...i, quantity } : i
    ))
  }

  const orderTotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  )

  const handleCreateOrder = async () => {
    if (!orderCustomerId) {
      setOrderError('Select a customer')
      return
    }
    if (orderItems.length === 0) {
      setOrderError('Add at least one product')
      return
    }
    if (orderDeliveryMethod === 'DELIVERY' &&
        !orderDeliveryAddress.trim()) {
      setOrderError('Enter a delivery address')
      return
    }
    setOrderSaving(true)
    setOrderError(null)
    try {
      const created = await createOrder({
        customerId: orderCustomerId,
        items: orderItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price
        })),
        deliveryMethod: orderDeliveryMethod,
        deliveryAddress: orderDeliveryAddress.trim() || undefined,
        deliveryDate: orderDeliveryDate || undefined,
        notes: orderNotes.trim() || undefined,
      })
      setOrders(prev => [created, ...prev])
      setTotal(prev => prev + 1)
      setShowCreateForm(false)
      setOrderCustomerId('')
      setOrderItems([])
      setOrderDeliveryMethod('PICKUP')
      setOrderDeliveryAddress('')
      setOrderDeliveryDate('')
      setOrderNotes('')
      showSaved('Order created')
    } catch {
      setOrderError('Failed to create order. Please try again.')
    } finally {
      setOrderSaving(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params =
      statusFilter === 'AWAITING_PAYMENT'
        ? { paymentStatus: 'PENDING', search: debouncedSearch, page, limit: LIMIT }
        : {
            status: statusFilter === 'ALL' ? undefined : statusFilter,
            search: debouncedSearch,
            page,
            limit: LIMIT,
          }
    getOrders(params)
      .then((data) => {
        setOrders(Array.isArray(data.orders) ? data.orders : [])
        setTotal(data.total)
      })
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [debouncedSearch, statusFilter, page, retryToken])

  return (
    <AuthLayout title="Orders">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-text-1"
            style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-extra)', lineHeight: 1.1 }}
          >
            Orders
          </h1>
          <p className="text-sm text-text-2 mt-1">{total} total orders</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 md:flex-none md:w-80">
            <Input
              leftIcon="search"
              placeholder="Search by order # or customer name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Button
            variant="primary"
            leftIcon="add"
            onClick={() => setShowCreateForm(true)}
            className="flex-shrink-0 whitespace-nowrap"
          >
            New order
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_TABS.map(({ label, value }) => {
          const active = statusFilter === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStatusFilter(value)
                setPage(1)
              }}
              className={`px-3.5 py-1.5 rounded-pill text-xs font-semibold transition-colors ${
                active
                  ? 'bg-accent-soft text-accent'
                  : 'bg-surface border border-border text-text-2 hover:text-text-1'
              }`}
              style={{ transitionDuration: 'var(--dur-base)' }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <Card padded={false} className="overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-2 border-b border-border text-xs font-semibold uppercase tracking-wide text-text-2">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-4">Items</div>
          <div className="col-span-2">Total</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Payment</div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={32} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <p className="text-sm text-error-strong">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null)
                setLoading(true)
                setRetryToken((tk) => tk + 1)
              }}
            >
              Try again
            </Button>
          </div>
        ) : (orders ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <Icon name="orders" size={40} className="text-text-3" />
            <p className="text-sm text-text-2">
              {search
                ? 'No orders match your search'
                : statusFilter !== 'ALL'
                ? 'No orders with this status'
                : 'No orders yet'}
            </p>
          </div>
        ) : (
          (orders ?? []).map((order) => (
            <div key={order.id}>
              {/* Mobile card */}
              <Link
                href={`/orders/${order.id}`}
                className="md:hidden block px-4 py-4 border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors"
                style={{ transitionDuration: 'var(--dur-base)' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-text-1">#{order.orderNumber}</span>
                  <Badge status={order.orderStatus} type="order" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-text-2 truncate">{order.customer.name}</p>
                  <p className="text-sm font-semibold text-text-1 tabular-nums flex-shrink-0">
                    {formatUZS(order.total)}
                  </p>
                </div>
              </Link>

              {/* Desktop row */}
              <Link
                href={`/orders/${order.id}`}
                className="hidden md:grid grid-cols-12 gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors items-center"
                style={{ transitionDuration: 'var(--dur-base)' }}
              >
                <div className="col-span-1">
                  <p className="text-sm font-bold text-text-1">#{order.orderNumber}</p>
                </div>

                <div className="col-span-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={order.customer.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-1 truncate">{order.customer.name}</p>
                      <p className="text-xs text-text-2 truncate">
                        {order.customer.telegramUsername
                          ? `@${order.customer.telegramUsername}`
                          : order.customer.phone || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-span-4 min-w-0">
                  <p className="text-sm text-text-2 truncate">
                    {order.items.length === 0
                      ? '—'
                      : `${order.items[0].product.name} × ${order.items[0].quantity}${
                          order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''
                        }`}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm font-semibold text-text-1 tabular-nums">{formatUZS(order.total)}</p>
                </div>

                <div className="col-span-1">
                  <Badge status={order.orderStatus} type="order" />
                </div>

                <div className="col-span-1">
                  <Badge status={order.paymentStatus} type="payment" />
                </div>
              </Link>
            </div>
          ))
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <p className="text-sm text-text-2">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * LIMIT >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create order panel */}
      {showCreateForm && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCreateForm(false)}
          />
          <div className="relative z-50 w-full max-w-xl bg-surface shadow-lg flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <p className="text-lg font-bold text-text-1">New order</p>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                aria-label="Close"
                className="p-2 rounded-md text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors"
                style={{ transitionDuration: 'var(--dur-base)' }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Customer *
                </label>
                <select
                  value={orderCustomerId}
                  onChange={(e) => setOrderCustomerId(e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="">Select a customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Products */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Products *
                </label>
                <div className="border border-border rounded-md overflow-hidden">
                  <div className="px-4 py-2 bg-surface-2 border-b border-border">
                    <p className="text-xs font-medium text-text-2">Add products</p>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto bg-surface">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-1 truncate">{product.name}</p>
                          <p className="text-xs text-text-2">{formatUZS(product.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addOrderItem(product.id)}
                          className="w-7 h-7 rounded-pill bg-accent text-accent-on text-sm font-bold hover:bg-accent-hover flex items-center justify-center flex-shrink-0 ml-3"
                          aria-label={`Add ${product.name}`}
                        >
                          +
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {orderItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {orderItems.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-3 p-3 bg-accent-soft rounded-md"
                      >
                        <p className="text-sm font-medium text-text-1 flex-1 min-w-0 truncate">{item.name}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => updateOrderItemQuantity(item.productId, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-surface border border-border text-sm font-bold flex items-center justify-center hover:bg-surface-2"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <p className="text-sm font-semibold text-text-1 w-6 text-center tabular-nums">{item.quantity}</p>
                          <button
                            type="button"
                            onClick={() => updateOrderItemQuantity(item.productId, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-surface border border-border text-sm font-bold flex items-center justify-center hover:bg-surface-2"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-text-1 w-24 text-right tabular-nums flex-shrink-0">
                          {formatUZS(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}

                    <div className="flex justify-between items-center px-3 py-2 border-t border-border mt-2">
                      <p className="text-sm font-bold text-text-1">Total</p>
                      <p className="text-sm font-bold text-text-1 tabular-nums">{formatUZS(orderTotal)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery method */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Delivery
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={orderDeliveryMethod === 'PICKUP' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setOrderDeliveryMethod('PICKUP')}
                  >
                    Pickup
                  </Button>
                  <Button
                    variant={orderDeliveryMethod === 'DELIVERY' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setOrderDeliveryMethod('DELIVERY')}
                  >
                    Delivery
                  </Button>
                </div>

                {orderDeliveryMethod === 'DELIVERY' && (
                  <div className="space-y-3 mt-3">
                    <Input
                      type="text"
                      value={orderDeliveryAddress}
                      onChange={(e) => setOrderDeliveryAddress(e.target.value)}
                      placeholder="Delivery address"
                    />
                    <div>
                      <label className="block text-sm font-medium text-text-2 mb-1.5">
                        Requested delivery date (optional)
                      </label>
                      <Input
                        type="date"
                        value={orderDeliveryDate}
                        onChange={(e) => setOrderDeliveryDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-2 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className={`${SELECT_CLS} resize-none`}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex-shrink-0 space-y-3">
              {orderError && (
                <div className="p-3 bg-error-soft rounded-md">
                  <p className="text-sm text-error-strong">{orderError}</p>
                </div>
              )}
              <Button
                variant="primary"
                fullWidth
                loading={orderSaving}
                onClick={handleCreateOrder}
              >
                {orderSaving ? 'Saving...' : 'Create order'}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-text-1 text-surface px-4 py-3 rounded-md text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          <Icon name="paid" size={16} className="text-success-strong" />
          {savedMessage}
        </div>
      )}
    </AuthLayout>
  )
}
