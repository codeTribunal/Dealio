import axios from 'axios';

/**
 * Backend internal API for the PLATFORM bot (owner enrollment).
 * Secured by the shared BOT_MANAGER_SECRET header, same as the customer-bot API.
 */
const client = axios.create({
  baseURL: process.env.BACKEND_URL ?? 'http://localhost:3000',
  headers: {
    'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '',
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

export type PlatformStartReason = 'invalid' | 'expired' | 'consumed';

/** Bind the chatId to a link token when the user opens the deep link. */
export async function platformStart(
  token: string,
  chatId: string,
): Promise<{ ok: boolean; reason?: PlatformStartReason }> {
  const res = await client.post('/api/v1/internal/platform/start', { token, chatId });
  return res.data;
}

export type PlatformContactReason =
  | 'invalid'
  | 'expired'
  | 'consumed'
  | 'chat_mismatch'
  | 'foreign_contact';

/**
 * Submit the shared contact: backend re-checks contactUserId === fromId, binds
 * the phone, and issues an ENROLL code. On success returns the plaintext code
 * for in-chat display.
 */
export async function platformContact(data: {
  token: string;
  chatId: string;
  phone: string;
  contactUserId: string;
  fromId: string;
}): Promise<{ ok: boolean; reason?: PlatformContactReason; code?: string }> {
  const res = await client.post('/api/v1/internal/platform/contact', data);
  return res.data;
}
