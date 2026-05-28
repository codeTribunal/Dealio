'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ShoppingBag, Plus, X } from 'lucide-react'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import ActivityBadge from '@/components/ActivityBadge'
import { getOrders, getProducts, getCustomers, createOrder, type Product } from '@/lib/api'
import { formatUZS, getInitials } from '@/lib/format'
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

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
  }, [debouncedSearch, statusFilter, page])

  return (
    <AuthLayout title="Orders">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total orders</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:flex-none md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by order # or customer name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex-shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New order
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              setStatusFilter(value)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === value
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-4">Items</div>
          <div className="col-span-2">Total</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Payment</div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="p-6">
            <p className="text-sm text-red-600">
              {error}
              <button
                className="text-sm text-blue-600 ml-2"
                onClick={() => {
                  setError(null)
                  setLoading(true)
                }}
              >
                Try again
              </button>
            </p>
          </div>
        ) : (orders ?? []).length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
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
                className="md:hidden block px-4 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900">#{order.orderNumber}</span>
                  <ActivityBadge status={order.orderStatus} type="order" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">{order.customer.name}</p>
                  <p className="text-sm font-semibold text-gray-900">{formatUZS(order.total)}</p>
                </div>
              </Link>

              {/* Desktop row */}
              <Link
                href={`/orders/${order.id}`}
                className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center cursor-pointer last:border-b-0"
              >
                <div className="col-span-1">
                  <p className="text-sm font-bold text-gray-900">#{order.orderNumber}</p>
                </div>

                <div className="col-span-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                      {getInitials(order.customer.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.customer.telegramUsername
                          ? `@${order.customer.telegramUsername}`
                          : order.customer.phone || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-span-4">
                  <p className="text-sm text-gray-700">
                    {order.items.length === 0
                      ? '—'
                      : `${order.items[0].product.name} × ${order.items[0].quantity}${
                          order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''
                        }`}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm font-semibold text-gray-900">{formatUZS(order.total)}</p>
                </div>

                <div className="col-span-1">
                  <ActivityBadge status={order.orderStatus} type="order" />
                </div>

                <div className="col-span-1">
                  <ActivityBadge status={order.paymentStatus} type="payment" />
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      {total > LIMIT && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page * LIMIT >= total}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create order panel */}
      {showCreateForm && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowCreateForm(false)}
          />
          <div className="relative z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <p className="text-lg font-bold text-gray-900">New order</p>
              <button onClick={() => setShowCreateForm(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Field 1 — Customer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer *
                </label>
                <select
                  value={orderCustomerId}
                  onChange={(e) => setOrderCustomerId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select a customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Field 2 — Products */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Products *
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex justify-between px-4 py-2 bg-gray-50 border-b">
                    <p className="text-xs font-medium text-gray-500">Add products</p>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{formatUZS(product.price)}</p>
                        </div>
                        <button
                          onClick={() => addOrderItem(product.id)}
                          className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 flex items-center justify-center"
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
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl"
                      >
                        <p className="text-sm font-medium text-gray-900 flex-1">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateOrderItemQuantity(item.productId, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-white border text-sm font-bold flex items-center justify-center"
                          >
                            -
                          </button>
                          <p className="text-sm font-semibold w-6 text-center">{item.quantity}</p>
                          <button
                            onClick={() => updateOrderItemQuantity(item.productId, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-white border text-sm font-bold flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 w-24 text-right">
                          {formatUZS(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}

                    <div className="flex justify-between items-center px-3 py-2 border-t border-gray-200 mt-2">
                      <p className="text-sm font-bold text-gray-900">Total</p>
                      <p className="text-sm font-bold text-gray-900">{formatUZS(orderTotal)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Field 3 — Delivery method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Delivery
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderDeliveryMethod('PICKUP')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      orderDeliveryMethod === 'PICKUP'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Pickup
                  </button>
                  <button
                    onClick={() => setOrderDeliveryMethod('DELIVERY')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      orderDeliveryMethod === 'DELIVERY'
                        ? 'bg-gray-900 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Delivery
                  </button>
                </div>

                {orderDeliveryMethod === 'DELIVERY' && (
                  <div className="space-y-3 mt-3">
                    <input
                      type="text"
                      value={orderDeliveryAddress}
                      onChange={(e) => setOrderDeliveryAddress(e.target.value)}
                      placeholder="Delivery address"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Requested delivery date (optional)
                      </label>
                      <input
                        type="date"
                        value={orderDeliveryDate}
                        onChange={(e) => setOrderDeliveryDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Field 4 — Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex-shrink-0 space-y-3">
              {orderError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{orderError}</p>
                </div>
              )}
              <button
                onClick={handleCreateOrder}
                disabled={orderSaving}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {orderSaving ? 'Saving...' : 'Create order'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-lg z-50 flex items-center gap-2">
          {savedMessage}
        </div>
      )}
    </AuthLayout>
  )
}
