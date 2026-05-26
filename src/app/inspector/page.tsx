import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils/formatters'
import { Calendar, FileText, User, Clock } from 'lucide-react'
import InspeccionResultForm from './InspeccionResultForm'

export const metadata: Metadata = { title: 'Panel Inspector' }

export default async function InspectorDashboard() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verificar rol
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user!.id)
    .single()

  const profile = rawProfile as { role: string; full_name: string | null } | null

  if (profile?.role !== 'inspector' && profile?.role !== 'admin') {
    redirect('/contribuyente')
  }

  // Obtener inspecciones del inspector usando la vista
  const { data: rawInspections } = await supabase
    .from('inspector_dashboard')
    .select('*')
    .order('scheduled_date', { ascending: true })

  type InspRow = {
    inspection_id: string
    application_id: string
    scheduled_date: string
    attempt_number: number
    result: string | null
    tracking_code: string
    business_name: string
    fiscal_address: string
    document_url: string | null
    application_status: import('@/types/database.types').ApplicationStatus
    contribuyente_name: string | null
    contribuyente_phone: string | null
  }
  const inspections = rawInspections as InspRow[] | null

  const pending   = inspections?.filter(i => !i.result) ?? []
  const completed = inspections?.filter(i => i.result) ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Panel de Inspector
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {profile?.full_name ?? user!.email} — {pending.length} inspección(es) pendiente(s)
        </p>
      </div>

      {/* Inspecciones pendientes */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock size={14} className="text-amber-400" />
          Pendientes ({pending.length})
        </h2>

        {!pending.length ? (
          <Card className="text-center py-8">
            <Calendar size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No tienes inspecciones pendientes.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {pending.map(insp => (
              <Card key={insp.inspection_id} className="space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-white">{insp.business_name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{insp.tracking_code}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-1 rounded-full">
                      Visita #{insp.attempt_number}
                    </span>
                    <StatusBadge status={insp.application_status} size="sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex gap-2">
                    <Calendar size={14} className="text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Fecha programada</p>
                      <p className="text-white font-medium">{formatDate(insp.scheduled_date)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <FileText size={14} className="text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Dirección</p>
                      <p className="text-slate-300">{insp.fiscal_address}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <User size={14} className="text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Contribuyente</p>
                      <p className="text-slate-300">
                        {insp.contribuyente_name ?? '—'}
                        {insp.contribuyente_phone && (
                          <span className="text-slate-500"> · {insp.contribuyente_phone}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {insp.document_url && (
                    <div>
                      <a
                        href={insp.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
                      >
                        📄 Ver plano del local
                      </a>
                    </div>
                  )}
                </div>

                {/* Formulario de resultado */}
                <InspeccionResultForm
                  inspectionId={insp.inspection_id}
                  applicationId={insp.application_id}
                  attemptNumber={insp.attempt_number}
                />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Inspecciones completadas */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Completadas ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map(insp => (
              <Card key={insp.inspection_id} className="flex items-center justify-between gap-3 flex-wrap py-4">
                <div>
                  <p className="text-sm font-semibold text-white">{insp.business_name}</p>
                  <p className="text-xs text-slate-500">{formatDate(insp.scheduled_date)} — Visita #{insp.attempt_number}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                    insp.result === 'APROBADO'         ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                    insp.result === 'OBSERVADO'        ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'   :
                    insp.result === 'NEGADO_DEFINITIVO'? 'bg-red-500/15 text-red-400 border-red-500/30' : ''
                  }`}>
                    {insp.result}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
