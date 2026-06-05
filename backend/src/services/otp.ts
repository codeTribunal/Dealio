import { prisma } from '../lib/prisma.js';
import {
  generateCode,
  hashCode,
  verifyCode,
  CODE_TTL_MS,
  MAX_VERIFY_ATTEMPTS,
} from '../lib/authCodes.js';

export type OtpPurpose = 'ENROLL' | 'LOGIN';

export interface IssueCodeParams {
  phone: string;
  purpose: OtpPurpose;
  userId?: string | null;
  chatId?: string | null;
}

/**
 * Issue a fresh one-time code for (phone, purpose). Any previous unconsumed
 * codes for the same phone+purpose are invalidated first, so only the newest
 * code is ever valid. Returns the PLAINTEXT code (for delivery via Telegram);
 * only the hash is persisted.
 */
export async function issueAuthCode(params: IssueCodeParams): Promise<string> {
  const { phone, purpose, userId, chatId } = params;

  // Invalidate older live codes for this phone+purpose.
  await prisma.otpCode.updateMany({
    where: { phone, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = generateCode();
  await prisma.otpCode.create({
    data: {
      phone,
      purpose,
      userId: userId ?? null,
      chatId: chatId ?? null,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  return code;
}

export type VerifyFailure = 'no_code' | 'expired' | 'locked' | 'invalid';

export interface VerifyResult {
  ok: boolean;
  reason?: VerifyFailure;
  /** The matched code row id (only on success), so callers can read chatId etc. */
  codeId?: string;
}

/**
 * Verify a code for (phone, purpose) and, on success, consume it (single-use).
 * Enforces expiry and a max attempt count: after MAX_VERIFY_ATTEMPTS failed
 * tries the code is locked and no longer accepts any code (even the correct one).
 */
export async function verifyAuthCode(
  phone: string,
  code: string,
  purpose: OtpPurpose,
): Promise<VerifyResult> {
  const record = await prisma.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return { ok: false, reason: 'no_code' };

  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  // Already exhausted its attempts → locked (this is the 6th+ try).
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, reason: 'locked' };
  }

  if (!verifyCode(code, record.codeHash)) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: 'invalid' };
  }

  // Success — consume so it cannot be reused.
  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true, codeId: record.id };
}
