import { randomBytes } from 'crypto';

export function generateCalendarToken(): string {
  // URL-safe random token, 32 chars
  return randomBytes(24).toString('base64url');
}
