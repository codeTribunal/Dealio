// Working hours: keys "0".."6" (0=Sunday … 6=Saturday, Asia/Tashkent local),
// each value { start: "HH:MM", end: "HH:MM" } or null = closed that day.
export type WorkingDay = { start: string; end: string }
// A day is an array of open intervals (breaks are the gaps between them), a
// single interval (legacy format), or null = closed that day.
export type WorkingHours = Record<string, WorkingDay | WorkingDay[] | null>

// Single business mode (was string[] — migrated to a scalar in Step 2).
export type Mode = 'PRODUCTS' | 'SERVICES' | 'FREELANCE'

export interface Business {
  id: string
  name: string
  description: string | null
  // Physical location shown to customers: pickup point (PRODUCTS) and
  // appointment location (SERVICES). One field, both uses. Optional.
  address?: string | null
  mode: Mode
  language: string
  plan?: string | null
  botUsername: string | null
  calendarToken?: string | null
  workingHours?: WorkingHours | null
  bufferMinutes?: number
  // Payment — P2P card transfer (Uzcard/Humo). Edited in Settings via
  // PATCH /business/payment; shown to customers in the Telegram bot. Visibility
  // gated by cardPaymentsEnabled below.
  cardNumber?: string | null
  cardHolderName?: string | null
  // Global, superadmin-controlled flag (default ON) carried on GET /business.
  // When false, card-payment SETUP UI should be hidden. Visibility only.
  cardPaymentsEnabled?: boolean
  // Owner email + newsletter/marketing consent — flattened onto GET /business
  // (email → ownerEmail) like cardPaymentsEnabled. These live on the User
  // (owner) server-side; the web has no separate owner object.
  ownerEmail?: string | null
  newsletterConsent?: boolean
  newsletterConsentAt?: string | null
  emailPromptDismissedAt?: string | null
  emailPromptDismissCount?: number
  // Self-serve account deletion. PENDING_DELETION = scheduled for irreversible
  // purge at deletionScheduledAt (30-day recoverable window); the account is
  // suspended meanwhile. Reactivate via reactivateAccount() within the window.
  deletionState?: 'ACTIVE' | 'PENDING_DELETION'
  deletionRequestedAt?: string | null
  deletionScheduledAt?: string | null
}

export interface BlockedSlot {
  id: string
  staffId: string | null
  startTime: string
  endTime: string
  reason: string | null
  staff: { id: string; name: string } | null
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
  deleted?: boolean
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
  service: { id: string; name: string; durationMinutes?: number }
  staff: { id: string; name: string } | null
  deleted?: boolean
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
  // Whether a payment-proof screenshot exists. The image is streamed by the
  // authenticated proxy GET /orders/:id/payment-proof (never a raw URL).
  hasPaymentProof: boolean
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
  deleted?: boolean
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
  daysOff?: string[]
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

export interface HomeData {
  overdueReminders: {
    id: string
    note: string
    dueDate: string
    customer: { id: string; name: string; telegramUsername: string | null }
  }[]
  dormantCustomers: {
    id: string
    name: string
    telegramUsername: string | null
    daysSince: number
    orderCount: number
  }[]
  todayOrders: {
    id: string
    orderNumber: number
    total: number
    orderStatus: string
    paymentStatus: string
    createdAt: string
    customer: { id: string; name: string; telegramUsername: string | null }
    items: { quantity: number; price: number; product: { id: string; name: string } }[]
  }[]
  pendingPayments: {
    id: string
    orderNumber: number
    total: number
    customer: { id: string; name: string }
    updatedAt: string
  }[]
  // In-advance appointments awaiting payment confirmation — merged with
  // pendingPayments into the home payment queue. Optional so older backends
  // degrade gracefully.
  pendingAppointmentPayments?: {
    id: string
    serviceName: string
    price: number
    customer: { id: string; name: string }
    updatedAt: string
  }[]
  newCustomers: {
    id: string
    name: string
    telegramUsername: string | null
    createdAt: string
  }[]
  todayAppointments: {
    id: string
    customerName: string
    serviceName: string
    startTime: string
    status: string
  }[]
  recentCancellations: {
    id: string
    customerName: string
    serviceName: string
    startTime: string
    status: string
  }[]
  todayProjects: {
    id: string
    name: string
    customerName: string
    createdAt: string
  }[]
  recentMilestones: {
    id: string
    milestoneName: string
    projectName: string
    customerName: string
    projectId: string
    updatedAt: string
  }[]
}

export interface AnalyticsData {
  revenueThisMonth: number
  revenueLastMonth: number
  completedThisMonth: number
  appointmentsThisMonth: number
  pendingPaymentsTotal: number
  topCustomers: {
    id: string
    name: string
    telegramUsername?: string | null
    totalSpent: number
    appointmentCount: number
  }[]
  // Last 6 calendar months of realised revenue (oldest → current); the final
  // entry is the current month. Optional so older backends degrade gracefully.
  revenueTrend?: { month: string; revenue: number }[]
}
