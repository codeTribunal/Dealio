import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/app.js';

/**
 * Auth-boundary tests that require NO database — they assert the request is
 * rejected before any tenant query runs. These always execute (even without a
 * test DB) and prove the harness builds the real app and the gates hold.
 */
describe('auth boundary (no DB required)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health is up (app builds)', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('protected route without a token → 401', async () => {
    for (const url of [
      '/api/v1/customers',
      '/api/v1/orders',
      '/api/v1/appointments',
      '/api/v1/projects',
      '/api/v1/business',
    ]) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, `${url} should require auth`).toBe(401);
    }
  });

  it('a normal owner JWT cannot reach /admin/* (requireAdmin rejects it)', async () => {
    const ownerToken = app.jwt.sign({ userId: 'nonexistent-user', phone: '+998900000009' });
    for (const url of ['/api/v1/admin/dashboard', '/api/v1/admin/businesses', '/api/v1/admin/users']) {
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      expect([401, 403], `${url} must reject an owner token`).toContain(res.statusCode);
    }
  });

  it('/admin/* without any token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/dashboard' });
    expect(res.statusCode).toBe(401);
  });

  it('bot internal endpoint without the shared secret → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/bot/mark-reminder-sent',
      payload: { botUsername: 'whatever', appointmentId: 'whatever' },
    });
    expect(res.statusCode).toBe(401);
  });
});
