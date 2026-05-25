import { prisma } from '../lib/prisma.js';

const DEV_OTP = '1234';
const OTP_TTL_MINUTES = 10;

export async function createOtp(phone: string): Promise<string> {
  // In production, generate a random 6-digit code and send via SMS.
  // In development, always use 1234.
  const code = process.env.NODE_ENV === 'production'
    ? String(Math.floor(100000 + Math.random() * 900000))
    : DEV_OTP;

  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, code, expiresAt } });

  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({
    where: {
      phone,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return false;

  await prisma.otpCode.update({ where: { id: record.id }, data: { used: true } });
  return true;
}
