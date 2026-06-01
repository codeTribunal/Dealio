import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/icons/Icon'

interface TopBarProps {
  title: string
  /** Name used for the avatar initials. Defaults to "CRM". */
  userName?: string
  /** When provided, renders a hamburger button on the left (visible only below the lg breakpoint). */
  onMenuClick?: () => void
  /** Whether the mobile menu is currently open. Swaps the hamburger for an X. */
  menuOpen?: boolean
}

export default function TopBar({ title, userName = 'CRM', onMenuClick, menuOpen = false }: TopBarProps) {
  return (
    <div className="h-16 bg-surface border-b border-border flex items-center px-4 lg:px-6 flex-shrink-0">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="lg:hidden mr-3 p-2 rounded-md text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors flex-shrink-0"
          style={{ transitionDuration: 'var(--dur-base)' }}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
        </button>
      )}
      <span className="text-lg font-bold text-text-1 truncate flex-1">{title}</span>
      <div className="ml-4">
        <Avatar name={userName} size="md" />
      </div>
    </div>
  )
}
