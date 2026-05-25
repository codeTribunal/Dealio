import { prisma } from './prisma.js';
import { FastifyReply } from 'fastify';
import { sendError } from './errors.js';

export async function getBusinessOrFail(
  userId: string,
  reply: FastifyReply,
) {
  const business = await prisma.business.findUnique({ where: { ownerId: userId } });
  if (!business) {
    sendError(reply, 404, 'Business not found. Complete onboarding first.');
    return null;
  }
  return business;
}
