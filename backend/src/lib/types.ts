import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    // Owner tokens minted at login carry { userId, phone }. Impersonation
    // tokens minted by POST /admin/businesses/:id/impersonate carry { userId,
    // businessId } plus the impersonation markers below (and no phone), so the
    // extra fields are optional. The impersonationGuard reads isImpersonation.
    payload: {
      userId: string;
      phone?: string;
      businessId?: string;
      isImpersonation?: boolean;
      impersonatedBy?: string;
    };
    user: {
      userId: string;
      phone?: string;
      businessId?: string;
      isImpersonation?: boolean;
      impersonatedBy?: string;
    };
  }
}
