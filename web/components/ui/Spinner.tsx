interface SpinnerProps {
  size?: number
  className?: string
}

export function Spinner({ size = 16, className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block border-2 border-accent border-t-transparent rounded-full animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
