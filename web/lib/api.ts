import axios from 'axios'
import { getToken, clearToken } from './auth'
import { isAdminUiContext } from './adminContext'
import { isPublicPath } from './publicPaths'
import type {
  AuthResponse,
  Business,
  Customer,
  CustomersResponse,
  CustomerDetail,
  Order,
  OrdersResponse,
  AppointmentsResponse,
  AnalyticsData,
  HomeData,
  Project,
  ProjectsResponse,
  ProjectMilestone,
  ProjectInvoice,
  Appointment,
  StaffMember,
  Service,
  WorkingHours,
  BlockedSlot,
} from '@/types'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from a protected resource means the session is gone/expired: clear
    // the token and bounce to the arrival screen. Auth endpoints (login/enroll
    // verify) legitimately return 401 for a bad code — those are handled by the
    // caller and must NOT trigger a redirect.
    const url: string = error.config?.url ?? ''
    const isAuthEndpoint = url.includes('/auth/')
    // Admin routes carry their own auth (httpOnly admin_session) and their own
    // 401 handling in adminApi. A stray owner-axios 401 in the admin UI must
    // NOT clear the owner token or bounce to /welcome — that would hijack the
    // admin login. isAdminUiContext() is host-OR-path aware, so it also covers
    // the admin host serving the panel at the root path '/'.
    // Public owner-app routes (marketing root "/", /privacy, /offer) are logged-out
    // landing pages: an owner 401 there must NOT clear the token or bounce to
    // /welcome, which would break the bot consent-gate link (dealio.uz/privacy) and
    // the pd.gov.uz filing URL. The set is defined once in lib/publicPaths
    // (isPublicPath), mirroring the isAdminUiContext carve-out above.
    if (error.response?.status === 401 && !isAuthEndpoint && !isAdminUiContext() && !isPublicPath()) {
      clearToken()
      if (typeof window !== 'undefined' && window.location.pathname !== '/welcome') {
        window.location.href = '/welcome'
      }
    }
    return Promise.reject(error)
  }
)

// ── Onboarding ────────────────────────────────────────────────────────────────

export async function verifyBotToken(token: string): Promise<{
  valid: boolean
  botUsername: string
  botName: string
}> {
  const res = await api.post('/onboarding/verify-bot-token', { token })
  return res.data
}

export async function completeOnboarding(data: {
  businessName: string
  mode: string
  language: string
  botToken: string
}): Promise<{ id: string; name: string; botUsername: string; botLink: string }> {
  const res = await api.post('/onboarding/complete', data)
  return res.data.business
}

// ── Auth (Telegram OTP) ─────────────────────────────────────────────────────

// Enrollment (first-time sign up) — the final onboarding step.
export async function enrollStart(): Promise<{ token: string; botDeepLink: string }> {
  const res = await api.post('/auth/enroll/start', {})
  return res.data
}

export async function enrollStatus(
  token: string
): Promise<{ chatStarted: boolean; phoneBound: boolean }> {
  const res = await api.get('/auth/enroll/status', { params: { token } })
  return res.data
}

export async function enrollVerify(data: {
  token: string
  code: string
  generalConsent: boolean
  crossBorderConsent: boolean
}): Promise<AuthResponse> {
  const res = await api.post('/auth/enroll/verify', data)
  return res.data
}

// Returning login — phone → code, no consent.
export async function loginRequest(phone: string): Promise<void> {
  await api.post('/auth/login/request', { phone })
}

export async function loginVerify(phone: string, code: string): Promise<AuthResponse> {
  const res = await api.post('/auth/login/verify', { phone, code })
  return res.data
}

export async function getBusiness(): Promise<Business> {
  const res = await api.get('/business')
  return res.data
}

// Self-serve account deletion. `confirmation` must be the business name or the
// literal "DELETE" (also validated server-side). Schedules an irreversible purge
// in 30 days and suspends the account immediately.
export async function requestAccountDeletion(
  confirmation: string,
): Promise<{ pending: boolean; deletionScheduledAt: string | null }> {
  const res = await api.post('/business/request-deletion', { confirmation })
  return res.data
}

// Cancel a pending deletion within the 30-day window and restore access.
export async function reactivateAccount(): Promise<{ reactivated: boolean }> {
  const res = await api.post('/business/reactivate', {})
  return res.data
}

export async function getHome(): Promise<HomeData> {
  const res = await api.get('/home')
  return res.data
}

export async function getCustomers(params: {
  search?: string
  page?: number
  limit?: number
  includeDeleted?: boolean
}): Promise<CustomersResponse> {
  const res = await api.get('/customers', {
    params: {
      search: params.search || undefined,
      page: params.page || 1,
      limit: params.limit || 30,
      includeDeleted: params.includeDeleted ? 'true' : undefined,
    },
  })
  const data = res.data
  return {
    customers: Array.isArray(data) ? data :
               Array.isArray(data?.customers) ? data.customers : [],
    total: data?.total ?? data?.length ?? 0,
  }
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail> {
  const res = await api.get(`/customers/${id}`)
  return res.data
}

export async function createCustomer(data: {
  name: string
  phone?: string
  telegramUsername?: string
}): Promise<Customer> {
  const res = await api.post('/customers', data)
  return res.data
}

export async function updateCustomerNotes(
  id: string,
  notes: string
): Promise<void> {
  await api.patch(`/customers/${id}/notes`, { notes })
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`)
}

export async function restoreCustomer(id: string): Promise<void> {
  await api.post(`/customers/${id}/restore`)
}

export async function getOrders(params: {
  status?: string
  paymentStatus?: string
  search?: string
  page?: number
  limit?: number
  includeDeleted?: boolean
}): Promise<OrdersResponse> {
  const res = await api.get('/orders', {
    params: {
      status: params.status || undefined,
      paymentStatus: params.paymentStatus || undefined,
      search: params.search || undefined,
      page: params.page || 1,
      limit: params.limit || 30,
      includeDeleted: params.includeDeleted ? 'true' : undefined,
    },
  })
  const raw = res.data
  // Backend returns a plain array, not { orders, total }
  const orders = Array.isArray(raw) ? raw : (raw.orders ?? [])
  const total = Array.isArray(raw) ? raw.length : (raw.total ?? 0)
  return { orders, total }
}

export async function getOrderDetail(id: string): Promise<Order> {
  const res = await api.get(`/orders/${id}`)
  return res.data
}

// Fetch the payment-proof image through the authenticated proxy as a blob (an
// <img src> can't send the Bearer token; the axios interceptor does). Returns an
// object URL the caller MUST revokeObjectURL when done. Throws on 404/502.
export async function getPaymentProofUrl(orderId: string): Promise<string> {
  const res = await api.get(`/orders/${orderId}/payment-proof`, {
    responseType: 'blob',
  })
  return URL.createObjectURL(res.data as Blob)
}

export async function updateOrderStatus(
  id: string,
  orderStatus: string
): Promise<void> {
  // Backend expects the field name `status` (uppercase enum value), not
  // `orderStatus` — sending the wrong key made zod reject the body with 400.
  await api.patch(`/orders/${id}/status`, { status: orderStatus })
}

export async function confirmOrderPayment(id: string): Promise<void> {
  await api.patch(`/orders/${id}/payment`, { paymentStatus: 'CONFIRMED' })
}

export async function deleteOrder(id: string): Promise<void> {
  await api.delete(`/orders/${id}`)
}

export async function restoreOrder(id: string): Promise<void> {
  await api.post(`/orders/${id}/restore`)
}

export async function createOrder(data: {
  customerId: string
  items: { productId: string; quantity: number; price: number }[]
  deliveryMethod: 'PICKUP' | 'DELIVERY'
  deliveryAddress?: string
  deliveryDate?: string
  notes?: string
}): Promise<Order> {
  const res = await api.post('/orders', {
    ...data,
    deliveryDate: toIsoDateTime(data.deliveryDate),
  })
  return res.data
}

export async function getAppointments(params: {
  date?: string
  status?: string
  page?: number
  limit?: number
  includeDeleted?: boolean
}): Promise<AppointmentsResponse> {
  const res = await api.get('/appointments', {
    params: {
      date: params.date || undefined,
      status: params.status || undefined,
      page: params.page || 1,
      limit: params.limit || 50,
      includeDeleted: params.includeDeleted ? 'true' : undefined,
    }
  })
  const data = res.data
  return {
    appointments: Array.isArray(data) ? data :
                  Array.isArray(data?.appointments) ? data.appointments : [],
    total: data?.total ?? 0
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: string
): Promise<void> {
  await api.patch(`/appointments/${appointmentId}/status`, { status })
}

export async function deleteAppointment(id: string): Promise<void> {
  await api.delete(`/appointments/${id}`)
}

export async function restoreAppointment(id: string): Promise<void> {
  await api.post(`/appointments/${id}/restore`)
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const res = await api.get('/analytics')
  const d = res.data
  return {
    revenueThisMonth: d.revenueThisMonth ?? d.revenue?.thisMonth ?? 0,
    revenueLastMonth: d.revenueLastMonth ?? d.revenue?.lastMonth ?? 0,
    completedThisMonth: d.completedThisMonth ?? 0,
    appointmentsThisMonth: d.appointmentsThisMonth ?? 0,
    pendingPaymentsTotal: d.pendingPaymentsTotal ?? d.pendingTotal ?? 0,
    topCustomers: d.topCustomers ?? d.customers ?? [],
  }
}

export async function updateBusiness(data: {
  name?: string
  description?: string
  address?: string | null
  language?: string
  mode?: string
  workingHours?: WorkingHours
  bufferMinutes?: number
}): Promise<Business> {
  const res = await api.patch('/business', data)
  return res.data
}

// Change the Telegram bot token (after revoking/replacing the bot). The backend
// re-verifies it, re-derives the username, and restarts the bot.
export async function updateBotToken(data: {
  botToken: string
}): Promise<{ botUsername: string | null; botLink: string }> {
  const res = await api.patch('/business/bot-token', data)
  return res.data
}

// Set/update/clear the owner's P2P payment card. null clears a field.
export async function updatePayment(data: {
  cardNumber: string | null
  cardHolderName: string | null
}): Promise<Business> {
  const res = await api.patch('/business/payment', data)
  return res.data
}

// Set the owner's email + newsletter consent (User-scoped). email=null clears it;
// consent is separate from the email. Callers should refetchContext() afterward
// to pick up the flattened owner fields on GET /business.
export async function updateEmailConsent(data: {
  email: string | null
  newsletterConsent: boolean
}): Promise<void> {
  await api.patch('/user/email-consent', data)
}

// Dismiss the analytics email-capture card (Skip): stamps dismissedAt + bumps the
// count server-side (drives the capped one-retry re-push).
export async function dismissEmailPrompt(): Promise<void> {
  await api.patch('/user/dismiss-email-prompt')
}

export async function generateCalendarToken(): Promise<string> {
  const res = await api.post('/business/calendar-token')
  return res.data.calendarToken
}

export async function disableCalendarSync(): Promise<void> {
  await api.delete('/business/calendar-token')
}

// ── Owner reminders ─────────────────────────────────────────────────────────

export interface ReminderSettings {
  appointmentEnabled: boolean
  appointmentHoursBefore: number
  appointmentSecondEnabled: boolean
  appointmentSecondHoursBefore: number
  deliveryEnabled: boolean
  deliveryHoursBefore: number
  deadlineEnabled: boolean
  deadlineHoursBefore: number
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const res = await api.get('/business/reminder-settings')
  return res.data
}

export async function updateReminderSettings(
  settings: Partial<ReminderSettings>
): Promise<ReminderSettings> {
  const res = await api.patch('/business/reminder-settings', settings)
  return res.data
}

export async function getProjects(params: {
  status?: string
  page?: number
  limit?: number
}): Promise<ProjectsResponse> {
  const res = await api.get('/projects', {
    params: {
      status: params.status || undefined,
      page: params.page || 1,
      limit: params.limit || 30,
    },
  })
  const data = res.data
  return {
    projects: Array.isArray(data) ? data :
              Array.isArray(data?.projects) ? data.projects : [],
    total: data?.total ?? 0,
  }
}

export async function updateProjectStatus(
  projectId: string,
  status: string
): Promise<void> {
  await api.patch(`/projects/${projectId}`, { status })
}

export async function updateMilestoneStatus(
  projectId: string,
  milestoneId: string,
  status: string
): Promise<void> {
  await api.patch(`/projects/${projectId}/milestones/${milestoneId}`, { status })
}

export async function markInvoicePaid(
  projectId: string,
  invoiceId: string
): Promise<void> {
  await api.patch(`/projects/${projectId}/invoices/${invoiceId}/paid`, {})
}

// Issues the shareable proposal link's single-use acceptance token
// (generate-if-null server-side). The public accept endpoint requires it.
export async function issueProposalLink(
  projectId: string
): Promise<{ token: string }> {
  const res = await api.post(`/projects/${projectId}/proposal-link`, {})
  return res.data
}

// Backend date fields use z.string().datetime(); a date-only value from
// <input type="date"> must be promoted to a full ISO datetime.
function toIsoDateTime(value?: string): string | undefined {
  if (!value) return undefined
  if (value.includes('T')) return value
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

export async function createProject(data: {
  name: string
  description?: string
  totalPrice: number
  startDate?: string
  deadline?: string
  customerId: string
  paymentTerms?: string
}): Promise<Project> {
  const res = await api.post('/projects', {
    ...data,
    startDate: toIsoDateTime(data.startDate),
    deadline: toIsoDateTime(data.deadline),
  })
  return res.data
}

export async function updateProject(
  id: string,
  data: {
    name?: string
    description?: string
    totalPrice?: number
    deadline?: string
    status?: string
    paymentTerms?: string
  }
): Promise<Project> {
  const res = await api.patch(`/projects/${id}`, {
    ...data,
    deadline: toIsoDateTime(data.deadline),
  })
  return res.data
}

export async function addMilestone(
  projectId: string,
  data: {
    name: string
    amount: number
    dueDate?: string
  }
): Promise<ProjectMilestone> {
  const res = await api.post(
    `/projects/${projectId}/milestones`, {
      ...data,
      dueDate: toIsoDateTime(data.dueDate),
    })
  return res.data
}

export async function createInvoice(
  projectId: string,
  data: {
    milestoneId?: string
    dueDate?: string
  }
): Promise<ProjectInvoice> {
  const res = await api.post(
    `/projects/${projectId}/invoices`, data)
  return res.data
}

export async function getStaff(): Promise<StaffMember[]> {
  const res = await api.get('/staff')
  const data = res.data
  return Array.isArray(data) ? data :
         Array.isArray(data?.staff) ? data.staff : []
}

export async function createStaff(data: {
  name: string
  telegramHandle?: string
  serviceIds: string[]
  daysOff?: string[]
}): Promise<StaffMember> {
  const res = await api.post('/staff', data)
  return res.data
}

export async function updateStaff(
  id: string,
  data: {
    name: string
    telegramHandle?: string
    serviceIds: string[]
    daysOff?: string[]
  }
): Promise<StaffMember> {
  const res = await api.patch(`/staff/${id}`, data)
  return res.data
}

// ── Blocked time (scheduling) ───────────────────────────────────────────────

export async function getBlockedSlots(params: {
  from?: string
  to?: string
  staffId?: string
} = {}): Promise<BlockedSlot[]> {
  const res = await api.get('/blocked-slots', {
    params: {
      from: params.from || undefined,
      to: params.to || undefined,
      staffId: params.staffId || undefined,
    },
  })
  const data = res.data
  return Array.isArray(data) ? data : []
}

export async function createBlockedSlot(data: {
  staffId?: string
  startTime: string
  endTime: string
  reason?: string
}): Promise<BlockedSlot> {
  const res = await api.post('/blocked-slots', data)
  return res.data
}

export async function deleteBlockedSlot(id: string): Promise<void> {
  await api.delete(`/blocked-slots/${id}`)
}

export async function deleteStaff(id: string): Promise<void> {
  await api.delete(`/staff/${id}`)
}

export async function getServices(): Promise<Service[]> {
  const res = await api.get('/services')
  const data = res.data
  return Array.isArray(data) ? data :
         Array.isArray(data?.services) ? data.services : []
}

export async function createService(data: {
  name: string
  durationMinutes: number
  price: number
  active: boolean
}): Promise<Service> {
  const res = await api.post('/services', data)
  return res.data
}

export async function updateService(
  id: string,
  data: {
    name?: string
    durationMinutes?: number
    price?: number
    active?: boolean
  },
): Promise<Service> {
  const res = await api.patch(`/services/${id}`, data)
  return res.data
}

// Soft-delete (recoverable): hides the service from the owner UI and the bot.
export async function deleteService(id: string): Promise<void> {
  await api.delete(`/services/${id}`)
}

// ── Products (Catalog) ──────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  photos: string[]
  stockQty: number | null
  unlimited: boolean
  variants: unknown
  prepTime: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductsResponse {
  products: Product[]
  total: number
}

export async function getProducts(): Promise<Product[]> {
  const res = await api.get('/products')
  const data = res.data
  return Array.isArray(data) ? data :
         Array.isArray(data?.products) ? data.products : []
}

export async function createProduct(data: {
  name: string
  description?: string
  price: number
  stockQty?: number
  unlimited: boolean
  prepTime?: string
  active: boolean
  photos?: string[]
}): Promise<Product> {
  const res = await api.post('/products', data)
  return res.data
}

export async function updateProduct(
  id: string,
  data: {
    name?: string
    description?: string
    price?: number
    stockQty?: number
    unlimited?: boolean
    prepTime?: string
    active?: boolean
    photos?: string[]
  }
): Promise<Product> {
  const res = await api.patch(`/products/${id}`, data)
  return res.data
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`)
}

export async function toggleProductActive(
  id: string
): Promise<Product> {
  const res = await api.patch(`/products/${id}/toggle`)
  return res.data
}

// ── Appointments (manual booking) ───────────────────────────────────────────

export async function createAppointment(data: {
  customerId: string
  serviceId: string
  staffId?: string
  startTime: string
  notes?: string
  paymentType: 'AT_APPOINTMENT' | 'IN_ADVANCE'
  // Owner override: proceed despite an overlap warning.
  allowConflict?: boolean
}): Promise<Appointment> {
  const res = await api.post('/appointments', data)
  return res.data
}

// Owner edit/reschedule. Every field optional; staffId null clears it. Past /
// out-of-hours allowed; on overlap the server returns 409 APPOINTMENT_CONFLICT
// unless allowConflict is set.
export async function updateAppointment(
  id: string,
  data: {
    startTime?: string
    serviceId?: string
    staffId?: string | null
    price?: number
    notes?: string | null
    paymentType?: 'AT_APPOINTMENT' | 'IN_ADVANCE'
    status?: string
    allowConflict?: boolean
  },
): Promise<Appointment> {
  const res = await api.patch(`/appointments/${id}`, data)
  return res.data
}

export async function getAvailableSlots(params: {
  serviceId: string
  staffId?: string
  date: string
}): Promise<{ slots: string[] }> {
  const res = await api.get('/availability', { params })
  return res.data
}

export async function getServicesForForm(): Promise<Service[]> {
  const res = await api.get('/services')
  const data = res.data
  return Array.isArray(data) ? data :
         Array.isArray(data?.services) ? data.services : []
}

export async function getStaffForForm(): Promise<StaffMember[]> {
  const res = await api.get('/staff')
  const data = res.data
  return Array.isArray(data) ? data :
         Array.isArray(data?.staff) ? data.staff : []
}
