import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createOtp, verifyOtp } from '../services/otp.js';
import { sendError } from '../lib/errors.js';
import { CURRENT_POLICY_VERSION } from '../lib/policyVersion.js';

const requestOtpBody = z.object({
  phone: z.string().min(9).max(20),
});

const verifyOtpBody = z.object({
  phone: z.string().min(9).max(20),
  code: z.string().length(4),
  generalConsent: z.boolean().optional(),
  crossBorderConsent: z.boolean().optional(),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/request-otp',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: 600000,
          keyGenerator: (request) => {
            const body = request.body as { phone?: string };
            return body?.phone || request.ip;
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = requestOtpBody.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, 'Invalid phone number');
      }

      const { phone } = parsed.data;
      const code = await createOtp(phone);

      // In production: send SMS with code. For now, log it.
      if (process.env.NODE_ENV !== 'production') {
        app.log.info(`OTP for ${phone}: ${code}`);
      }

      return reply.send({ message: 'OTP sent' });
    },
  );

  app.post(
    '/auth/verify-otp',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: 600000,
        },
      },
    },
    async (request, reply) => {
      const parsed = verifyOtpBody.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, 'Invalid request body');
      }

      const { phone, code, generalConsent, crossBorderConsent } = parsed.data;
      const valid = await verifyOtp(phone, code);
      if (!valid) {
        return sendError(reply, 401, 'Invalid or expired OTP');
      }

      let user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        user = await prisma.user.create({ data: { phone } });
      }

      const business = await prisma.business.findUnique({
        where: { ownerId: user.id },
        select: { id: true, name: true, mode: true },
      });

      const token = app.jwt.sign({ userId: user.id, phone: user.phone });

      // Record consent only when both checkboxes were explicitly accepted.
      // Returning users logging in won't send these, so login is never blocked.
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
      }

      return reply.send({ token, user: { id: user.id, phone: user.phone }, business: business ?? null });
    },
  );
}
