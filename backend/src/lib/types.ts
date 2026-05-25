import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; phone: string };
    user: { userId: string; phone: string };
  }
}
