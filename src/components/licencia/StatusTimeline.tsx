import { type AuditLog } from '@/types/database.types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/stateMachine'
import { formatDateTime } from '@/lib/utils/formatters'
import clsx from 'clsx'

interface StatusTimelineProps {
  logs: AuditLog[]
}

export function StatusTimeline({ logs }: StatusTimelineProps) {
  if (!logs.length) {
    return <p className="text-sm text-slate-500 italic">Sin movimientos registrados aún.</p>
  }

  const sorted = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <ol className="relative space-y-0">
      {sorted.map((log, idx) => {
        const colors   = STATUS_COLORS[log.new_status]
        const isLast   = idx === sorted.length - 1

        return (
          <li key={log.id} className="relative flex gap-4 pb-6">
            {/* Línea vertical */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-white/10" />
            )}

            {/* Nodo */}
            <div className={clsx(
              'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
              colors.bg, colors.border
            )}>
              <div className={clsx('h-2.5 w-2.5 rounded-full', colors.dot, isLast && 'animate-pulse')} />
            </div>

            {/* Contenido */}
            <div className="flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <span className={clsx('text-sm font-semibold', colors.text)}>
                  {STATUS_LABELS[log.new_status]}
                </span>
                <span className="text-xs text-slate-500 shrink-0">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
              {log.previous_status && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Anterior: {STATUS_LABELS[log.previous_status]}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
