import axios from 'axios';
import { ApiProduct, ApiBusiness, ApiCustomer, ApiOrderResult, ApiOrder, ApiService, ApiSlot, ApiAppointmentResult, ApiAppointment, ApiProject } from './types.js';

const client = axios.create({
  baseURL: process.env.BACKEND_URL ?? 'http://localhost:3000',
  headers: {
    'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '',
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

export async function getCatalog(botToken: string): Promise<{ business: ApiBusiness; products: ApiProduct[] }> {
  const res = await client.get(`/api/v1/bot/catalog/${botToken}`);
  return res.data;
}

export async function upsertCustomer(data: {
  botToken: string;
  telegramUserId: string;
  telegramUsername?: string;
  name: string;
  phone?: string;
}): Promise<ApiCustomer> {
  const res = await client.post('/api/v1/bot/customers', data);
  return res.data;
}

export async function createOrder(data: {
  botToken: string;
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

export async function getCheckoutQuestions(botToken: string): Promise<Array<{
  id: string;
  question: string;
  required: boolean;
  order: number;
}>> {
  const res = await client.get(`/api/v1/bot/checkout-questions/${botToken}`);
  return res.data;
}

export async function notifyPaymentReceived(botToken: string, orderId: string): Promise<{
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
  const res = await client.post('/api/v1/bot/payment-received', { botToken, orderId });
  return res.data;
}

export async function confirmPayment(botToken: string, orderId: string): Promise<{
  order: { id: string; orderNumber: number; paymentStatus: string };
  customerTelegramUserId: string | null;
  customerName: string;
}> {
  const res = await client.post('/api/v1/bot/confirm-payment', { botToken, orderId });
  return res.data;
}

export async function getCustomerOrders(botToken: string, telegramUserId: string): Promise<ApiOrder[]> {
  const res = await client.get(`/api/v1/bot/customer-orders/${botToken}/${telegramUserId}`);
  return res.data;
}

export async function getServices(botToken: string): Promise<{ business: ApiBusiness & { cardNumber?: string; cardBank?: string }; services: ApiService[] }> {
  const res = await client.get(`/api/v1/bot/services/${botToken}`);
  return res.data;
}

export async function getAvailability(botToken: string, serviceId: string, date: string, staffId?: string): Promise<ApiSlot[]> {
  const params: Record<string, string> = { serviceId, date };
  if (staffId) params.staffId = staffId;
  const res = await client.get(`/api/v1/bot/availability/${botToken}`, { params });
  return res.data;
}

export async function createAppointment(data: {
  botToken: string;
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

export async function cancelAppointment(botToken: string, appointmentId: string): Promise<void> {
  await client.post('/api/v1/bot/cancel-appointment', { botToken, appointmentId });
}

export async function getCustomerAppointments(botToken: string, telegramUserId: string): Promise<ApiAppointment[]> {
  const res = await client.get(`/api/v1/bot/customer-appointments/${botToken}/${telegramUserId}`);
  return res.data;
}

export async function getCustomerProjects(
  botToken: string,
  telegramUserId: string,
): Promise<{ business: ApiBusiness; projects: ApiProject[] }> {
  const res = await client.get(`/api/v1/bot/projects/${botToken}/${telegramUserId}`);
  return res.data;
}

export async function saveCustomerMessage(data: {
  botToken: string;
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
  botToken: string,
  milestoneId: string,
  approved: boolean,
): Promise<{
  milestone: { id: string; name: string; status: string };
  ownerTelegramChatId: string | null;
  projectName: string;
  approved: boolean;
}> {
  const res = await client.post('/api/v1/bot/milestone-review', { botToken, milestoneId, approved });
  return res.data;
}
