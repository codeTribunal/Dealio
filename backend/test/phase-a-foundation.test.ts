import { describe, it, expect } from 'vitest';
import {
  injectNotDeleted,
  SOFT_DELETE_MODELS,
} from '../src/lib/softDeleteFilter.js';
import { isImpersonationBlocked } from '../src/middleware/impersonation.js';

// These are pure-logic unit tests — no database needed, so they run in every
// environment (unlike the DB-dependent cross-tenant isolation suite).

describe('soft-delete filter — injectNotDeleted', () => {
  it('adds deletedAt: null for a soft-deletable model with no where', () => {
    expect(injectNotDeleted('Customer', undefined)).toEqual({ where: { deletedAt: null } });
    expect(injectNotDeleted('Order', {})).toEqual({ where: { deletedAt: null } });
  });

  it('AND-combines deletedAt: null with existing where conditions', () => {
    const out = injectNotDeleted('Appointment', { where: { businessId: 'biz1' }, take: 5 });
    expect(out).toEqual({ where: { businessId: 'biz1', deletedAt: null }, take: 5 });
  });

  it('preserves other args (select/orderBy/take/by) untouched', () => {
    const out = injectNotDeleted('Order', {
      by: ['businessId'],
      where: { businessId: 'b' },
      orderBy: { createdAt: 'desc' },
    });
    expect(out.by).toEqual(['businessId']);
    expect(out.orderBy).toEqual({ createdAt: 'desc' });
    expect(out.where).toEqual({ businessId: 'b', deletedAt: null });
  });

  it('never overrides a caller-provided deletedAt (opt-in to see deleted)', () => {
    const onlyDeleted = injectNotDeleted('Project', { where: { deletedAt: { not: null } } });
    expect(onlyDeleted.where).toEqual({ deletedAt: { not: null } });

    const explicitNull = injectNotDeleted('Project', { where: { businessId: 'b', deletedAt: null } });
    expect(explicitNull.where).toEqual({ businessId: 'b', deletedAt: null });
  });

  it('leaves non-soft-deletable models completely unchanged', () => {
    const args = { where: { id: 'x' } };
    expect(injectNotDeleted('Business', args)).toBe(args);
    expect(injectNotDeleted('User', args)).toBe(args);
    expect(injectNotDeleted('Invoice', args)).toBe(args);
    expect(injectNotDeleted('AuditLog', args)).toBe(args);
  });

  it('covers exactly the models that have a deletedAt column', () => {
    expect([...SOFT_DELETE_MODELS].sort()).toEqual(
      [
        'Appointment',
        'BusinessCustomField',
        'CheckoutQuestion',
        'Customer',
        'CustomerStage',
        'Milestone',
        'Order',
        'Product',
        'Project',
        'Service',
        'Staff',
      ].sort(),
    );
  });
});

describe('impersonation guardrail — isImpersonationBlocked', () => {
  it('blocks every DELETE', () => {
    expect(isImpersonationBlocked('DELETE', '/api/v1/products/:id')).toBe(true);
    expect(isImpersonationBlocked('DELETE', '/api/v1/staff/:id')).toBe(true);
    expect(isImpersonationBlocked('DELETE', '/api/v1/projects/:id/milestones/:mId')).toBe(true);
  });

  it('blocks PATCH .../payment (order/appointment confirm)', () => {
    expect(isImpersonationBlocked('PATCH', '/api/v1/orders/:id/payment')).toBe(true);
    expect(isImpersonationBlocked('PATCH', '/api/v1/appointments/:id/payment')).toBe(true);
  });

  it('allows reads and routine writes', () => {
    expect(isImpersonationBlocked('GET', '/api/v1/orders/:id')).toBe(false);
    expect(isImpersonationBlocked('GET', '/api/v1/customers')).toBe(false);
    expect(isImpersonationBlocked('PATCH', '/api/v1/orders/:id/status')).toBe(false);
    expect(isImpersonationBlocked('POST', '/api/v1/customers')).toBe(false);
    expect(isImpersonationBlocked('PATCH', '/api/v1/customers/:id')).toBe(false);
  });
});
