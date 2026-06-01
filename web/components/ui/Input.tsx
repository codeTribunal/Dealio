'use client'
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Icon, type IconName } from '@/components/icons/Icon'

const FIELD_BASE =
  'w-full bg-surface border border-border rounded-md py-2.5 px-3.5 text-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: IconName
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, className = '', ...rest },
  ref,
) {
  if (leftIcon) {
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none">
          <Icon name={leftIcon} size={16} />
        </span>
        <input
          ref={ref}
          className={`${FIELD_BASE} pl-10 ${className}`}
          style={{ transitionDuration: 'var(--dur-base)' }}
          {...rest}
        />
      </div>
    )
  }
  return (
    <input
      ref={ref}
      className={`${FIELD_BASE} ${className}`}
      style={{ transitionDuration: 'var(--dur-base)' }}
      {...rest}
    />
  )
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = '', ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={`${FIELD_BASE} resize-none ${className}`}
      style={{ transitionDuration: 'var(--dur-base)' }}
      {...rest}
    />
  )
})
