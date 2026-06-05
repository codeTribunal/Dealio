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
  businessId: string
): Promise<AdminBusiness> {
  const res = await adminApi.post(`/admin/businesses/${businessId}/unsuspend`)
  return res.data
}

export async function impersonateBusiness(
  businessId: string
): Promise<{ token: string; expiresAt: string; businessName: string }> {
  const res = await adminApi.post(
    `/admin/businesses/${businessId}/impersonate`
  )
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
