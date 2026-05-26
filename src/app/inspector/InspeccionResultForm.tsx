'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface InspeccionResultFormProps {
  inspectionId: string
  applicationId: string
  attemptNumber: number
}

type ResultType = 'APROBADO' | 'OBSERVADO' | 'NEGADO_DEFINITIVO'

export default function InspeccionResultForm({
  inspectionId,
  applicationId,
  attemptNumber,
}: InspeccionResultFormProps) {
  const router              = useRouter()
  const [result, setResult] = useState<ResultType | null>(null)
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // En la 2da visita no puede haber OBSERVADO — solo APROBADO o NEGADO
  const options = attemptNumber === 1
    ? ['APROBADO', 'OBSERVADO', 'NEGADO_DEFINITIVO'] as ResultType[]
    : ['APROBADO', 'NEGADO_DEFINITIVO'] as ResultType[]

  const handleSubmit = async () => {
    if (!result) return
    if (result === 'OBSERVADO' && !comments.trim()) {
      setError('Debes escribir las observaciones para que el contribuyente pueda subsanarlas.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createSupabaseBrowserClient()

      // 1. Registrar resultado en la inspección
      const { error: inspErr } = await supabase
        .from('inspections')
        .update({
          result,
          comments: comments || null,
          conducted_at: new Date().toISOString(),
        })
        .eq('id', inspectionId)

      if (inspErr) throw inspErr

      // 2. Actualizar el estado de la solicitud
      // El trigger SQL se encargará de calcular el deadline si es OBSERVADO
      const newStatus =
        result === 'APROBADO'          ? 'APROBADO'          :
        result === 'OBSERVADO'         ? 'OBSERVADO'         :
                                         'NEGADO_DEFINITIVO'

      const updateData: Record<string, string> = {
        status: newStatus,
      }
      if (result === 'OBSERVADO') {
        updateData.observation_notes = comments
      }

      const { error: appErr } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId)

      if (appErr) throw appErr

      setDone(true)
      setTimeout(() => router.refresh(), 1500)
    } catch (err) {
      console.error(err)
      setError('Error al guardar el resultado. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
        <CheckCircle size={20} className="text-emerald-400 mx-auto mb-1" />
        <p className="text-sm text-emerald-300 font-medium">Resultado guardado correctamente</p>
      </div>
    )
  }

  const RESULT_CONFIG = {
    APROBADO:          { icon: <CheckCircle size={16} />, label: 'Aprobar',   color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
    OBSERVADO:         { icon: <AlertTriangle size={16} />, label: 'Observar', color: 'border-orange-500/40 bg-orange-500/10 text-orange-400' },
    NEGADO_DEFINITIVO: { icon: <XCircle size={16} />, label: 'Negar',        color: 'border-red-500/40 bg-red-500/10 text-red-400' },
  }

  return (
    <div className="border-t border-white/10 pt-4 space-y-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Resultado de la inspección
      </p>

      {/* Selector de resultado */}
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => {
          const cfg = RESULT_CONFIG[opt]
          return (
            <button
              key={opt}
              onClick={() => setResult(opt)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                result === opt
                  ? cfg.color + ' ring-2 ring-white/20'
                  : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
              }`}
              id={`btn-resultado-${opt.toLowerCase()}`}
            >
              {cfg.icon}
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Observaciones (obligatorio si OBSERVADO) */}
      {(result === 'OBSERVADO' || result === 'NEGADO_DEFINITIVO') && (
        <div>
          <label className="text-xs text-slate-400 block mb-1">
            Observaciones / motivo de negativa
            {result === 'OBSERVADO' && <span className="text-amber-400"> *</span>}
          </label>
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Describe las observaciones que el contribuyente debe subsanar..."
            rows={3}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-400">⚠ {error}</p>}

      <Button
        onClick={handleSubmit}
        loading={saving}
        disabled={!result}
        size="md"
        id={`btn-guardar-inspeccion-${inspectionId}`}
      >
        Guardar resultado
      </Button>
    </div>
  )
}
