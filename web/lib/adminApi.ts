import axios from 'axios'
import Cookies from 'js-cookie'

const ADMIN_TOKEN_KEY = 'crm_admin_token'

export function getAdminToken(): string | null {
  return Cookies.get(ADMIN_TOKEN_KEY) || null
}

export function setAdminToken(token: string): void {
  Cookies.set(ADMIN_TOKEN_KEY, token, {
    expires: 0.33,
    sameSite: 'strict',
  })
}

export function clearAdminToken(): void {
  Cookies.remove(ADMIN_TOKEN_KEY)
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken()
}

const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
})

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAdminToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(error)
  }
)

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

export async function adminLogin(
  email: string,
  password: string
): Promise<{ token: string; admin: AdminUser }> {
  const res = await adminApi.post('/admin/auth/login', { email, password })
  return res.data
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

// Read the current admin's role from the JWT (display-gating only; the server
// enforces requireSuperAdmin regardless).
export function getAdminRole(): 'SUPER_ADMIN' | 'SUPPORT' | null {
  const token = getAdminToken()
  if (!token) return null
  try {
    const seg = token.split('.')[1]
    const obj = JSON.parse(atob(seg.replace(/-/g, '+').replace(/_/g, '/')))
    return obj.role === 'SUPER_ADMIN' || obj.role === 'SUPPORT' ? obj.role : null
  } catch {
    return null
  }
}

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
}

/** Both legal documents keyed by type. Either may be absent if unseeded. */
export async function getLegalDocs(): Promise<Partial<Record<LegalDocType, LegalDoc>>> {
  const res = await adminApi.get('/admin/legal-docs')
  return res.data.docs
}

/** Publish a new in-force version for a document. For PRIVACY this forces
 *  re-consent. The backend rejects an empty or unchanged version. */
export async function publishLegalVersion(
  docType: LegalDocType,
  version: string
): Promise<LegalDoc & { docType: LegalDocType }> {
  const res = await adminApi.post(`/admin/legal-docs/${docType}/publish`, { version })
  return res.data
}
