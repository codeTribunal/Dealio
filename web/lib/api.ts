import axios from 'axios'
import { getToken, clearToken } from './auth'
import type {
  AuthResponse,
  Business,
  CustomersResponse,
  CustomerDetail,
  Order,
  OrdersResponse,
  AppointmentsResponse,
  AnalyticsData,
  ProjectsResponse,
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

export async function requestOtp(phone: string): Promise<void> {
  await api.post('/auth/request-otp', { phone })
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<AuthResponse> {
  const res = await api.post('/auth/verify-otp', { phone, code })
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
