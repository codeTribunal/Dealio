import axios from 'axios'
import { getToken, clearToken } from './auth'
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
  Project,
  ProjectsResponse,
  ProjectMilestone,
  ProjectInvoice,
  Appointment,
  StaffMember,
  Service,
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
    if (error.response?.status === 401) {
      clearToken()
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
  mode: string[]
  language: string
  botToken: string
  cardNumber?: string
  cardBank?: string
}): Promise<{ id: string; name: string; botUsername: string; botLink: string }> {
  const res = await api.post('/onboarding/complete', data)
  return res.data.business
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function requestOtp(phone: string): Promise<void> {
  await api.post('/auth/request-otp', { phone })
}

export async function verifyOtp(
  phone: string,
  code: string,
  consent?: { generalConsent: boolean; crossBorderConsent: boolean }
): Promise<AuthResponse> {
  const res = await api.post('/auth/verify-otp', { phone, code, ...consent })
  return res.data
}

export async function getBusiness(): Promise<Business> {
  const res = await api.get('/business')
  return res.data
}

export async function getCustomers(params: {
  search?: string
  page?: number
  limit?: number
}): Promise<CustomersResponse> {
  const res = await api.get('/customers', {
    params: {
      search: params.search || undefined,
      page: params.page || 1,
      limit: params.limit || 30,
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

export async function getOrders(params: {
  status?: string
  paymentStatus?: string
  search?: string
  page?: number
  limit?: number
}): Promise<OrdersResponse> {
  const res = await api.get('/orders', {
    params: {
      status: params.status || undefined,
      paymentStatus: params.paymentStatus || undefined,
      search: params.search || undefined,
      page: params.page || 1,
      limit: params.limit || 30,
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

export async function updateOrderStatus(
  id: string,
  orderStatus: string
): Promise<void> {
  await api.patch(`/orders/${id}/status`, { orderStatus })
}

export async function confirmOrderPayment(id: string): Promise<void> {
  await api.patch(`/orders/${id}/payment`, { paymentStatus: 'CONFIRMED' })
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
}): Promise<AppointmentsResponse> {
  const res = await api.get('/appointments', {
    params: {
      date: params.date || undefined,
      status: params.status || undefined,
      page: params.page || 1,
      limit: params.limit || 50
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

export async function getAnalytics(): Promise<AnalyticsData> {
  const res = await api.get('/analytics')
  const d = res.data
  return {
    revenueThisMonth: d.revenueThisMonth ?? d.revenue?.thisMonth ?? 0,
    revenueLastMonth: d.revenueLastMonth ?? d.revenue?.lastMonth ?? 0,
    ordersThisMonth: d.ordersThisMonth ?? d.orders?.thisMonth ?? d.orderCount ?? 0,
    completedThisMonth: d.completedThisMonth ?? d.completed ?? 0,
    averageOrderValue: d.averageOrderValue ?? d.avgOrderValue ?? 0,
    pendingPaymentsTotal: d.pendingPaymentsTotal ?? d.pendingTotal ?? 0,
    topCustomers: d.topCustomers ?? d.customers ?? [],
    bestSellingProduct: d.bestSellingProduct ?? d.topProduct ?? null,
  }
}

export async function updateBusiness(data: {
  name?: string
  description?: string
  language?: string
  mode?: string[]
}): Promise<Business> {
  const res = await api.patch('/business', data)
  return res.data
}

export async function updatePaymentMethod(data: {
  cardNumber: string
  cardBank: string
}): Promise<Business> {
  const res = await api.patch('/business/payment', data)
  return res.data
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
  await api.patch(`/projects/${projectId}/invoices/${invoiceId}`, { status: 'PAID' })
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
  deadline?: string
  customerId: string
  paymentTerms?: string
}): Promise<Project> {
  const res = await api.post('/projects', {
    ...data,
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
  }
): Promise<StaffMember> {
  const res = await api.patch(`/staff/${id}`, data)
  return res.data
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
}): Promise<Appointment> {
  const res = await api.post('/appointments', data)
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
