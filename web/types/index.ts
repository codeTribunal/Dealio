export interface Business {
  id: string
  name: string
  description: string | null
  mode: string[]
  language: string
  cardNumber: string | null
  cardBank: string | null
  botUsername: string | null
  calendarToken?: string | null
}

export interface Customer {
  id: string
  name: string
  telegramUsername: string | null
  phone: string | null
  notes: string | null
  createdAt: string
  lastInteractionAt: string
  totalOrders: number | undefined
  totalSpent: number | undefined
}

export interface CustomerDetail extends Customer {
  telegramUserId: string | null
  birthday: string | null
  currentStageId: string | null
  orders: OrderSummary[]
  appointments: AppointmentSummary[]
  projects: ProjectSummary[]
  customFieldValues: CustomFieldValue[]
  tags: CustomerTag[]
  reminders: Reminder[]
}

export interface OrderSummary {
  id: string
  orderNumber: number
  total: number
  orderStatus: string
  paymentStatus: string
  createdAt: string
  items: { quantity: number; price: number; product: { name: string } }[]
}

export interface AppointmentSummary {
  id: string
  startTime: string
  endTime: string
  status: string
  price: number
  service: { name: string }
}

export interface ProjectSummary {
  id: string
  name: string
  totalPrice: number
  status: string
  deadline: string | null
  createdAt: string
}

export interface CustomFieldValue {
  id: string
  value: string
  field: { id: string; name: string; fieldType: string }
}

export interface CustomerTag {
  id: string
  label: string
  color: string
}

export interface Reminder {
  id: string
  note: string
  dueDate: string
  done: boolean
  createdAt: string
}

export interface Appointment {
  id: string
  startTime: string
  endTime: string
  status: string
  paymentStatus: string
  paymentType: string
  price: number
  notes: string | null
  createdAt: string
  customer: {
    id: string
    name: string
    telegramUsername: string | null
    phone: string | null
  }
  service: { name: string }
  staff: { name: string } | null
}

export interface AppointmentsResponse {
  appointments: Appointment[]
  total: number
}

export interface AuthResponse {
  token: string
  user: { id: string; phone: string }
  business: Business | null
}

export interface CustomersResponse {
  customers: Customer[]
  total: number
}

export interface OrderItem {
  id: string
  quantity: number
  price: number
  variant: Record<string, string> | null
  product: {
    id: string
    name: string
  }
}

export interface TimelineEntry {
  at: string
  by: string
  status: string
}

export interface Order {
  id: string
  orderNumber: number
  total: number
  orderStatus: string
  paymentStatus: string
  deliveryMethod: string
  deliveryAddress: string | null
  deliveryDate: string | null
  notes: string | null
  internalNotes: string | null
  createdAt: string
  updatedAt: string
  customer: {
    id: string
    name: string
    telegramUsername: string | null
    phone: string | null
  }
  items: OrderItem[]
  timeline: TimelineEntry[]
}

export interface OrdersResponse {
  orders: Order[]
  total: number
}

export interface ProjectMilestone {
  id: string
  name: string
  amount: number
  dueDate: string | null
  status: string
}

export interface ProjectInvoice {
  id: string
  invoiceNumber: string
  total: number
  dueDate: string | null
  status: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  totalPrice: number
  status: string
  deadline: string | null
  paymentTerms: string | null
  createdAt: string
  customer: {
    id: string
    name: string
    telegramUsername: string | null
    phone: string | null
  }
  milestones: ProjectMilestone[]
  invoices: ProjectInvoice[]
}

export interface ProjectsResponse {
  projects: Project[]
  total: number
}

export interface StaffMember {
  id: string
  name: string
  telegramHandle: string | null
  createdAt: string
  staffServices: {
    service: {
      id: string
      name: string
      durationMinutes: number
      price: number
    }
  }[]
}

export interface StaffResponse {
  staff: StaffMember[]
}

export interface Service {
  id: string
  name: string
  durationMinutes: number
  price: number
  active: boolean
}

export interface ServicesResponse {
  services: Service[]
}

export interface AnalyticsData {
  revenueThisMonth: number
  revenueLastMonth: number
  ordersThisMonth: number
  averageOrderValue: number
  pendingPaymentsTotal: number
  topCustomers: {
    id: string
    name: string
    telegramUsername: string | null
    totalSpent: number
    orderCount: number
  }[]
  bestSellingProduct: {
    name: string
    unitsSold: number
  } | null
  completedThisMonth: number
}
