import { prisma } from './prisma.js';

/**
 * Append an immutable admin AuditLog entry. AuditLog is not soft-deletable, so
 * the soft-delete extension does not touch this write.
 *
 * Shared by all admin route modules (platform management in routes/admin.ts and
 * tenant data-management in routes/adminData.ts).
 */
export async function writeAuditLog(params: {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.auditLog.create({ data: params as any });
}
