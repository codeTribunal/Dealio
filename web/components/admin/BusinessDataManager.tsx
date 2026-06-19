'use client'
import { useState, useEffect, useCallback, ReactNode } from 'react'
import { Search } from 'lucide-react'
import {
  TenantEntity,
  TenantListParams,
  Paginated,
  AdminCustomerRow,
  AdminOrderRow,
  AdminAppointmentRow,
  AdminProjectRow,
  getBusinessCustomers,
  getBusinessOrders,
  getBusinessAppointments,
  getBusinessProjects,
  getAdminRecord,
  updateAdminRecord,
  softDeleteAdminRecord,
  restoreAdminRecord,
  anonymizeCustomer,
  getAdminRole,
} from '@/lib/adminApi'
import {
  formatUZS,
  formatDate,
  formatDateTime,
  formatOrderStatus,
  formatPaymentStatus,
  formatProjectStatus,
  formatAppointmentStatus,
} from '@/lib/format'

const PAGE_SIZE = 20

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select'
  nullable?: boolean
  options?: { value: string; label: string }[]
}

const opts = (values: string[], fmt: (v: string) => string) =>
  values.map((v) => ({ value: v, label: fmt(v) }))

const ORDER_STATUS = opts(['NEW', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'], formatOrderStatus)
const PAYMENT_STATUS = opts(['PENDING', 'PAYMENT_RECEIVED', 'CONFIRMED'], formatPaymentStatus)
const APPT_STATUS = opts(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], formatAppointmentStatus)
const PROJECT_STATUS = opts(['PROPOSAL_SENT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'], formatProjectStatus)

interface TabConfig<T extends { id: string; deleted: boolean }> {
  entity: TenantEntity
  label: string
  hasSearch: boolean
  statusOptions?: { value: string; label: string }[]
  fetch: (businessId: string, params: TenantListParams) => Promise<Paginated<T>>
  columns: { header: string; cell: (row: T) => ReactNode }[]
  editFields: FieldDef[]
  summary: (detail: Record<string, unknown>) => ReactNode
}

const customersTab: TabConfig<AdminCustomerRow> = {
  entity: 'customers',
  label: 'Customers',
  hasSearch: true,
  fetch: getBusinessCustomers,
  columns: [
    { header: 'Name', cell: (r) => r.name },
    { header: 'Phone', cell: (r) => r.phone || '—' },
    { header: 'Telegram', cell: (r) => (r.telegramUsername ? `@${r.telegramUsername}` : '—') },
    { header: 'Created', cell: (r) => formatDate(r.createdAt) },
  ],
  editFields: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text', nullable: true },
    { key: 'notes', label: 'Notes', type: 'textarea', nullable: true },
  ],
  summary: (d) => `Created ${d.createdAt ? formatDate(String(d.createdAt)) : '—'}`,
}

const ordersTab: TabConfig<AdminOrderRow> = {
  entity: 'orders',
  label: 'Orders',
  hasSearch: true,
  statusOptions: ORDER_STATUS,
  fetch: getBusinessOrders,
  columns: [
    { header: '#', cell: (r) => `#${r.orderNumber}` },
    { header: 'Customer', cell: (r) => r.customer?.name || '—' },
    { header: 'Total', cell: (r) => formatUZS(r.total) },
    { header: 'Status', cell: (r) => formatOrderStatus(r.orderStatus) },
    { header: 'Payment', cell: (r) => formatPaymentStatus(r.paymentStatus) },
    { header: 'Created', cell: (r) => formatDate(r.createdAt) },
  ],
  editFields: [
    { key: 'orderStatus', label: 'Order status', type: 'select', options: ORDER_STATUS },
    { key: 'paymentStatus', label: 'Payment status', type: 'select', options: PAYMENT_STATUS },
    { key: 'internalNotes', label: 'Internal notes', type: 'textarea', nullable: true },
  ],
  summary: (d) => `Order #${d.orderNumber ?? '—'} · ${formatUZS(Number(d.total ?? 0))}`,
}

const appointmentsTab: TabConfig<AdminAppointmentRow> = {
  entity: 'appointments',
  label: 'Appointments',
  hasSearch: false,
  statusOptions: APPT_STATUS,
  fetch: getBusinessAppointments,
  columns: [
    { header: 'Customer', cell: (r) => r.customer?.name || '—' },
    { header: 'Service', cell: (r) => r.service?.name || '—' },
    { header: 'Start', cell: (r) => formatDateTime(r.startTime) },
    { header: 'Status', cell: (r) => formatAppointmentStatus(r.status) },
    { header: 'Payment', cell: (r) => formatPaymentStatus(r.paymentStatus) },
  ],
  editFields: [
    { key: 'status', label: 'Status', type: 'select', options: APPT_STATUS },
    { key: 'paymentStatus', label: 'Payment status', type: 'select', options: PAYMENT_STATUS },
    { key: 'notes', label: 'Notes', type: 'textarea', nullable: true },
  ],
  summary: (d) => (d.startTime ? formatDateTime(String(d.startTime)) : '—'),
}

const projectsTab: TabConfig<AdminProjectRow> = {
  entity: 'projects',
  label: 'Projects',
  hasSearch: false,
  statusOptions: PROJECT_STATUS,
  fetch: getBusinessProjects,
  columns: [
    { header: 'Name', cell: (r) => r.name },
    { header: 'Customer', cell: (r) => r.customer?.name || '—' },
    { header: 'Total', cell: (r) => formatUZS(r.totalPrice) },
    { header: 'Status', cell: (r) => formatProjectStatus(r.status) },
    { header: 'Deadline', cell: (r) => (r.deadline ? formatDate(r.deadline) : '—') },
  ],
  editFields: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: PROJECT_STATUS },
    { key: 'totalPrice', label: 'Total price (soum)', type: 'number' },
    { key: 'deadline', label: 'Deadline', type: 'date', nullable: true },
    { key: 'paymentTerms', label: 'Payment terms', type: 'text', nullable: true },
    { key: 'description', label: 'Description', type: 'textarea', nullable: true },
  ],
  summary: (d) => `${formatUZS(Number(d.totalPrice ?? 0))}${d.deadline ? ` · due ${formatDate(String(d.deadline))}` : ''}`,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TABS: TabConfig<any>[] = [customersTab, ordersTab, appointmentsTab, projectsTab]

function isoToDateInput(iso: unknown): string {
  if (!iso) return ''
  try {
    return new Date(String(iso)).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

// ── Record detail / edit modal ────────────────────────────────────────────────

function RecordModal<T extends { id: string; deleted: boolean }>({
  config,
  id,
  onClose,
  onChanged,
}: {
  config: TabConfig<T>
  id: string
  onClose: () => void
  onChanged: () => void
}) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'delete' | 'anonymize' | null>(null)
  const role = getAdminRole()

  useEffect(() => {
    getAdminRecord(config.entity, id)
      .then((d) => {
        setDetail(d)
        const f: Record<string, string> = {}
        for (const field of config.editFields) {
          const v = d[field.key]
          f[field.key] = field.type === 'date' ? isoToDateInput(v) : v == null ? '' : String(v)
        }
        setForm(f)
      })
      .catch(() => setError('Failed to load record'))
      .finally(() => setLoading(false))
  }, [config, id])

  const deleted = detail?.deleted === true
  const anonymized = detail?.anonymizedAt != null

  const buildBody = (): Record<string, unknown> => {
    const body: Record<string, unknown> = {}
    for (const field of config.editFields) {
      const raw = form[field.key] ?? ''
      if (field.type === 'number') {
        body[field.key] = raw === '' ? 0 : Number(raw)
      } else if (field.type === 'date') {
        body[field.key] = raw ? new Date(raw).toISOString() : null
      } else {
        body[field.key] = field.nullable && raw.trim() === '' ? null : raw
      }
    }
    return body
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateAdminRecord(config.entity, id, buildBody())
      onChanged()
      onClose()
    } catch {
      setError('Save failed')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    setError(null)
    try {
      await softDeleteAdminRecord(config.entity, id)
      onChanged()
      onClose()
    } catch {
      setError('Delete failed')
      setSaving(false)
    }
  }

  const handleRestore = async () => {
    setSaving(true)
    setError(null)
    try {
      await restoreAdminRecord(config.entity, id)
      onChanged()
      onClose()
    } catch {
      setError('Restore failed')
      setSaving(false)
    }
  }

  const handleAnonymize = async () => {
    setSaving(true)
    setError(null)
    try {
      await anonymizeCustomer(id)
      onChanged()
      onClose()
    } catch {
      setError('Anonymize failed')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white capitalize">
              {config.entity.slice(0, -1)} detail
            </h3>
            {detail && (
              <p className="text-xs text-gray-500 mt-0.5">{config.summary(detail)}</p>
            )}
          </div>
          {anonymized ? (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-900 text-purple-300">
              Erased
            </span>
          ) : deleted ? (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-300">
              Deleted
            </span>
          ) : null}
        </div>

        {loading && <p className="text-sm text-gray-500 py-6 text-center">Loading...</p>}

        {!loading && detail && (
          <div className="space-y-3">
            {config.editFields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(field.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}

            {pendingAction === 'anonymize' && (
              <div className="text-xs text-red-300 bg-red-900/30 border border-red-800 rounded-lg p-2.5 space-y-1">
                <p className="font-semibold">Irreversibly erase personal data?</p>
                <p>
                  Scrubs name, phone, Telegram, notes, birthday, custom fields, tags, and each
                  order&apos;s delivery address &amp; checkout answers. Keeps the customer row and
                  their orders / appointments / projects, de-identified. This cannot be undone.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex items-center justify-between gap-3 pt-2">
              <div>
                {anonymized ? (
                  <span className="text-xs text-purple-300 font-medium">Personal data erased</span>
                ) : deleted ? (
                  <button
                    onClick={handleRestore}
                    disabled={saving}
                    className="px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    Restore
                  </button>
                ) : pendingAction ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={pendingAction === 'anonymize' ? handleAnonymize : handleDelete}
                      disabled={saving}
                      className="px-3 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {saving
                        ? 'Working...'
                        : pendingAction === 'anonymize'
                        ? 'Erase personal data'
                        : 'Delete'}
                    </button>
                    <button
                      onClick={() => setPendingAction(null)}
                      className="px-3 py-2 bg-gray-700 text-gray-200 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPendingAction('delete')}
                      disabled={saving}
                      className="px-4 py-2 border border-red-800 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                    >
                      Delete
                    </button>
                    {config.entity === 'customers' && role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => setPendingAction('anonymize')}
                        disabled={saving}
                        className="px-4 py-2 bg-red-900/40 border border-red-700 text-red-300 rounded-xl text-sm font-semibold hover:bg-red-900/60 disabled:opacity-50 transition-colors"
                      >
                        Anonymize
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 text-white rounded-xl text-sm"
                >
                  Close
                </button>
                {!deleted && !anonymized && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── One tab's table ───────────────────────────────────────────────────────────

function DataTab<T extends { id: string; deleted: boolean }>({
  businessId,
  config,
  initialSelectedId,
}: {
  businessId: string
  config: TabConfig<T>
  initialSelectedId?: string | null
}) {
  const [rows, setRows] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [showDeleted, setShowDeleted] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await config.fetch(businessId, {
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status,
        includeDeleted: showDeleted,
      })
      setRows(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [businessId, config, page, search, status, showDeleted])

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  // Open the deep-linked record once its id arrives (from global search).
  useEffect(() => {
    if (initialSelectedId) setSelectedId(initialSelectedId)
  }, [initialSelectedId])

  const colCount = config.columns.length + 1

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {config.hasSearch && (
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={`Search ${config.label.toLowerCase()}...`}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-600 w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {config.statusOptions && (
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All statuses</option>
            {config.statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => {
              setShowDeleted(e.target.checked)
              setPage(1)
            }}
            className="accent-blue-600"
          />
          Show deleted
        </label>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 border-b border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wider">
              {config.columns.map((c) => (
                <th key={c.header} className="text-left px-4 py-3 whitespace-nowrap">
                  {c.header}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-gray-600">
                  No {config.label.toLowerCase()} found
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className={`border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                    row.deleted ? 'opacity-50' : ''
                  }`}
                >
                  {config.columns.map((c, i) => (
                    <td key={c.header} className="px-4 py-3 whitespace-nowrap text-gray-200">
                      {i === 0 ? (
                        <span className="flex items-center gap-2">
                          {c.cell(row)}
                          {row.deleted && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-900 text-red-300">
                              Deleted
                            </span>
                          )}
                          {(row as { anonymizedAt?: string | null }).anonymizedAt && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-900 text-purple-300">
                              Erased
                            </span>
                          )}
                        </span>
                      ) : (
                        c.cell(row)
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-blue-400">Open</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {total > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * PAGE_SIZE >= total}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <RecordModal
          config={config}
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}

export default function BusinessDataManager({ businessId }: { businessId: string }) {
  const [active, setActive] = useState(0)
  const [pendingCustomer, setPendingCustomer] = useState<string | null>(null)

  // Honor a deep link from global search: ?tab=customers&customer=<id> opens
  // that tab with the customer's detail modal. Read from the URL on mount
  // (avoids useSearchParams' Suspense requirement on this dynamic page).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const idx = TABS.findIndex((t) => t.entity === sp.get('tab'))
    if (idx >= 0) setActive(idx)
    const customer = sp.get('customer')
    if (customer) setPendingCustomer(customer)
  }, [])

  const config = TABS[active]

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Data management</h3>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t, i) => (
          <button
            key={t.entity}
            onClick={() => {
              setActive(i)
              setPendingCustomer(null)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              i === active
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Re-mount per tab so each tab's filters/page reset cleanly */}
      <DataTab
        key={config.entity}
        businessId={businessId}
        config={config}
        initialSelectedId={config.entity === 'customers' ? pendingCustomer : null}
      />
    </div>
  )
}
