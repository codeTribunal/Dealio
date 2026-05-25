import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createOtp, verifyOtp } from '../services/otp.js';
import { sendError } from '../lib/errors.js';

const requestOtpBody = z.object({
  phone: z.string().min(9).max(20),
});

const verifyOtpBody = z.object({
  phone: z.string().min(9).max(20),
  code: z.string().length(4),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/request-otp',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
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

  app.post('/auth/verify-otp', async (request, reply) => {
    const parsed = verifyOtpBody.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'Invalid request body');
    }

    const { phone, code } = parsed.data;
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

    return reply.send({ token, user: { id: user.id, phone: user.phone }, business: business ?? null });
  });
}
