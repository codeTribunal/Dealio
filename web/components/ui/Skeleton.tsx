interface SkeletonProps {
  className?: string
}

/**
 * Loading placeholder block. Uses the surface-2 token with a subtle pulse; the
 * global prefers-reduced-motion rule (app/globals.css) neutralizes the pulse for
 * users who ask for reduced motion. Size/shape it via `className`.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-surface-2 ${className}`}
    />
  )
}
