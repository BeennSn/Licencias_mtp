import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  gold?: boolean
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function Card({ children, className, gold = false, hover = false, padding = 'md' }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl',
        gold ? 'glass-gold' : 'glass',
        hover && 'glass-hover cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl',
        padding === 'sm'  && 'p-4',
        padding === 'md'  && 'p-6',
        padding === 'lg'  && 'p-8',
        padding === 'none' && '',
        className
      )}
    >
      {children}
    </div>
  )
}
