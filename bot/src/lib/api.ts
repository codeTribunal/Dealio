import axios from 'axios';
import { ApiProduct, ApiBusiness, ApiCustomer, ApiOrderResult, ApiOrder, ApiService, ApiSlot, ApiAppointmentResult, ApiAppointment, ApiProject } from './types.js';

/** Message shown to customers when a business is suspended. */
export const SUSPENSION_MESSAGE =
  'This service is temporarily unavailable. Please contact the business directly.';

/**
 * Thrown when the backend reports a business is suspended (403 ACCOUNT_SUSPENDED).
 * Handlers / the global bot.catch should surface SUSPENSION_MESSAGE to the user.
 */
export class SuspendedError extends Error {
  reason?: string;
  constructor(reason?: string) {
    super('ACCOUNT_SUSPENDED');
    this.name = 'SuspendedError';
    this.reason = reason;
  }
}

/**
 * Thrown when the backend rejects an appointment create with 409 SLOT_UNAVAILABLE
 * (the requested time was taken/blocked between availability display and confirm).
 * The booking scene catches this to send the customer back to slot selection.
 */
export class SlotUnavailableError extends Error {
  constructor() {
    super('SLOT_UNAVAILABLE');
    this.name = 'SlotUnavailableError';
  }
}

const client = axios.create({
  baseURL: process.env.BACKEND_URL ?? 'http://localhost:3000',
  headers: {
    'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '',
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

// Translate a suspended-business 403 into a typed error the handlers can catch.
client.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 403 &&
      (error.response.data as { error?: string } | undefined)?.error === 'ACCOUNT_SUSPENDED'
    ) {
      const reason = (error.response.data as { reason?: string }).reason;
      return Promise.reject(new SuspendedError(reason));
    }
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 409 &&
      (error.response.data as { error?: string } | undefined)?.error === 'SLOT_UNAVAILABLE'
    ) {
      return Promise.reject(new SlotUnavailableError());
    }
    return Promise.reject(error);
  },
);

export async function getCatalog(botUsername: string): Promise<{ business: ApiBusiness; products: ApiProduct[] }> {
  const res = await client.get(`/api/v1/bot/catalog/${botUsername}`);
  return res.data;
}

export async function upsertCustomer(data: {
  botUsername: string;
  telegramUserId: string;
  telegramUsername?: string;
  name: string;
  phone?: string;
  languagePreference?: 'UZBEK' | 'RUSSIAN' | 'ENGLISH';
}): Promise<ApiCustomer> {
  const res = await client.post('/api/v1/bot/customers', data);
  return res.data;
}

/** Read-only lookup used to decide whether to show the language picker. */
export async function getCustomerLanguage(
  botUsername: string,
  telegramUserId: string,
): Promise<{
  exists: boolean;
  languagePreference: 'UZBEK' | 'RUSSIAN' | 'ENGLISH' | null;
  businessLanguage: 'UZBEK' | 'RUSSIAN' | 'ENGLISH';
}> {
  const res = await client.get(`/api/v1/bot/customer/${botUsername}/${telegramUserId}`);
  return res.data;
}

/** Persist the customer's chosen language without altering their name. */
export async function setCustomerLanguage(data: {
  botUsername: string;
  telegramUserId: string;
  telegramUsername?: string;
  name?: string;
  language: 'UZBEK' | 'RUSSIAN' | 'ENGLISH';
}): Promise<{ id: string; languagePreference: string }> {
  const res = await client.post('/api/v1/bot/set-language', data);
  return res.data;
}

export async function createOrder(data: {
  botUsername: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number; variant?: Record<string, unknown> }>;
  deliveryMethod: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: string;
  notes?: string;
  customAnswers?: Record<string, string>;
}): Promise<ApiOrderResult> {
  const res = await client.post('/api/v1/bot/orders', data);
  return res.data;
}

export async function getCheckoutQuestions(botUsername: string): Promise<Array<{
  id: string;
  question: string;
  required: boolean;
  order: number;
}>> {
  const res = await client.get(`/api/v1/bot/checkout-questions/${botUsername}`);
  return res.data;
}

export async function notifyPaymentReceived(botUsername: string, orderId: string): Promise<{
  order: { id: string; orderNumber: number; paymentStatus: string };
  notification: {
    ownerTelegramChatId: string | null;
    message: string;
    orderId: string;
    orderNumber: number;
    total: number;
    customerName: string;
  };
}> {
  const res = await client.post('/api/v1/bot/payment-received', { botUsername, orderId });
  return res.data;
}

export async function confirmPayment(botUsername: string, orderId: string): Promise<{
  order: { id: string; orderNumber: number; paymentStatus: string };
  customerTelegramUserId: string | null;
  customerName: string;
  customerLanguagePreference: 'UZBEK' | 'RUSSIAN' | 'ENGLISH' | null;
  businessLanguage: 'UZBEK' | 'RUSSIAN' | 'ENGLISH';
}> {
  const res = await client.post('/api/v1/bot/confirm-payment', { botUsername, orderId });
  return res.data;
}

export async function getCustomerOrders(botUsername: string, telegramUserId: string): Promise<ApiOrder[]> {
  const res = await client.get(`/api/v1/bot/customer-orders/${botUsername}/${telegramUserId}`);
  return res.data;
}

export async function getServices(botUsername: string): Promise<{ business: ApiBusiness & { cardNumber?: string; cardBank?: string }; services: ApiService[] }> {
  const res = await client.get(`/api/v1/bot/services/${botUsername}`);
  return res.data;
}

export async function getAvailability(botUsername: string, serviceId: string, date: string, staffId?: string): Promise<ApiSlot[]> {
  const params: Record<string, string> = { serviceId, date };
  if (staffId) params.staffId = staffId;
  const res = await client.get(`/api/v1/bot/availability/${botUsername}`, { params });
  return res.data;
}

export async function createAppointment(data: {
  botUsername: string;
  customerId: string;
  serviceId: string;
  staffId?: string;
  startTime: string;
  notes?: string;
  paymentType?: 'AT_APPOINTMENT' | 'IN_ADVANCE';
}): Promise<ApiAppointmentResult> {
  console.log('[api] POST /api/v1/bot/appointments', {
    customerId: data.customerId,
    serviceId: data.serviceId,
    staffId: data.staffId,
    startTime: data.startTime,
    paymentType: data.paymentType,
  });
  const res = await client.post('/api/v1/bot/appointments', data);
  console.log('[api] appointment created, id:', res.data?.appointment?.id);
  return res.data;
}

export async function cancelAppointment(botUsername: string, appointmentId: string): Promise<void> {
  await client.post('/api/v1/bot/cancel-appointment', { botUsername, appointmentId });
}

export async function getCustomerAppointments(botUsername: string, telegramUserId: string): Promise<ApiAppointment[]> {
  const res = await client.get(`/api/v1/bot/customer-appointments/${botUsername}/${telegramUserId}`);
  return res.data;
}

export async function getCustomerProjects(
  botUsername: string,
  telegramUserId: string,
): Promise<{ business: ApiBusiness; projects: ApiProject[] }> {
  const res = await client.get(`/api/v1/bot/projects/${botUsername}/${telegramUserId}`);
  return res.data;
}

export async function saveCustomerMessage(data: {
  botUsername: string;
  telegramUserId: string;
  text: string;
  telegramMessageId?: string;
}): Promise<{
  ok: boolean;
  ownerNotification: { chatId: string; customerName: string; text: string } | null;
}> {
  const res = await client.post('/api/v1/bot/message', data);
  return res.data;
}

export async function approveMilestone(
  botUsername: string,
  milestoneId: string,
  approved: boolean,
): Promise<{
  milestone: { id: string; name: string; status: string };
  ownerTelegramChatId: string | null;
  projectName: string;
  approved: boolean;
}> {
  const res = await client.post('/api/v1/bot/milestone-review', { botUsername, milestoneId, approved });
  return res.data;
}
