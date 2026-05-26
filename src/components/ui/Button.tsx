'use client'

import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconEnd?: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconEnd,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Variantes
        variant === 'primary' && [
          'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900',
          'hover:from-amber-400 hover:to-amber-300 hover:shadow-[0_0_24px_rgba(245,158,11,0.5)]',
          'active:scale-[0.98]',
        ],
        variant === 'secondary' && [
          'glass border border-white/10 text-white',
          'hover:border-amber-500/40 hover:bg-white/10',
          'active:scale-[0.98]',
        ],
        variant === 'ghost' && [
          'text-slate-400 hover:text-white hover:bg-white/5',
        ],
        variant === 'danger' && [
          'bg-red-500/20 border border-red-500/30 text-red-400',
          'hover:bg-red-500/30 hover:border-red-400',
          'active:scale-[0.98]',
        ],
        // Tamaños
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-5 py-2.5 text-sm',
        size === 'lg' && 'px-8 py-4 text-base',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconEnd && !loading && <span className="shrink-0">{iconEnd}</span>}
    </button>
  )
}
