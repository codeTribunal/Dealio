import { getInitials } from '@/lib/format'

export type AvatarSize = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
}

interface AvatarProps {
  name: string
  size?: AvatarSize
  className?: string
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  return (
    <div
      className={`rounded-full bg-accent-soft text-accent font-semibold flex items-center justify-center flex-shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      {getInitials(name)}
    </div>
  )
}
