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

/** Manual checkout state-machine step (replaces the @grammyjs/conversations
 *  checkout flow). 'idle' = not in checkout. */
export type CheckoutStep =
  | 'idle'
  | 'awaiting_name'
  | 'awaiting_phone'
  | 'awaiting_delivery'
  | 'awaiting_address'
  | 'awaiting_confirm'
  | 'awaiting_payment'
  | 'awaiting_payment_proof';

export interface CheckoutState {
  step: CheckoutStep;
  name?: string;
  phone?: string;
  deliveryMethod?: 'PICKUP' | 'DELIVERY';
  address?: string;
  /** Idempotency key — generated ONCE at checkout start, reused through order
   *  creation (incl. retries), so a lost response never duplicates the order. */
  idemKey?: string;
  /** Order id, set after creation — used by the awaiting_payment step. */
  orderId?: string;
  /** Transient id of the LAST data-collection prompt the bot sent (name / phone /
   *  delivery / address) so the next step can delete it and keep the chat tidy.
   *  At most ONE at a time — no history, no cross-step editing. Cleared on finish. */
  lastPromptMsgId?: number;
}

export interface SessionData {
  cart: CartItem[];
  customerId?: string;
  /** Vestigial: previously the order idempotency key (now in checkout.idemKey).
   *  Still written by the catalog cart handlers; kept to avoid touching them. */
  orderIdemKey?: string;
  /** Manual checkout state-machine (replaces the conversations-based checkout). */
  checkout?: CheckoutState;
  booking?: BookingState;
  /** What to resume after the first-contact consent gate is accepted (set when
   *  the gate is shown from a checkout/booking entry; undefined = from /start). */
  consentReturnTo?: 'checkout' | 'booking';
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
  // Business physical location — appended to the client's booking confirmation.
  businessAddress: string | null;
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
  // Global, superadmin-controlled flag (default ON). When false, the bot must
  // NOT show card/transfer instructions at checkout. The "I have paid" path is
  // kept regardless. Optional for forward-compat with older catalog responses.
  cardPaymentsEnabled?: boolean;
  // P2P card shown at checkout. Payment step is shown only when
  // cardPaymentsEnabled AND cardNumber is present.
  cardNumber?: string | null;
  cardHolderName?: string | null;
  // Physical location — pickup address appended to PICKUP order confirmations.
  address?: string | null;
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
