import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendError } from '../lib/errors.js';
import { normalizePhone } from '../lib/phone.js';
import { CURRENT_POLICY_VERSION } from '../lib/policyVersion.js';
import { issueAuthCode, verifyAuthCode } from '../services/otp.js';
import { createLinkToken } from '../services/platformAuth.js';
import { sendTelegramMessage } from '../lib/telegram.js';
import { loginCodeMessage, copyCodeLabel, resolveAuthLang } from '../lib/authMessages.js';
import { MAX_CODE_REQUESTS, RATE_WINDOW_MS } from '../lib/authCodes.js';

// ── Shared helpers ───────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  phone: string;
}

/** Build the standard auth response: { token, user, business? }. */
async function buildAuthResponse(app: FastifyInstance, user: AuthUser) {
  const business = await prisma.business.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, mode: true },
  });
  const token = app.jwt.sign({ userId: user.id, phone: user.phone });
  return { token, user: { id: user.id, phone: user.phone }, business: business ?? null };
}

/** True if the user already consented to the current policy version. */
async function hasCurrentConsent(userId: string): Promise<boolean> {
  const existing = await prisma.consentRecord.findFirst({
    where: { userId, policyVersion: CURRENT_POLICY_VERSION },
    select: { id: true },
  });
  return existing !== null;
}

// ── Request schemas ──────────────────────────────────────────────────────────

const enrollVerifyBody = z.object({
  token: z.string().min(1),
  code: z.string().length(6).regex(/^\d{6}$/),
  generalConsent: z.boolean(),
  crossBorderConsent: z.boolean(),
});

const loginRequestBody = z.object({
  phone: z.string().min(9).max(20),
});

const loginVerifyBody = z.object({
  phone: z.string().min(9).max(20),
  code: z.string().length(6).regex(/^\d{6}$/),
  // Only needed if the user has no consent for the current policy version.
  generalConsent: z.boolean().optional(),
  crossBorderConsent: z.boolean().optional(),
});

export default async function authRoutes(app: FastifyInstance) {
  // ── Enrollment (first-time) ─────────────────────────────────────────────

  /**
   * POST /auth/enroll/start
   * Create a one-time enrollment link token and return the platform-bot deep link.
   */
  app.post(
    '/auth/enroll/start',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: RATE_WINDOW_MS,
          keyGenerator: (request) => request.ip,
        },
      },
    },
    async (_request, reply) => {
      const { token } = await createLinkToken();
      const botUsername = process.env.PLATFORM_BOT_USERNAME ?? '';
      const botDeepLink = `https://t.me/${botUsername}?start=${token}`;
      return reply.send({ token, botDeepLink });
    },
  );

  /**
   * GET /auth/enroll/status?token=...
   * Lets the app know once the user has shared their contact (phone is bound)
   * so it can enable code entry. Never leaks the code itself.
   */
  app.get('/auth/enroll/status', async (request, reply) => {
    const token = (request.query as { token?: string })?.token;
    if (!token) return sendError(reply, 400, 'token is required');

    const link = await prisma.linkToken.findUnique({
      where: { token },
      select: { phone: true, chatId: true, consumedAt: true, expiresAt: true },
    });
    if (!link) return sendError(reply, 404, 'Invalid token');

    const expired = link.expiresAt.getTime() < Date.now();
    return reply.send({
      chatStarted: link.chatId !== null,
      phoneBound: link.phone !== null,
      consumed: link.consumedAt !== null,
      expired,
    });
  });

  /**
   * POST /auth/enroll/verify
   * Final enrollment step: validate the link token + ENROLL code, require both
   * consents, create/bind the user, record consent, and issue a 30-day JWT.
   */
  app.post(
    '/auth/enroll/verify',
    {
      config: {
        rateLimit: { max: 20, timeWindow: RATE_WINDOW_MS },
      },
    },
    async (request, reply) => {
      const parsed = enrollVerifyBody.safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, 'Invalid request body');

      const { token, code, generalConsent, crossBorderConsent } = parsed.data;

      // Consent is mandatory at enrollment.
      if (generalConsent !== true || crossBorderConsent !== true) {
        return sendError(reply, 400, 'Consent is required to continue');
      }

      const link = await prisma.linkToken.findUnique({ where: { token } });
      if (!link) return sendError(reply, 400, 'Invalid or expired link');
      if (link.consumedAt) return sendError(reply, 400, 'This link has already been used');
      if (link.expiresAt.getTime() < Date.now()) {
        return sendError(reply, 400, 'This link has expired');
      }
      if (!link.phone || !link.chatId) {
        return sendError(reply, 400, 'Please share your contact in the bot first');
      }

      const result = await verifyAuthCode(link.phone, code, 'ENROLL');
      if (!result.ok) {
        const msg =
          result.reason === 'locked'
            ? 'Too many attempts. Please start over.'
            : result.reason === 'expired'
              ? 'Code expired. Please start over.'
              : 'Invalid code';
        return sendError(reply, 401, msg);
      }

      const phone = link.phone;
      const chatId = link.chatId;

      // Create or bind the user, set the Telegram binding, record consent, and
      // consume the link token — all atomically.
      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.upsert({
          where: { phone },
          create: { phone, telegramChatId: chatId, telegramVerifiedAt: new Date() },
          update: { telegramChatId: chatId, telegramVerifiedAt: new Date() },
        });

        const already = await tx.consentRecord.findFirst({
          where: { userId: u.id, policyVersion: CURRENT_POLICY_VERSION },
          select: { id: true },
        });
        if (!already) {
          await tx.consentRecord.create({
            data: {
              userId: u.id,
              generalConsent: true,
              crossBorderConsent: true,
              policyVersion: CURRENT_POLICY_VERSION,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'] || null,
            },
          });
        }

        await tx.linkToken.update({
          where: { token },
          data: { consumedAt: new Date() },
        });

        return u;
      });

      return reply.send(await buildAuthResponse(app, user));
    },
  );

  // ── Returning login ──────────────────────────────────────────────────────

  /**
   * POST /auth/login/request
   * Send a LOGIN code to the user's bound Telegram chat via the platform bot.
   * Always returns a generic 200 so callers cannot enumerate registered phones.
   */
  app.post(
    '/auth/login/request',
    {
      config: {
        rateLimit: {
          max: MAX_CODE_REQUESTS,
          timeWindow: RATE_WINDOW_MS,
          keyGenerator: (request) => {
            const body = request.body as { phone?: string };
            return body?.phone || request.ip;
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = loginRequestBody.safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, 'Invalid phone number');

      // Canonicalize so a number typed in any format matches the stored E.164
      // form (and the issued LOGIN code is keyed to the same canonical phone).
      const phone = normalizePhone(parsed.data.phone);

      const user = await prisma.user.findUnique({
        where: { phone },
        select: {
          id: true,
          telegramChatId: true,
          business: { select: { language: true } },
        },
      });

      // Only act for a real, Telegram-bound user. Either way the response is
      // identical and timing-insensitive enough for this non-secret signal.
      if (user?.telegramChatId) {
        const platformToken = process.env.PLATFORM_BOT_TOKEN;
        if (platformToken) {
          try {
            const code = await issueAuthCode({
              phone,
              purpose: 'LOGIN',
              userId: user.id,
              chatId: user.telegramChatId,
            });
            const lang = resolveAuthLang(user.business?.language ?? null);
            // Code blurred via spoiler in the text; a copy_text button gives the
            // user one-tap copy without exposing the digits in notifications.
            await sendTelegramMessage(
              platformToken,
              user.telegramChatId,
              loginCodeMessage(lang, code),
              { inline_keyboard: [[{ text: copyCodeLabel(lang), copy_text: { text: code } }]] },
            );
          } catch (err) {
            // Never surface delivery failures to the caller (no enumeration).
            app.log.error({ err }, 'login code delivery failed');
          }
        } else {
          app.log.error('PLATFORM_BOT_TOKEN is not configured — cannot send login code');
        }
      }

      return reply.send({ message: 'If an account exists, a code has been sent.' });
    },
  );

  /**
   * POST /auth/login/verify
   * Verify a LOGIN code and issue a 30-day JWT. Consent is NOT re-requested
   * unless the user has no ConsentRecord for the current policy version.
   */
  app.post(
    '/auth/login/verify',
    {
      config: {
        rateLimit: { max: 20, timeWindow: RATE_WINDOW_MS },
      },
    },
    async (request, reply) => {
      const parsed = loginVerifyBody.safeParse(request.body);
      if (!parsed.success) return sendError(reply, 400, 'Invalid request body');

      const { code, generalConsent, crossBorderConsent } = parsed.data;
      // Same canonicalization as /login/request so the code (keyed by canonical
      // phone) verifies and the user lookup below matches the stored form.
      const phone = normalizePhone(parsed.data.phone);

      const result = await verifyAuthCode(phone, code, 'LOGIN');
      if (!result.ok) {
        const msg =
          result.reason === 'locked'
            ? 'Too many attempts. Please request a new code.'
            : result.reason === 'expired'
              ? 'Code expired. Please request a new code.'
              : 'Invalid code';
        return sendError(reply, 401, msg);
      }

      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        // Should not happen (code was issued for a real user), but guard anyway.
        return sendError(reply, 401, 'Invalid code');
      }

      // Consent gate: only if there is no consent for the current policy version.
      if (!(await hasCurrentConsent(user.id))) {
        if (generalConsent === true && crossBorderConsent === true) {
          await prisma.consentRecord.create({
            data: {
              userId: user.id,
              generalConsent: true,
              crossBorderConsent: true,
              policyVersion: CURRENT_POLICY_VERSION,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'] || null,
            },
          });
        } else {
          return reply.status(403).send({
            error: 'CONSENT_REQUIRED',
            policyVersion: CURRENT_POLICY_VERSION,
          });
        }
      }

      return reply.send(await buildAuthResponse(app, user));
    },
  );
}
