import axios from 'axios'

// Admin auth rides an httpOnly admin_session cookie set/cleared by the
// backend (login/logout) — JS never sees the token, so there is no js-cookie
// storage and no Bearer header here. withCredentials sends the cookie;
// x-requested-with is the CSRF companion header the backend requires on every
// mutating /admin/* request.
const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'x-requested-with': 'dealio-admin' },
})

// Role cache for synchronous UI gating (display only — the server enforces
// requireSuperAdmin regardless). Primed by adminLogin/fetchAdminMe; cleared
// on logout and on any 401.
let cachedAdminRole: 'SUPER_ADMIN' | 'SUPPORT' | null = null

export function getAdminRole(): 'SUPER_ADMIN' | 'SUPPORT' | null {
  return cachedAdminRole
}

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      cachedAdminRole = null
      // Skip the redirect on the login page itself so a failed sign-in shows
      // its error instead of reloading the page.
      if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface AdminMe {
  id: string
  name: string
  role: 'SUPER_ADMIN' | 'SUPPORT'
}

export async function adminLogin(
  email: string,
  password: string
): Promise<{ admin: AdminMe }> {
  const res = await adminApi.post('/admin/auth/login', { email, password })
  cachedAdminRole = res.data.admin.role
  return res.data
}

// Identity from the session cookie; primes the getAdminRole() cache. A 401
// here (missing/expired session) triggers the interceptor redirect to login.
export async function fetchAdminMe(): Promise<AdminMe> {
  const res = await adminApi.get('/admin/auth/me')
  cachedAdminRole = res.data.role
  return res.data
}

export async function adminLogout(): Promise<void> {
  try {
    await adminApi.post('/admin/auth/logout')
  } finally {
    cachedAdminRole = null
  }
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'SUPPORT'
}

export interface AdminBusiness {
  id: string
  name: string
  description: string | null
  mode: string
  language: string
  botUsername: string | null
  plan: string
  planExpiresAt: string | null
  suspendedAt: string | null
  suspendedReason: string | null
  createdAt: string
  updatedAt: string
  owner: { id: string; phone: string }
  _count: {
    customers: number
    orders: number
    appointments: number
    staff: number
  }
}

export interface FunnelStep {
  count: number
  /** % of the window's signups. */
  pct: number
}

export interface FunnelWindow {
  signups: number
  botConnected: FunnelStep
  catalogReady: FunnelStep
  firstSale: FunnelStep
  activated: FunnelStep
  medianDaysToFirstSale: number | null
}

export interface DashboardMetrics {
  totalBusinesses: number
  activeThisMonth: number
  newThisWeek: number
  byPlan: { FREE: number; PRO: number; BUSINESS: number }
  totalCustomers: number
  suspended: number
  recentSignups: {
    id: string
    name: string
    plan: string
    createdAt: string
  }[]
  recentSuspensions: {
    id: string
    name: string
    suspendedReason: string | null
    suspendedAt: string
  }[]
  // ── v2: activation funnel, attention lists, momentum, upgrade candidates ──
  funnel: { '7d': FunnelWindow; '30d': FunnelWindow; all: FunnelWindow }
  attention: {
    pendingDeletion: { id: string; name: string; deletionScheduledAt: string | null }[]
    stuckOnboarding: { id: string; name: string; createdAt: string }[]
    goneQuiet: { id: string; name: string }[]
  }
  momentum: { day: string; ordersPlusAppointments: number; newCustomers: number }[]
  upgradeCandidates: {
    id: string
    name: string
    metric: 'customers' | 'ordersPerMonth' | 'appointmentsPerMonth'
    current: number
    limit: number
  }[]
  composition: {
    byMode: Record<string, number>
    byLanguage: Record<string, number>
  }
}

export interface AuditEntry {
  id: string
  action: string
  targetType: string
  targetId: string
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
  adminUser: { id: string; name: string; email: string }
}

export async function getDashboard(): Promise<DashboardMetrics> {
  const res = await adminApi.get('/admin/dashboard')
  return res.data
}

export async function getAdminBusinesses(params: {
  search?: string
  plan?: string
  status?: string
  page?: number
  limit?: number
}): Promise<{ data: AdminBusiness[]; total: number }> {
  const res = await adminApi.get('/admin/businesses', {
    params: {
      search: params.search || undefined,
      plan: params.plan || undefined,
      status: params.status || undefined,
      page: params.page || 1,
      limit: params.limit || 20,
    },
  })
  return res.data
}

export async function getAdminBusiness(id: string): Promise<AdminBusiness & {
  usageThisMonth: unknown
  recentOrders: unknown[]
  recentCustomers: unknown[]
}> {
  const res = await adminApi.get(`/admin/businesses/${id}`)
  return res.data
}

export async function changePlan(
  businessId: string,
  plan: string,
  note?: string
): Promise<AdminBusiness> {
  const res = await adminApi.patch(`/admin/businesses/${businessId}/plan`, {
    plan,
    note,
  })
  return res.data
}

export async function suspendBusiness(
  businessId: string,
  reason: string
): Promise<AdminBusiness> {
  const res = await adminApi.post(`/admin/businesses/${businessId}/suspend`, {
    reason,
  })
  return res.data
}

export async function unsuspendBusiness(
  businessId: string,
  reason: string
): Promise<AdminBusiness> {
  const res = await adminApi.post(`/admin/businesses/${businessId}/unsuspend`, {
    reason,
  })
  return res.data
}

export async function impersonateBusiness(
  businessId: string,
  reason: string
): Promise<{ token: string; expiresAt: string; businessName: string }> {
  const res = await adminApi.post(
    `/admin/businesses/${businessId}/impersonate`,
    { reason }
  )
  return res.data
}

// ── Platform settings (global flags) ──────────────────────────────────────────

export interface PlatformSettings {
  cardPaymentsEnabled: boolean
}

// Any authenticated admin may read (so the panel can show current state).
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const res = await adminApi.get('/admin/platform-settings')
  return res.data
}

// SUPER_ADMIN only — enforced on the backend (PATCH returns 403 for SUPPORT).
export async function updatePlatformSettings(
  cardPaymentsEnabled: boolean
): Promise<PlatformSettings> {
  const res = await adminApi.patch('/admin/platform-settings', {
    cardPaymentsEnabled,
  })
  return res.data
}

export async function getAuditLog(params: {
  page?: number
  limit?: number
}): Promise<{ data: AuditEntry[]; total: number }> {
  const res = await adminApi.get('/admin/audit', {
    params: { page: params.page || 1, limit: params.limit || 50 },
  })
  return res.data
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await adminApi.get('/admin/users')
  return res.data
}

// ── Tenant data-management (Phase B) ──────────────────────────────────────────

export type TenantEntity = 'customers' | 'orders' | 'appointments' | 'projects'

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface AdminCustomerRow {
  id: string
  name: string
  phone: string | null
  telegramUsername: string | null
  createdAt: string
  lastInteractionAt: string
  deleted: boolean
  anonymizedAt: string | null
}

export interface AdminOrderRow {
  id: string
  orderNumber: number
  total: number
  orderStatus: string
  paymentStatus: string
  createdAt: string
  deleted: boolean
  customer: { id: string; name: string } | null
}

export interface AdminAppointmentRow {
  id: string
  startTime: string
  endTime: string
  status: string
  price: number
  paymentStatus: string
  createdAt: string
  deleted: boolean
  customer: { id: string; name: string } | null
  service: { id: string; name: string } | null
  staff: { id: string; name: string } | null
}

export interface AdminProjectRow {
  id: string
  name: string
  totalPrice: number
  status: string
  deadline: string | null
  createdAt: string
  deleted: boolean
  customer: { id: string; name: string } | null
}

export interface TenantListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  date?: string
  includeDeleted?: boolean
}

function tenantParams(params: TenantListParams) {
  return {
    page: params.page || 1,
    limit: params.limit || 20,
    search: params.search || undefined,
    status: params.status && params.status !== 'ALL' ? params.status : undefined,
    date: params.date || undefined,
    includeDeleted: params.includeDeleted ? 'true' : undefined,
  }
}

export async function getBusinessCustomers(
  businessId: string,
  params: TenantListParams
): Promise<Paginated<AdminCustomerRow>> {
  const res = await adminApi.get(`/admin/businesses/${businessId}/customers`, { params: tenantParams(params) })
  return res.data
}

export async function getBusinessOrders(
  businessId: string,
  params: TenantListParams
): Promise<Paginated<AdminOrderRow>> {
  const res = await adminApi.get(`/admin/businesses/${businessId}/orders`, { params: tenantParams(params) })
  return res.data
}

export async function getBusinessAppointments(
  businessId: string,
  params: TenantListParams
): Promise<Paginated<AdminAppointmentRow>> {
  const res = await adminApi.get(`/admin/businesses/${businessId}/appointments`, { params: tenantParams(params) })
  return res.data
}

export async function getBusinessProjects(
  businessId: string,
  params: TenantListParams
): Promise<Paginated<AdminProjectRow>> {
  const res = await adminApi.get(`/admin/businesses/${businessId}/projects`, { params: tenantParams(params) })
  return res.data
}

// Single-record detail (full fields; always returns the record even if deleted).
export async function getAdminRecord(
  entity: TenantEntity,
  id: string
): Promise<Record<string, unknown> & { id: string; deleted: boolean }> {
  const res = await adminApi.get(`/admin/${entity}/${id}`)
  return res.data
}

// Edit — body keys mirror the owner-editable fields for that entity.
export async function updateAdminRecord(
  entity: TenantEntity,
  id: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown> & { id: string; deleted: boolean }> {
  const res = await adminApi.patch(`/admin/${entity}/${id}`, body)
  return res.data
}

export async function softDeleteAdminRecord(
  entity: TenantEntity,
  id: string
): Promise<{ id: string; deleted: boolean }> {
  const res = await adminApi.delete(`/admin/${entity}/${id}`)
  return res.data
}

export async function restoreAdminRecord(
  entity: TenantEntity,
  id: string
): Promise<{ id: string; restored: boolean }> {
  const res = await adminApi.post(`/admin/${entity}/${id}/restore`)
  return res.data
}

// ── Erasure (Phase C) — irreversible, super-admin only ────────────────────────

export async function anonymizeCustomer(
  id: string
): Promise<{ id: string; anonymized: boolean; scrubbedFields: string[] }> {
  const res = await adminApi.post(`/admin/customers/${id}/anonymize`)
  return res.data
}

export async function eraseBusiness(
  id: string
): Promise<{ id: string; erased: boolean; tableCounts: Record<string, number> }> {
  const res = await adminApi.post(`/admin/businesses/${id}/erase`)
  return res.data
}

// ── Global search (Phase D) — cross-business, admin-only ──────────────────────

export interface BusinessSearchResult {
  kind: 'business'
  id: string
  name: string
  ownerPhone: string
  plan: string
  status: 'active' | 'suspended'
}

export interface CustomerSearchResult {
  kind: 'customer'
  id: string
  name: string
  phone: string | null
  telegramUsername: string | null
  businessId: string
  businessName: string
  anonymizedAt: string | null
  deleted: boolean
}

export type SearchResult = BusinessSearchResult | CustomerSearchResult

export interface SearchResponse {
  items: SearchResult[]
  total: number
  page: number
  limit: number
  counts: { businesses: number; customers: number }
  message?: string
}

export async function adminSearch(params: {
  q: string
  type?: 'all' | 'business' | 'customer'
  page?: number
  limit?: number
  includeDeleted?: boolean
}): Promise<SearchResponse> {
  const res = await adminApi.get('/admin/search', {
    params: {
      q: params.q,
      type: params.type && params.type !== 'all' ? params.type : undefined,
      page: params.page || 1,
      limit: params.limit || 20,
      includeDeleted: params.includeDeleted ? 'true' : undefined,
    },
  })
  return res.data
}

// ── Legal documents (versioning + re-consent) — SUPER_ADMIN only ──────────────

export type LegalDocType = 'PRIVACY' | 'OFFER'

export interface LegalDoc {
  version: string
  publishedAt: string
  publishedByAdminId: string | null
  // sha256 of the in-code text serialization at publish time (see
  // lib/legalHash.ts). Null on rows published before hash tracking.
  contentHash: string | null
}

/** Both legal documents keyed by type. Either may be absent if unseeded. */
export async function getLegalDocs(): Promise<Partial<Record<LegalDocType, LegalDoc>>> {
  const res = await adminApi.get('/admin/legal-docs')
  return res.data.docs
}

/** Publish a new in-force version for a document. For PRIVACY this forces
 *  re-consent. The backend rejects an empty or unchanged version. `content` is
 *  the deterministic serialization of the in-code text (lib/legalHash.ts);
 *  the server computes sha256 over it and stamps the hash on the row. */
export async function publishLegalVersion(
  docType: LegalDocType,
  version: string,
  content: string
): Promise<LegalDoc & { docType: LegalDocType }> {
  const res = await adminApi.post(`/admin/legal-docs/${docType}/publish`, { version, content })
  return res.data
}
