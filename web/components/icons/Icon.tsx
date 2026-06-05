/**
 * Micro-Detail icon set. All icons share:
 *   viewBox 0 0 24 24, fill none, stroke currentColor, stroke-width 1.5,
 *   round caps/joins. Color follows the consuming element's `color`,
 *   so icons recolor via Tailwind text-* classes and adapt to dark mode.
 *
 * Markup is rendered via dangerouslySetInnerHTML so the path data can be
 * stored as exact SVG strings (kebab-case attrs and all).
 */

const ICONS = {
  home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5 9.6V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.6"/><path d="M9.5 20v-4.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V20"/>',

  customers: '<circle cx="9" cy="8" r="2.7"/><path d="M3.6 19c0-3 2.4-5 5.4-5s5.4 2 5.4 5"/><path d="M15.5 5.5a2.6 2.6 0 0 1 0 5.1"/><path d="M16.6 14.3c2 .5 3.4 2.1 3.4 4.7"/>',

  orders: '<path d="M5.4 8h13.2l-.9 10.4a1.4 1.4 0 0 1-1.4 1.3H7.7a1.4 1.4 0 0 1-1.4-1.3z"/><path d="M8.4 8.2V6.4a3.6 3.6 0 0 1 7.2 0v1.8"/><path d="M9.2 11.4a2.8 2.8 0 0 0 5.6 0"/>',

  catalog: '<rect x="4.5" y="4.5" width="6.4" height="6.4" rx="1.8"/><rect x="13.1" y="4.5" width="6.4" height="6.4" rx="1.8"/><rect x="4.5" y="13.1" width="6.4" height="6.4" rx="1.8"/><rect x="13.1" y="13.1" width="6.4" height="6.4" rx="1.8"/>',

  calendar: '<rect x="4" y="5.2" width="16" height="15" rx="2.4"/><path d="M4 9.6h16"/><path d="M8 3.4v3.4"/><path d="M16 3.4v3.4"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.4h2M11 16.4h2"/>',

  projects: '<path d="M4 7a1.4 1.4 0 0 1 1.4-1.4h3.2l2 2.2h6.8A1.6 1.6 0 0 1 19 9.4v8.2A1.4 1.4 0 0 1 17.6 19H5.4A1.4 1.4 0 0 1 4 17.6z"/><path d="M4 11h15"/>',

  inbox: '<rect x="3.8" y="5.6" width="16.4" height="12.8" rx="2.2"/><path d="M4.4 7.6 12 12.6l7.6-5"/>',

  payment: '<rect x="3.2" y="5.6" width="17.6" height="12.8" rx="2.4"/><path d="M3.2 9.2h17.6"/><rect x="6" y="12" width="3.4" height="2.6" rx="0.6"/><path d="M13 13.3h4.8"/>',

  paid: '<circle cx="12" cy="12" r="8.4"/><path d="M8 12.2l2.6 2.6 5-5.4"/>',

  pending: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3 1.8"/>',

  delivery: '<path d="M2.6 8a1.2 1.2 0 0 1 1.2-1.2h8.4a1.2 1.2 0 0 1 1.2 1.2v7.4H2.6z"/><path d="M13.6 9.8h3.1a1 1 0 0 1 .8.4l2.5 3a1 1 0 0 1 .2.6v1.6h-6.6z"/><path d="M2.6 15.4h18.2"/><circle cx="7" cy="17.4" r="1.7"/><circle cx="16.4" cy="17.4" r="1.7"/>',

  add: '<circle cx="12" cy="12" r="8.4"/><path d="M12 8.4v7.2M8.4 12h7.2"/>',

  search: '<circle cx="10.4" cy="10.4" r="6.4"/><path d="M19.6 19.6l-4.6-4.6"/>',

  bell: '<path d="M12 3.6a4.9 4.9 0 0 1 4.9 4.9c0 4.2 1.5 5.6 1.5 5.6H5.6s1.5-1.4 1.5-5.6A4.9 4.9 0 0 1 12 3.6Z"/><path d="M10.2 17.4a1.9 1.9 0 0 0 3.6 0"/>',

  settings: '<path d="M17.94 9.63 L20.23 10.33 L20.23 13.67 L17.94 14.37 L17.88 14.52 L19.00 16.64 L16.64 19.00 L14.52 17.88 L14.37 17.94 L13.67 20.23 L10.33 20.23 L9.63 17.94 L9.48 17.88 L7.36 19.00 L5.00 16.64 L6.12 14.52 L6.06 14.37 L3.77 13.67 L3.77 10.33 L6.06 9.63 L6.12 9.48 L5.00 7.36 L7.36 5.00 L9.48 6.12 L9.63 6.06 L10.33 3.77 L13.67 3.77 L14.37 6.06 L14.52 6.12 L16.64 5.00 L19.00 7.36 L17.88 9.48 Z"/><circle cx="12" cy="12" r="2.6"/>',

  analytics: '<path d="M4.4 4.4v12.9a1.5 1.5 0 0 0 1.5 1.5H19.6"/><path d="M8.7 16.4v-3.3"/><path d="M13.1 16.4V9.3"/><path d="M17.5 16.4v-5.5"/>',

  growth: '<path d="M3.5 18.5h17"/><path d="M5.5 15 10 10l3 3 5.5-6.5"/><path d="M14.5 6.5h4v4"/>',

  logout: '<path d="M14 5.5V4.4A1.4 1.4 0 0 0 12.6 3H5.4A1.4 1.4 0 0 0 4 4.4v15.2A1.4 1.4 0 0 0 5.4 21h7.2a1.4 1.4 0 0 0 1.4-1.4v-1.1"/><path d="M9 12h11"/><path d="M17 8.5 20.5 12 17 15.5"/>',

  staff: '<path d="M9.5 3h5l-.6 3.2h-3.8z"/><rect x="5" y="6.2" width="14" height="14" rx="3"/><circle cx="12" cy="11.5" r="2.2"/><path d="M8.5 17.5a3.5 3.5 0 0 1 7 0"/>',

  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',

  close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',

  revenue: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="6.1" stroke-dasharray="0.55 1.85"/><text x="12" y="12.2" text-anchor="middle" dominant-baseline="central" font-family="var(--font-manrope), sans-serif" font-size="4.1" font-weight="700" fill="currentColor" stroke="none">soʻm</text>',
} as const

export type IconName = keyof typeof ICONS

export const ICON_NAMES: IconName[] = Object.keys(ICONS) as IconName[]

interface IconProps {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}

export function Icon({ name, size = 24, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}
