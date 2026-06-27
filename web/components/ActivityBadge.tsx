'use client'
import { Badge, type BadgeType } from '@/components/ui/Badge'

interface ActivityBadgeProps {
  status: string
  type: BadgeType
}

/**
 * Thin backwards-compat wrapper around the canonical token-based {@link Badge}.
 * Delegating keeps the status→family→color mapping in ONE place so web renders
 * the same color for the same status as the Flutter app (app_badge.dart):
 * pill shape, fill = {family}-soft, text = {family}-strong.
 */
export default function ActivityBadge({ status, type }: ActivityBadgeProps) {
  return <Badge status={status} type={type} />
}
