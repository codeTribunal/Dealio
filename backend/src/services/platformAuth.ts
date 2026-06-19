import { prisma } from '../lib/prisma.js';
import { generateLinkToken, LINK_TOKEN_TTL_MS } from '../lib/authCodes.js';
import { normalizePhone } from '../lib/phone.js';
import { issueAuthCode } from './otp.js';

/**
 * Enrollment (first-time owner auth) link-token lifecycle.
 *
 * Flow:
 *   1. App calls /auth/enroll/start  → createLinkToken()
 *   2. User opens t.me/<bot>?start=<token> → bot calls bindChatToLinkToken()
 *   3. User shares contact → bot calls bindPhoneAndIssueEnrollCode()
 *   4. App calls /auth/enroll/verify with the code → consumeLinkToken() + user/JWT
 */

export type LinkTokenFailure = 'invalid' | 'expired' | 'consumed';

/** Create a single-use enrollment link token (10-min expiry). */
export async function createLinkToken(): Promise<{ token: string; expiresAt: Date }> {
  const token = generateLinkToken();
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);
  await prisma.linkToken.create({ data: { token, expiresAt } });
  return { token, expiresAt };
}

/**
 * Bind the user's Telegram chatId to the link token when they open the bot
 * via the deep link. Validates the token is live (exists, unconsumed, unexpired).
 */
export async function bindChatToLinkToken(
  token: string,
  chatId: string,
): Promise<{ ok: boolean; reason?: LinkTokenFailure }> {
  const link = await prisma.linkToken.findUnique({ where: { token } });
  if (!link) return { ok: false, reason: 'invalid' };
  if (link.consumedAt) return { ok: false, reason: 'consumed' };
  if (link.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };

  await prisma.linkToken.update({ where: { token }, data: { chatId } });
  return { ok: true };
}

/**
 * Record the shared phone on the link token and issue an ENROLL code (hashed)
 * for that phone. Returns the PLAINTEXT code for the bot to display in-chat.
 * The contact.user_id === from.id check is performed by the bot before calling.
 */
export async function bindPhoneAndIssueEnrollCode(
  token: string,
  chatId: string,
  phone: string,
): Promise<{ ok: boolean; reason?: LinkTokenFailure | 'chat_mismatch'; code?: string }> {
  const link = await prisma.linkToken.findUnique({ where: { token } });
  if (!link) return { ok: false, reason: 'invalid' };
  if (link.consumedAt) return { ok: false, reason: 'consumed' };
  if (link.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
  // The chat that shares the contact must be the same chat that opened the link.
  if (link.chatId && link.chatId !== chatId) return { ok: false, reason: 'chat_mismatch' };

  // Canonicalize before storing + keying the OTP, so the user that gets created
  // at /auth/enroll/verify (User.phone = link.phone) is stored in the same
  // E.164 form that login lookups will normalize to.
  const normalized = normalizePhone(phone);

  await prisma.linkToken.update({
    where: { token },
    data: { phone: normalized, chatId },
  });

  const code = await issueAuthCode({ phone: normalized, purpose: 'ENROLL', chatId });
  return { ok: true, code };
}
