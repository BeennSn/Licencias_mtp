import { type ApplicationStatus } from '@/types/database.types'

// ─── Etiquetas y colores por estado ──────────────────────────────────────────

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDIENTE_PAGO:       'Pendiente de Pago',
  PAGADO:               'Pago Confirmado',
  EN_INSPECCION:        'En Inspección',
  APROBADO:             'Aprobado',
  OBSERVADO:            'Observado',
  SEGUNDA_INSPECCION:   'Segunda Inspección',
  NEGADO_DEFINITIVO:    'Negado Definitivamente',
  RENOVACION_PENDIENTE: 'Renovación Pendiente',
}

export const STATUS_COLORS: Record<ApplicationStatus, {
  bg: string; text: string; border: string; dot: string
}> = {
  PENDIENTE_PAGO:       { bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30',  dot: 'bg-amber-400'  },
  PAGADO:               { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30',   dot: 'bg-blue-400'   },
  EN_INSPECCION:        { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  APROBADO:             { bg: 'bg-emerald-500/15',text: 'text-emerald-400',border: 'border-emerald-500/30',dot: 'bg-emerald-400'},
  OBSERVADO:            { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  SEGUNDA_INSPECCION:   { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   border: 'border-cyan-500/30',   dot: 'bg-cyan-400'   },
  NEGADO_DEFINITIVO:    { bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30',    dot: 'bg-red-400'    },
  RENOVACION_PENDIENTE: { bg: 'bg-pink-500/15',   text: 'text-pink-400',   border: 'border-pink-500/30',   dot: 'bg-pink-400'   },
}

// Orden de la máquina de estados para el timeline
export const STATUS_ORDER: ApplicationStatus[] = [
  'PENDIENTE_PAGO',
  'PAGADO',
  'EN_INSPECCION',
  'APROBADO',
  'OBSERVADO',
  'SEGUNDA_INSPECCION',
  'NEGADO_DEFINITIVO',
  'RENOVACION_PENDIENTE',
]

export const TERMINAL_STATES: ApplicationStatus[] = [
  'APROBADO',
  'NEGADO_DEFINITIVO',
]

export const INSPECTION_STATES: ApplicationStatus[] = [
  'EN_INSPECCION',
  'OBSERVADO',
  'SEGUNDA_INSPECCION',
]

// Pasos del flujo del trámite (para el Stepper visual)
export const TRAMITE_STEPS = [
  { id: 1, label: 'Validar RUC',    description: 'Consulta SUNAT' },
  { id: 2, label: 'Subir Plano',    description: 'Documento del local' },
  { id: 3, label: 'Pagar Licencia', description: 'S/. 0.50 — Mercado Pago' },  // CAMBIAR A 180.00
] as const

export const LICENCIA_AMOUNT = 0.50 // CAMBIAR A 180.00 CUANDO VAYAS A PRODUCCIÓN REAL
