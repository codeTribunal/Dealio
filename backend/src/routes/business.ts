import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { getBusinessOrFail } from '../lib/businessFromUser.js';
import { sendError } from '../lib/errors.js';
import { encryptBotToken } from '../lib/crypto.js';
import { generateCalendarToken } from '../lib/calendarToken.js';
import { mergeReminderSettings } from '../lib/reminderDefaults.js';
import { getCardPaymentsEnabled } from '../lib/platformSettings.js';
import { stopBusinessBot, startBusinessBot } from '../lib/botManager.js';

// Owner self-serve account deletion: 30-day recoverable window.
const DELETION_WINDOW_DAYS = 30;

// Confirmation the owner must type to arm the destructive action (the business
// name OR the literal "DELETE"). Non-empty; matched case-insensitively/trimmed.
const requestDeletionBody = z.object({
  confirmation: z.string().min(1).max(200),
});

// Fields returned to the app owner — never includes any token fields
const SAFE_BUSINESS_SELECT = {
  id: true,
  name: true,
  description: true,
  address: true,
  photoUrl: true,
  mode: true,
  language: true,
  botUsername: true,
  calendarToken: true,
  workingHours: true,
  bufferMinutes: true,
  cardNumber: true,
  cardHolderName: true,
  ownerTelegramChatId: true,
  ownerId: true,
  plan: true,
  planExpiresAt: true,
  suspendedAt: true,
  // Self-serve deletion state — the client reads deletionState to show the
  // "scheduled for deletion, reactivate?" screen (GET /business is readable even
  // while suspended, so a PENDING_DELETION owner can still reach it).
  deletionState: true,
  deletionRequestedAt: true,
  deletionScheduledAt: true,
  createdAt: true,
  updatedAt: true,
  // Owner email + newsletter-consent fields, flattened onto the payload by
  // flattenOwner() (email → ownerEmail) like cardPaymentsEnabled — so both
  // clients read them off the flat business object with no extra fetch.
  owner: {
    select: {
      email: true,
      newsletterConsent: true,
      newsletterConsentAt: true,
      emailPromptDismissedAt: true,
      emailPromptDismissCount: true,
    },
  },
} as const;

type OwnerConsentFields = {
  email: string | null;
  newsletterConsent: boolean;
  newsletterConsentAt: Date | null;
  emailPromptDismissedAt: Date | null;
  emailPromptDismissCount: number;
};

// Flatten a business row selected with SAFE_BUSINESS_SELECT: drop the nested
// `owner` object and spread its fields (email → ownerEmail) + cardPaymentsEnabled
// onto a flat payload. Owner is always present for an owned business but is
// defensively defaulted.
function flattenOwner<T extends { owner?: OwnerConsentFields | null }>(
  business: T,
  cardPaymentsEnabled: boolean,
): Omit<T, 'owner'> & {
  ownerEmail: string | null;
  newsletterConsent: boolean;
  newsletterConsentAt: Date | null;
  emailPromptDismissedAt: Date | null;
  emailPromptDismissCount: number;
  cardPaymentsEnabled: boolean;
} {
  const { owner, ...biz } = business;
  return {
    ...biz,
    ownerEmail: owner?.email ?? null,
    newsletterConsent: owner?.newsletterConsent ?? false,
    newsletterConsentAt: owner?.newsletterConsentAt ?? null,
    emailPromptDismissedAt: owner?.emailPromptDismissedAt ?? null,
    emailPromptDismissCount: owner?.emailPromptDismissCount ?? 0,
    cardPaymentsEnabled,
  };
}

const createBusinessBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  // Physical location (pickup / appointment). Optional; empty → null.
  address: z.string().trim().max(200).nullable().optional(),
  // Single mode (scalar). PRODUCTS disabled — only SERVICES/FREELANCE accepted.
  mode: z.enum(['PRODUCTS', 'SERVICES', 'FREELANCE']),
  language: z.enum(['UZBEK', 'RUSSIAN', 'ENGLISH']).optional(),
  ownerTelegramChatId: z.string().optional(),
  botToken: z.string().optional(),
  botUsername: z.string().optional(),
});

// Working hours: keys "0".."6" (0=Sunday … 6=Saturday, Asia/Tashkent local),
// each value either { start: "HH:MM", end: "HH:MM" } or null = closed.
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format');
const dayWindowSchema = z
  .object({ start: hhmm, end: hhmm })
  .refine(
    (d) => {
      const [sh, sm] = d.start.split(':').map(Number);
      const [eh, em] = d.end.split(':').map(Number);
      return sh * 60 + sm < eh * 60 + em;
    },
    { message: 'Working day start must be before end' },
  );
const dayIntervalsSchema = z
  .array(dayWindowSchema)
  .refine(
    (intervals) => {
      const sorted = [...intervals].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start < sorted[i - 1].end) return false; // overlapping intervals
      }
      return true;
    },
    { message: 'Working hour intervals must not overlap' },
  );
const workingHoursSchema = z.record(
  z.enum(['0', '1', '2', '3', '4', '5', '6']),
  // Array of intervals (new) | single window (legacy) | null (closed).
  z.union([dayIntervalsSchema, dayWindowSchema, z.null()]),
);

const updateBusinessBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  // Physical location (pickup / appointment). Optional; empty → null (clear).
  address: z.string().trim().max(200).nullable().optional(),
  photoUrl: z.string().url().optional(),
  // Single mode (scalar). PRODUCTS disabled — only SERVICES/FREELANCE accepted.
  mode: z.enum(['PRODUCTS', 'SERVICES', 'FREELANCE']).optional(),
  language: z.enum(['UZBEK', 'RUSSIAN', 'ENGLISH']).optional(),
  workingHours: workingHoursSchema.optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  botToken: z.string().optional(),
  botUsername: z.string().optional(),
  ownerTelegramChatId: z.string().optional(),
});

const reminderSettingsSchema = z.object({
  appointmentEnabled: z.boolean().optional(),
  appointmentHoursBefore: z.number().int().min(1).max(168).optional(),
  appointmentSecondEnabled: z.boolean().optional(),
  appointmentSecondHoursBefore: z.number().int().min(1).max(48).optional(),
  deliveryEnabled: z.boolean().optional(),
  deliveryHoursBefore: z.number().int().min(1).max(168).optional(),
  deadlineEnabled: z.boolean().optional(),
  deadlineHoursBefore: z.number().int().min(1).max(336).optional(),
});

function buildTokenData(botToken: string | undefined) {
  if (!botToken) return {};
  const { encrypted, iv, tag } = encryptBotToken(botToken);
  return {
    botTokenEncrypted: encrypted,
    botTokenIv: iv,
    botTokenTag: tag,
  };
}

const BOT_TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]{35,}$/;
const updateBotTokenBody = z.object({
  botToken: z.string().regex(BOT_TOKEN_REGEX, 'Invalid bot token format'),
});

/** Authoritative bot identity check via Telegram getMe. */
async function telegramGetMe(token: string): Promise<{ ok: boolean; username?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as { ok: boolean; result?: { username: string } };
    if (!data.ok) return { ok: false };
    return { ok: true, username: data.result?.username };
  } catch {
    return { ok: false };
  }
}

/**
 * Hot-swap a running bot with its newly-stored token. start-bot is a no-op when
 * the bot is already running, so a token change only takes effect after a stop;
 * start-bot then re-fetches the (new) token from the DB. Best-effort.
 */
async function restartBusinessBot(businessId: string): Promise<void> {
  const botServiceUrl = process.env.BOT_SERVICE_URL ?? 'http://localhost:3002';
  const headers = {
    'Content-Type': 'application/json',
    'x-bot-secret': process.env.BOT_MANAGER_SECRET ?? '',
  };
  const body = JSON.stringify({ businessId });
  await fetch(`${botServiceUrl}/internal/stop-bot`, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(10_000),
  });
  await fetch(`${botServiceUrl}/internal/start-bot`, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(10_000),
  });
}

// PATCH /business/payment body. Both fields nullable so the owner can clear the
// card. An empty cardNumber string is normalised to null in the handler.
const updatePaymentBody = z.object({
  cardNumber: z.string().trim().max(32).nullable().optional(),
  cardHolderName: z.string().trim().max(100).nullable().optional(),
});

export default async function businessRoutes(app: FastifyInstance) {
  app.get('/business', { preHandler: authenticate }, async (request, reply) => {
    const business = await prisma.business.findUnique({
      where: { ownerId: request.user.userId },
      select: SAFE_BUSINESS_SELECT,
    });
    if (!business) return sendError(reply, 404, 'Business not found. Complete onboarding first.');
    // Carry the global card-payments flag on the business payload so the app/web
    // get it with their existing bootstrap fetch (no extra round-trip needed).
    const cardPaymentsEnabled = await getCardPaymentsEnabled();
    return reply.send(flattenOwner(business, cardPaymentsEnabled));
  });

  // POST /business/request-deletion — owner self-serve account deletion.
  // Schedules an irreversible purge 30 days out and suspends the business NOW
  // (reusing the suspension enforcement: sets suspendedAt, so the dashboard/API
  // and all 17 bot routes immediately 403). Recoverable via /business/reactivate
  // within the window. Looks the business up by ownerId directly (NOT
  // getBusinessOrFail) so it stays reachable + idempotent once suspended.
  app.post('/business/request-deletion', { preHandler: authenticate }, async (request, reply) => {
    const parsed = requestDeletionBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const business = await prisma.business.findUnique({
      where: { ownerId: request.user.userId },
      select: { id: true, name: true, suspendedAt: true, deletionState: true, deletionScheduledAt: true },
    });
    if (!business) return sendError(reply, 404, 'Business not found. Complete onboarding first.');

    // Idempotent: already pending — no-op, return the existing schedule.
    if (business.deletionState === 'PENDING_DELETION') {
      return reply.send({ pending: true, deletionScheduledAt: business.deletionScheduledAt });
    }
    // An admin suspension (not a deletion) takes precedence — can't self-delete.
    if (business.suspendedAt) {
      return reply.status(403).send({
        error: 'ACCOUNT_SUSPENDED',
        reason: 'Your account is suspended. Contact support.',
      });
    }

    // Explicit confirmation gesture: the typed value must match the business name
    // or the literal "DELETE" (mirrors the client's typed-confirmation input).
    const typed = parsed.data.confirmation.trim();
    const ok = typed.toLowerCase() === business.name.trim().toLowerCase() || typed === 'DELETE';
    if (!ok) return sendError(reply, 400, 'Confirmation does not match. Type your business name or DELETE.');

    const now = new Date();
    const scheduledAt = new Date(now.getTime() + DELETION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    await prisma.business.update({
      where: { id: business.id },
      data: {
        deletionState: 'PENDING_DELETION',
        deletionRequestedAt: now,
        deletionScheduledAt: scheduledAt,
        // Reuse the single suspension enforcement path — blocks dashboard + bots.
        suspendedAt: now,
        suspendedReason: 'Account deletion requested by owner.',
      },
    });

    // Stop the bot NOW (best-effort — even if this fails, the bot's backend calls
    // already 403 ACCOUNT_SUSPENDED, so it is functionally down either way).
    stopBusinessBot(business.id).catch((err) =>
      request.log.error({ err, businessId: business.id }, '[deletion] stop-bot failed'),
    );

    request.log.info(
      { businessId: business.id, deletionScheduledAt: scheduledAt.toISOString() },
      '[deletion] account deletion requested by owner',
    );

    return reply.send({ pending: true, deletionScheduledAt: scheduledAt.toISOString() });
  });

  // POST /business/reactivate — cancel a pending deletion within the 30-day
  // window and restore the account. Reachable while suspended (looks up by
  // ownerId directly, not getBusinessOrFail). Idempotent for an already-active
  // account. Only clears the deletion-caused suspension (guarded on state).
  app.post('/business/reactivate', { preHandler: authenticate }, async (request, reply) => {
    const business = await prisma.business.findUnique({
      where: { ownerId: request.user.userId },
      select: { id: true, deletionState: true },
    });
    if (!business) return sendError(reply, 404, 'Business not found. Complete onboarding first.');

    if (business.deletionState !== 'PENDING_DELETION') {
      // Already active (or never pending) — idempotent success.
      return reply.send({ reactivated: true });
    }

    await prisma.business.update({
      where: { id: business.id },
      data: {
        deletionState: 'ACTIVE',
        deletionRequestedAt: null,
        deletionScheduledAt: null,
        suspendedAt: null,
        suspendedReason: null,
      },
    });

    // Restart the bot (best-effort — otherwise it comes up on the next restart).
    startBusinessBot(business.id).catch((err) =>
      request.log.error({ err, businessId: business.id }, '[deletion] reactivate start-bot failed'),
    );

    request.log.info({ businessId: business.id }, '[deletion] account reactivated by owner');

    return reply.send({ reactivated: true });
  });

  // GET /platform-settings — global, superadmin-controlled flags any
  // authenticated owner/app may READ (e.g. onboarding needs it BEFORE a business
  // exists, so it can't rely on GET /business). Writes are admin-only (see admin.ts).
  app.get('/platform-settings', { preHandler: authenticate }, async (_request, reply) => {
    const cardPaymentsEnabled = await getCardPaymentsEnabled();
    return reply.send({ cardPaymentsEnabled });
  });

  app.post('/business', { preHandler: authenticate }, async (request, reply) => {
    const existing = await prisma.business.findUnique({
      where: { ownerId: request.user.userId },
    });
    if (existing) return sendError(reply, 409, 'Business already exists for this account');

    const parsed = createBusinessBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, address, ...rest } = parsed.data;

    const business = await prisma.business.create({
      data: {
        ...rest,
        ...buildTokenData(botToken),
        ownerId: request.user.userId,
        // Empty string → null; undefined → omit (column defaults null).
        ...(address === undefined ? {} : { address: address || null }),
      },
      select: SAFE_BUSINESS_SELECT,
    });
    // Keep cardPaymentsEnabled present on every full-business payload (as GET
    // does) so clients gate the card UI consistently after any mutation.
    const cardPaymentsEnabled = await getCardPaymentsEnabled();
    return reply.status(201).send(flattenOwner(business, cardPaymentsEnabled));
  });

  app.patch('/business', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const parsed = updateBusinessBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { botToken, address, ...rest } = parsed.data;

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...rest,
        ...buildTokenData(botToken),
        // Empty string → null (clear); undefined → leave unchanged.
        ...(address === undefined ? {} : { address: address || null }),
      },
      select: SAFE_BUSINESS_SELECT,
    });
    // Carry the global flag (PATCH select omits it) so the card UI gate stays
    // correct after profile/mode/language edits.
    const cardPaymentsEnabled = await getCardPaymentsEnabled();
    return reply.send(flattenOwner(updated, cardPaymentsEnabled));
  });

  // PATCH /business/payment
  // Owner sets/updates/clears their P2P card (number + holder) shown to customers.
  // Always writable regardless of the global cardPaymentsEnabled flag — that
  // flag controls VISIBILITY only and never erases stored card data.
  app.patch('/business/payment', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const parsed = updatePaymentBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        // undefined = leave unchanged; '' or null = clear.
        cardNumber:
          parsed.data.cardNumber === undefined
            ? undefined
            : parsed.data.cardNumber || null,
        cardHolderName:
          parsed.data.cardHolderName === undefined
            ? undefined
            : parsed.data.cardHolderName || null,
      },
      select: SAFE_BUSINESS_SELECT,
    });
    // Mirror GET /business: carry the global flag so clients refresh their model.
    const cardPaymentsEnabled = await getCardPaymentsEnabled();
    return reply.send(flattenOwner(updated, cardPaymentsEnabled));
  });

  // PATCH /business/bot-token
  // Change the Telegram bot token (e.g. after revoking/replacing the bot).
  // Re-verifies with Telegram, re-derives the username, and hot-swaps the bot.
  app.patch('/business/bot-token', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const parsed = updateBotTokenBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const tg = await telegramGetMe(parsed.data.botToken);
    if (!tg.ok || !tg.username) {
      return sendError(reply, 400, 'Invalid bot token. Check and try again.');
    }

    // The bot must not already belong to a different business.
    const taken = await prisma.business.findUnique({ where: { botUsername: tg.username } });
    if (taken && taken.id !== business.id) {
      return sendError(reply, 409, 'This bot is already registered to another business.');
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: { ...buildTokenData(parsed.data.botToken), botUsername: tg.username },
      select: SAFE_BUSINESS_SELECT,
    });

    // Best-effort hot-swap; if the bot service is down it picks up on next restart.
    restartBusinessBot(business.id).catch((err) =>
      app.log.error({ err }, '[business/bot-token] bot restart failed'),
    );

    return reply.send({
      botUsername: updated.botUsername,
      botLink: `https://t.me/${updated.botUsername}`,
    });
  });

  app.patch('/business/fcm-token', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const parsed = z.object({ fcmToken: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    await prisma.business.update({
      where: { id: business.id },
      data: { fcmToken: parsed.data.fcmToken },
    });
    return reply.status(204).send();
  });

  app.get('/business/bot', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    // A business with no bot connected yet (fresh signup / mid-onboarding) is
    // VALID — return a well-formed empty payload, never a 404. A 404 here makes
    // the client's getBotInfo throw and fails the whole Settings screen; the
    // client already renders the "connect a bot" editor when botUsername is null.
    if (!business.botUsername) {
      return reply.send({ botUsername: null, botLink: null });
    }

    return reply.send({
      botUsername: business.botUsername,
      botLink: `https://t.me/${business.botUsername}`,
    });
  });

  // POST /business/calendar-token
  // Generates a new calendar token (or regenerates the existing one)
  app.post('/business/calendar-token', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const newToken = generateCalendarToken();

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: { calendarToken: newToken },
      select: { calendarToken: true },
    });

    return reply.send({ calendarToken: updated.calendarToken });
  });

  // DELETE /business/calendar-token
  // Disables calendar sync by removing the token
  app.delete('/business/calendar-token', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    await prisma.business.update({
      where: { id: business.id },
      data: { calendarToken: null },
    });

    return reply.send({ success: true });
  });

  // GET /business/reminder-settings
  // Owner reminder settings, merged with defaults for any missing keys.
  app.get('/business/reminder-settings', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    return reply.send(mergeReminderSettings(business.reminderSettings));
  });

  // PATCH /business/reminder-settings
  // Partial update — merges the provided keys onto the stored settings.
  app.patch('/business/reminder-settings', { preHandler: authenticate }, async (request, reply) => {
    const business = await getBusinessOrFail(request, reply);
    if (!business) return;

    const parsed = reminderSettingsSchema.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const merged = {
      ...mergeReminderSettings(business.reminderSettings),
      ...parsed.data,
    };

    await prisma.business.update({
      where: { id: business.id },
      data: { reminderSettings: merged },
    });

    return reply.send(merged);
  });
}
