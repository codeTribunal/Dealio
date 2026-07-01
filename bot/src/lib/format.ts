import { CartItem } from './types.js';
import { t, formatMoney, type Lang } from './i18n.js';

// Escape text for Telegram HTML parse_mode (only & < > matter). Used for any
// user- or owner-provided value interpolated into an HTML-parsed message;
// without it a value containing '<' or '&' makes Telegram reject the send.
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatUZS(amount: number): string {
  return amount.toLocaleString('uz-UZ').replace(/,/g, ' ') + ' UZS';
}

const TZ = 'Asia/Tashkent';

// "15 января" / "15 yanvar"
export function formatDateTZ(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', { timeZone: TZ, day: 'numeric', month: 'long' });
}

// "пт, 15 января"
export function formatDateWeekdayTZ(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'long' });
}

// "14:30"
export function formatTimeTZ(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ru-RU', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

// YYYY-MM-DD in Tashkent local time — for API date params
export function toTashkentDateStr(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: TZ });
}

export function buildCartSummary(cart: CartItem[], lang: Lang): string {
  if (cart.length === 0) return t(lang, 'cartEmpty');
  const lines = cart.map(
    (item) => `• ${item.name} × ${item.quantity} — ${formatMoney(lang, item.price * item.quantity)}`,
  );
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return lines.join('\n') + `\n\n` + t(lang, 'cartTotal', { total: formatMoney(lang, total) });
}

export function buildOrderSummary(
  cart: CartItem[],
  name: string,
  phone: string,
  deliveryMethod: 'PICKUP' | 'DELIVERY',
  lang: Lang,
  deliveryAddress?: string,
): string {
  const items = cart
    .map((i) => `• ${escapeHtml(i.name)} × ${i.quantity} — ${formatMoney(lang, i.price * i.quantity)}`)
    .join('\n');
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryLabel =
    deliveryMethod === 'PICKUP' ? t(lang, 'pickup') : t(lang, 'delivery');

  return (
    `${t(lang, 'orderSummaryTitle')}\n\n` +
    `${items}\n\n` +
    `<b>${t(lang, 'labelTotal')}:</b> ${formatMoney(lang, total)}\n` +
    `<b>${t(lang, 'labelName')}:</b> ${escapeHtml(name)}\n` +
    `<b>${t(lang, 'labelPhone')}:</b> ${escapeHtml(phone)}\n` +
    `<b>${t(lang, 'labelDelivery')}:</b> ${deliveryLabel}\n` +
    (deliveryAddress ? `<b>${t(lang, 'labelAddress')}:</b> ${escapeHtml(deliveryAddress)}\n` : '')
  );
}
