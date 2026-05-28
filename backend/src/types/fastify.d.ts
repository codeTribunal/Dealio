import { AdminRole } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    // Set by requireAdmin / requireSuperAdmin after verifying the admin JWT
    adminUser?: {
      id: string;
      role: AdminRole;
      name: string;
      email: string;
    };
    // Added by @fastify/jwt with namespace:'admin', jwtVerify:'adminVerify'.
    // Returns the decoded payload — read from the return value, not request.admin,
    // because @fastify/jwt stores the payload in request.user regardless of namespace.
    adminVerify(): Promise<{ adminUserId: string; role: string }>;
  }

  interface FastifyReply {
    // Added by @fastify/jwt with namespace:'admin', jwtSign:'adminSign'
    adminSign(payload: object, options?: { expiresIn?: string }): Promise<string>;
  }
}
