import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate, formatSoles } from '@/lib/utils/formatters'
import { STATUS_LABELS } from '@/lib/utils/stateMachine'
import { type ApplicationStatus, type Application } from '@/types/database.types'
import {
  BarChart3, Users, FileCheck, Clock,
  Filter, Calendar
} from 'lucide-react'

export const metadata: Metadata = { title: 'Panel Administrativo' }

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const params   = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // TypeScript non-null assertion: redirect() throws, so user is always defined here
  const userId = user!.id

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if ((profile as { role: string } | null)?.role !== 'admin') redirect('/contribuyente')

  // Métricas
  const { data: rawApps } = await supabase
    .from('applications')
    .select('id, status, payment_amount, created_at')

  const allApps = rawApps as Array<Pick<Application, 'id' | 'status' | 'payment_amount' | 'created_at'>> | null

  const total     = allApps?.length ?? 0
  const aprobados = allApps?.filter(a => a.status === 'APROBADO').length ?? 0
  const enCurso   = allApps?.filter(a => ['EN_INSPECCION','SEGUNDA_INSPECCION','OBSERVADO','PAGADO'].includes(a.status)).length ?? 0
  const recaudado = allApps?.filter(a => a.status !== 'PENDIENTE_PAGO')
    .reduce((sum, a) => sum + (a.payment_amount ?? 0), 0) ?? 0

  // Solicitudes filtradas
  // Solicitudes filtradas (raw query built above)
  let query = supabase
    .from('applications')
    .select('id, ruc, business_name, fiscal_address, status, tracking_code, created_at, paid_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (params.status) query = query.eq('status', params.status as ApplicationStatus)
  if (params.q)      query = query.ilike('business_name', `%${params.q}%`)

  // Inspectores disponibles
  const { data: rawInspectors } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'inspector')

  const inspectors = rawInspectors as Array<{ id: string; full_name: string | null; email: string }> | null

  // Solicitudes filtradas
  const { data: rawApplications } = await query
  const applications = rawApplications as Array<Pick<Application, 'id' | 'ruc' | 'business_name' | 'fiscal_address' | 'status' | 'tracking_code' | 'created_at' | 'paid_at'>> | null

  const STATUSES = Object.entries(STATUS_LABELS) as [ApplicationStatus, string][]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Panel Administrativo</h1>
        <p className="text-slate-400 text-sm">Gestión de licencias — Municipalidad Provincial de Trujillo</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total solicitudes', value: total,                     icon: <FileCheck size={20} />, color: 'text-blue-400'    },
          { label: 'Aprobadas',         value: aprobados,                 icon: <BarChart3 size={20} />, color: 'text-emerald-400' },
          { label: 'En trámite',        value: enCurso,                   icon: <Clock size={20} />,     color: 'text-amber-400'   },
          { label: 'Recaudado',         value: formatSoles(recaudado),    icon: <Users size={20} />,     color: 'text-violet-400'  },
        ].map(m => (
          <Card key={m.label} className="space-y-1">
            <div className={m.color}>{m.icon}</div>
            <p className="text-2xl font-bold text-white">{m.value}</p>
            <p className="text-xs text-slate-500">{m.label}</p>
          </Card>
        ))}
      </div>

      {/* Inspectores registrados */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users size={14} className="text-amber-400" />
          Inspectores ({inspectors?.length ?? 0})
        </h2>
        {!inspectors?.length ? (
          <p className="text-sm text-slate-500">No hay inspectores registrados.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {inspectors.map(i => (
              <span key={i.id} className="text-xs bg-violet-500/15 border border-violet-500/30 text-violet-300 px-3 py-1 rounded-full">
                {i.full_name ?? i.email}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Solicitudes */}
      <Card padding="none">
        {/* Filtros */}
        <div className="flex gap-3 flex-wrap p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter size={14} className="text-amber-400" />
            <span>Filtros:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href="/admin"
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${!params.status ? 'border-amber-500/50 bg-amber-500/20 text-amber-400' : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
            >
              Todos
            </a>
            {STATUSES.map(([s, label]) => (
              <a
                key={s}
                href={`/admin?status=${s}`}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${params.status === s ? 'border-amber-500/50 bg-amber-500/20 text-amber-400' : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Negocio / RUC</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Código</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Estado</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Fecha</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {applications?.map(app => (
                <tr key={app.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{app.business_name}</p>
                    <p className="text-xs text-slate-500">{app.ruc}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-amber-400">
                      {app.tracking_code ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(app.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {app.status === 'PAGADO' && (
                        <AsignarInspectorButton
                          applicationId={app.id}
                          inspectors={inspectors ?? []}
                        />
                      )}
                      {app.tracking_code && (
                        <a
                          href={`/verificar/${app.tracking_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Ver
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!applications?.length && (
            <p className="text-center py-8 text-slate-500 text-sm">
              No se encontraron solicitudes con los filtros aplicados.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}

// Componente inline para asignar inspector (simplificado para MVP)
function AsignarInspectorButton({
  applicationId,
  inspectors,
}: {
  applicationId: string
  inspectors: { id: string; full_name: string | null; email: string }[]
}) {
  return (
    <span className="text-xs text-violet-400 cursor-pointer hover:text-violet-300"
          title="Funcionalidad completa en el panel de asignación">
      + Asignar inspector
    </span>
  )
}
