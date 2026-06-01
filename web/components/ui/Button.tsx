'use client'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from '@/components/icons/Icon'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: IconName
  rightIcon?: IconName
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-on hover:bg-accent-hover active:bg-accent-active shadow-accent',
  secondary:
    'bg-surface text-text-1 border border-border hover:bg-surface-2',
  ghost:
    'bg-transparent text-text-2 hover:bg-accent-soft hover:text-accent',
  danger:
    'bg-error text-white hover:bg-error-strong',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-[15px]',
  lg: 'h-12 px-5 text-base',
}

const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ transitionDuration: 'var(--dur-base)', transitionTimingFunction: 'var(--ease)' }}
      {...rest}
    >
      {loading ? (
        <Spinner size={ICON_SIZE[size]} />
      ) : leftIcon ? (
        <Icon name={leftIcon} size={ICON_SIZE[size]} />
      ) : null}
      {children}
      {!loading && rightIcon ? <Icon name={rightIcon} size={ICON_SIZE[size]} /> : null}
    </button>
  )
})
