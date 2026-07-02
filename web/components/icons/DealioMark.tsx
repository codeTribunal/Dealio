/**
 * Dealio brand mark — the faithful "d" from logo.svg, drawn on a TRANSPARENT
 * background so it sits directly on whatever surface hosts it:
 *   • bowl/stem stroke = var(--text-1) (the foreground token): dark navy in
 *     light mode (≈ the brand #0F1729), light in dark mode so it stays legible
 *     on the dark sidebar surface,
 *   • blue (#3C83F6) filled lower-right quarter — fixed brand color,
 *   • blue (#3C83F6) accent dot — fixed brand color.
 * Same geometry as the app launcher & splash mark.
 *
 * Props are unchanged (`size`, `className`) so existing usages keep working.
 */
export function DealioMark({
  size = 36,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      fill="none"
      className={className}
      role="img"
      aria-label="Dealio"
    >
      {/* "d" bowl + stem — theme foreground so it's legible in light AND dark */}
      <path
        d="M40 25V85H65C72.9565 85 80.5871 81.8393 86.2132 76.2132C91.8393 70.5871 95 62.9565 95 55C95 47.0435 91.8393 39.4129 86.2132 33.7868C80.5871 28.1607 72.9565 25 65 25H40Z"
        style={{ stroke: 'var(--text-1)' }}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* filled lower-right quarter — inset to the stroke's INNER edge (r=25,
          not the r=30 centerline) so the dark ring keeps its full 10u weight
          on every quadrant. Decided in the logo critique; the master geometry
          lives in app/assets/branding/mark.svg — keep in sync. */}
      <path
        d="M65 55H90C90 61.6304 87.3661 67.9893 82.6777 72.6777C77.9893 77.3661 71.6304 80 65 80V55Z"
        fill="#3C83F6"
      />
      {/* accent dot */}
      <path
        d="M25 60C27.7614 60 30 57.7614 30 55C30 52.2386 27.7614 50 25 50C22.2386 50 20 52.2386 20 55C20 57.7614 22.2386 60 25 60Z"
        fill="#3C83F6"
      />
    </svg>
  )
}
