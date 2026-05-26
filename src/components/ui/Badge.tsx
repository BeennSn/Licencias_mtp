import clsx from 'clsx'
import { type ApplicationStatus } from '@/types/database.types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/stateMachine'

interface BadgeProps {
  status: ApplicationStatus
  size?: 'sm' | 'md'
  pulse?: boolean
}

export function StatusBadge({ status, size = 'md', pulse = false }: BadgeProps) {
  const colors = STATUS_COLORS[status]

  const isActive = ['PAGADO', 'EN_INSPECCION', 'SEGUNDA_INSPECCION'].includes(status)

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        colors.bg,
        colors.text,
        colors.border,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <span
        className={clsx(
          'rounded-full',
          colors.dot,
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
          (pulse || isActive) && 'animate-pulse'
        )}
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
