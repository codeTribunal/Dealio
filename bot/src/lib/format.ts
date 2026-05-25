import { CartItem } from './types.js';

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

export function buildCartSummary(cart: CartItem[]): string {
  if (cart.length === 0) return 'Your cart is empty.';
  const lines = cart.map(
    (item) => `• ${item.name} × ${item.quantity} — ${formatUZS(item.price * item.quantity)}`,
  );
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return lines.join('\n') + `\n\n<b>Total: ${formatUZS(total)}</b>`;
}

export function buildOrderSummary(
  cart: CartItem[],
  name: string,
  phone: string,
  deliveryMethod: 'PICKUP' | 'DELIVERY',
  deliveryAddress?: string,
): string {
  const items = cart
    .map((i) => `• ${i.name} × ${i.quantity} — ${formatUZS(i.price * i.quantity)}`)
    .join('\n');
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    `<b>Order Summary</b>\n\n` +
    `${items}\n\n` +
    `<b>Total:</b> ${formatUZS(total)}\n` +
    `<b>Name:</b> ${name}\n` +
    `<b>Phone:</b> ${phone}\n` +
    `<b>Delivery:</b> ${deliveryMethod === 'PICKUP' ? '🏪 Pickup' : '🚚 Delivery'}\n` +
    (deliveryAddress ? `<b>Address:</b> ${deliveryAddress}\n` : '')
  );
}
