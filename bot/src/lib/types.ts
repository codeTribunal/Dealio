import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  photoUrl?: string;
  variant?: Record<string, unknown>;
}

export interface BookingState {
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  staffId?: string;
  staffName?: string;
  date?: string;       // YYYY-MM-DD
  startTime?: string;  // ISO datetime
  endTime?: string;    // ISO datetime
  timeLabel?: string;  // "HH:MM"
}

export interface SessionData {
  cart: CartItem[];
  customerId?: string;
  booking?: BookingState;
  /** Cached customer language preference for this chat (UZBEK | RUSSIAN | ENGLISH). */
  lang?: 'UZBEK' | 'RUSSIAN' | 'ENGLISH';
}

export interface ApiService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  staffServices: Array<{
    staff: { id: string; name: string };
  }>;
}

export interface ApiSlot {
  startTime: string;
  endTime: string;
  startLabel: string;
  endLabel: string;
}

export interface ApiAppointment {
  id: string;
  startTime: string;
  endTime: string;
  price: number;
  status: string;
  paymentStatus: string;
  service: { name: string };
  staff: { name: string } | null;
}

export interface ApiAppointmentResult {
  appointment: {
    id: string;
    startTime: string;
    endTime: string;
    price: number;
    status: string;
    service: { id: string; name: string };
    staff: { id: string; name: string } | null;
    customer: { id: string; name: string; telegramUserId?: string };
  };
  ownerTelegramChatId: string | null;
}

export type MyContext = Context &
  ConversationFlavor &
  SessionFlavor<SessionData> & {
    businessId: string;
    botUsername: string;
  };

export interface ApiProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  photos: string[];
  variants?: Record<string, unknown>;
  prepTime?: string;
  stockQty?: number;
  unlimited: boolean;
}

export interface ApiBusiness {
  name: string;
  language: 'UZBEK' | 'RUSSIAN' | 'ENGLISH';
  // Single business mode (scalar). 'SERVICES' | 'FREELANCE' ('PRODUCTS' dormant).
  mode: string;
}

export interface ApiCustomer {
  id: string;
  name: string;
  languagePreference?: 'UZBEK' | 'RUSSIAN' | 'ENGLISH' | null;
}

export interface ApiOrder {
  id: string;
  orderNumber: number;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
}

export interface ApiMilestone {
  id: string;
  name: string;
  dueDate: string | null;
  amount: number;
  status: 'PENDING' | 'SUBMITTED_FOR_REVIEW' | 'APPROVED' | 'PAYMENT_RECEIVED';
}

export interface ApiInvoice {
  id: string;
  invoiceNumber: string;
  total: number;
  dueDate: string | null;
  status: 'UNPAID' | 'PAID';
}

export interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  totalPrice: number;
  startDate: string | null;
  deadline: string | null;
  status: 'PROPOSAL_SENT' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'CANCELLED';
  milestones: ApiMilestone[];
  invoices: ApiInvoice[];
}

export interface ApiOrderResult {
  order: ApiOrder & {
    customer: { id: string; name: string; telegramUserId?: string };
    items: Array<{ product: { name: string }; quantity: number; price: number }>;
  };
}
