import type { Business } from '@/types'

// Identical logic to Flutter's Business.shouldPromptEmail: show the analytics
// email-capture card only if there's no email yet AND (never dismissed, OR
// dismissed exactly once more than 30 days ago). After the 2nd dismissal: never.
export function shouldShowEmailPrompt(
  business: Business | null | undefined,
): boolean {
  if (!business) return false
  if (business.ownerEmail) return false
  const count = business.emailPromptDismissCount ?? 0
  if (count === 0) return true
  if (count === 1 && business.emailPromptDismissedAt) {
    const dismissedMs = new Date(business.emailPromptDismissedAt).getTime()
    const days = (Date.now() - dismissedMs) / (1000 * 60 * 60 * 24)
    return days > 30
  }
  return false
}
