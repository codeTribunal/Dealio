export type LimitKey =
  | 'customers'
  | 'ordersPerMonth'
  | 'appointmentsPerMonth'
  | 'staff'
  | 'bots'
  | 'analyticsRetentionDays'
  | 'customFields'
  | 'checkoutQuestions'
  | 'pipelineStages';

export const PLAN_LIMITS: Record<string, Record<LimitKey, number>> = {
  FREE: {
    customers: 30,
    ordersPerMonth: 50,
    appointmentsPerMonth: 50,
    staff: 1,
    bots: 1,
    analyticsRetentionDays: 30,
    customFields: 3,
    checkoutQuestions: 2,
    pipelineStages: 3,
  },
  PRO: {
    customers: Infinity,
    ordersPerMonth: Infinity,
    appointmentsPerMonth: Infinity,
    staff: Infinity,
    bots: 1,
    analyticsRetentionDays: 90,
    customFields: Infinity,
    checkoutQuestions: Infinity,
    pipelineStages: Infinity,
  },
  BUSINESS: {
    customers: Infinity,
    ordersPerMonth: Infinity,
    appointmentsPerMonth: Infinity,
    staff: Infinity,
    bots: 5,
    analyticsRetentionDays: 365,
    customFields: Infinity,
    checkoutQuestions: Infinity,
    pipelineStages: Infinity,
  },
};

export interface LimitCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
}

export function checkLimit(
  plan: string,
  limitKey: LimitKey,
  currentCount: number,
): LimitCheckResult {
  const planLimits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
  const limit = planLimits[limitKey];
  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
  };
}

/**
 * Returns a ready-to-send 402 payload when a limit is hit.
 *
 * Usage in a route handler:
 *   const check = checkLimit(business.plan, 'customers', count);
 *   if (!check.allowed) return reply.status(402).send(planLimitError('customers', check, business.plan));
 */
export function planLimitError(
  limitKey: LimitKey,
  result: LimitCheckResult,
  plan: string,
) {
  const upgradeMessages: Record<LimitKey, string> = {
    customers: 'Upgrade to Pro to add unlimited customers',
    ordersPerMonth: 'Upgrade to Pro for unlimited monthly orders',
    appointmentsPerMonth: 'Upgrade to Pro for unlimited monthly appointments',
    staff: 'Upgrade to Pro to add unlimited staff members',
    bots: 'Upgrade to Business to connect multiple bots',
    analyticsRetentionDays: 'Upgrade to Pro for longer analytics history',
    customFields: 'Upgrade to Pro for unlimited custom fields',
    checkoutQuestions: 'Upgrade to Pro for unlimited checkout questions',
    pipelineStages: 'Upgrade to Pro for unlimited pipeline stages',
  };

  return {
    error: 'PLAN_LIMIT_REACHED',
    limitType: limitKey,
    current: result.current,
    limit: result.limit,
    plan,
    upgradeMessage: upgradeMessages[limitKey],
  };
}
