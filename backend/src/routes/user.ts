import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { sendError } from '../lib/errors.js';

// Owner-scoped (User) routes. Both are scoped SOLELY by request.user.userId (the
// verified JWT id IS the owner's row) — no business/ownership lookup needed, and
// they intentionally bypass the business suspension gate (consent is
// account-level). They deliberately do NOT touch the emailPromptDismiss* fields
// except in the dedicated dismiss route.

const USER_CONSENT_SELECT = {
  email: true,
  newsletterConsent: true,
  newsletterConsentAt: true,
  emailPromptDismissedAt: true,
  emailPromptDismissCount: true,
} as const;

type UserConsentRow = {
  email: string | null;
  newsletterConsent: boolean;
  newsletterConsentAt: Date | null;
  emailPromptDismissedAt: Date | null;
  emailPromptDismissCount: number;
};

// Flatten to the same shape the clients read off the business payload
// (email → ownerEmail), so a save/dismiss response and GET /business agree.
function ownerConsentPayload(u: UserConsentRow) {
  return {
    ownerEmail: u.email,
    newsletterConsent: u.newsletterConsent,
    newsletterConsentAt: u.newsletterConsentAt,
    emailPromptDismissedAt: u.emailPromptDismissedAt,
    emailPromptDismissCount: u.emailPromptDismissCount,
  };
}

// email: optional. When present it must be a valid email (trimmed + lowercased);
// null clears it. newsletterConsent is required. Consent is SEPARATE from the
// email — a valid email may be submitted with consent=false.
const emailConsentBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254).nullable().optional(),
  newsletterConsent: z.boolean(),
});

export default async function userRoutes(app: FastifyInstance) {
  // PATCH /user/email-consent — set email + newsletter consent. Used by BOTH the
  // analytics capture card and the Settings email field.
  app.patch('/user/email-consent', { preHandler: authenticate }, async (request, reply) => {
    const parsed = emailConsentBody.safeParse(request.body);
    if (!parsed.success) return sendError(reply, 400, parsed.error.issues[0].message);

    const { email, newsletterConsent } = parsed.data;

    const updated = await prisma.user.update({
      where: { id: request.user.userId },
      data: {
        newsletterConsent,
        // Provable opt-in time: set only when consenting, cleared otherwise.
        newsletterConsentAt: newsletterConsent ? new Date() : null,
        // undefined → leave email unchanged; a value (or null) → set/clear it.
        ...(email === undefined ? {} : { email }),
      },
      select: USER_CONSENT_SELECT,
    });

    return reply.send(ownerConsentPayload(updated));
  });

  // PATCH /user/dismiss-email-prompt — the analytics card "Skip" action. Stamps
  // the dismissal time and bumps the count (drives the capped one-retry re-push).
  app.patch('/user/dismiss-email-prompt', { preHandler: authenticate }, async (request, reply) => {
    const updated = await prisma.user.update({
      where: { id: request.user.userId },
      data: {
        emailPromptDismissedAt: new Date(),
        emailPromptDismissCount: { increment: 1 },
      },
      select: USER_CONSENT_SELECT,
    });

    return reply.send(ownerConsentPayload(updated));
  });
}
