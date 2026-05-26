import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { StatusTimeline } from '@/components/licencia/StatusTimeline'
import { formatDate, formatSoles, daysUntil, isExpired } from '@/lib/utils/formatters'
import { FileText, Calendar, MapPin, Download, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Mi Panel' }

export default async function ContribuyenteDashboard() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Obtener perfil y solicitudes del contribuyente
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const profile = rawProfile as import('@/types/database.types').Profile | null

  const { data: rawApps } = await supabase
    .from('applications')
    .select('*, audit_log(*)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const applications = rawApps as (import('@/types/database.types').Application & { audit_log: import('@/types/database.types').AuditLog[] })[] | null

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola, {profile?.full_name ?? user.email?.split('@')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Panel de seguimiento de tus licencias municipales
        </p>
      </div>

      {/* Lista de solicitudes */}
      {!applications?.length ? (
        <Card className="text-center py-12">
          <FileText size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No tienes solicitudes registradas.</p>
          <Link
            href="/tramite"
            className="mt-4 inline-block text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            Iniciar trámite de licencia
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {applications.map(app => {
            const diasVig = daysUntil(app.expires_at)
            const vencida = isExpired(app.expires_at)
            const auditLogs = (app as any).audit_log ?? []

            return (
              <Card key={app.id} className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold text-white">{app.business_name}</h2>
                    <p className="text-sm text-slate-400">RUC {app.ruc}</p>
                    {app.tracking_code && (
                      <p className="text-xs font-mono text-amber-400 mt-1">
                        {app.tracking_code}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={app.status} pulse />
                </div>

                {/* Detalles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex gap-2">
                    <MapPin size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Domicilio</p>
                      <p className="text-slate-300">{app.fiscal_address}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Calendar size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Solicitud creada</p>
                      <p className="text-slate-300">{formatDate(app.created_at)}</p>
                    </div>
                  </div>

                  {/* Vigencia */}
                  {app.status === 'APROBADO' && app.expires_at && (
                    <div className={`flex gap-2 col-span-full rounded-xl p-3 ${vencida ? 'bg-red-500/10 border border-red-500/20' : diasVig && diasVig <= 30 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                      <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${vencida ? 'text-red-400' : 'text-amber-400'}`} />
                      <div>
                        <p className="text-xs text-slate-400">
                          {vencida
                            ? '⚠ Licencia VENCIDA — Requiere renovación'
                            : `Vigencia hasta ${formatDate(app.expires_at)} ${diasVig !== null ? `(${diasVig} días restantes)` : ''}`
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Observación deadline */}
                  {app.status === 'OBSERVADO' && app.observation_deadline && (
                    <div className="col-span-full bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                      <p className="text-xs text-orange-400">
                        <strong>Observado:</strong> {app.observation_notes ?? 'Ver comentarios del inspector.'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Plazo para subsanar: {formatDate(app.observation_deadline)} (30 días hábiles)
                      </p>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 flex-wrap">
                  {app.status === 'APROBADO' && (
                    <a
                      href={`/api/licencia/${app.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                      id={`btn-descargar-${app.id}`}
                    >
                      <Download size={14} />
                      Descargar Licencia
                    </a>
                  )}
                  {app.tracking_code && (
                    <a
                      href={`/verificar/${app.tracking_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition-colors"
                    >
                      Verificar QR
                    </a>
                  )}
                </div>

                {/* Timeline */}
                {auditLogs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                      Historial de estados
                    </p>
                    <StatusTimeline logs={auditLogs} />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
