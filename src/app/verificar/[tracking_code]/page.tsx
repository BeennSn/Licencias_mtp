import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { formatDate, isExpired, daysUntil } from '@/lib/utils/formatters'
import { CheckCircle, XCircle, Clock, Shield, MapPin, Building2, Calendar, ExternalLink } from 'lucide-react'

type Props = { params: Promise<{ tracking_code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tracking_code } = await params
  return {
    title: `Verificar Licencia ${tracking_code}`,
    description: `Verificación pública de la licencia municipal ${tracking_code} — Municipalidad Provincial de Trujillo.`,
  }
}

export default async function VerificarPage({ params }: Props) {
  const { tracking_code } = await params
  const supabase = await createSupabaseServerClient()

  const { data: license } = await supabase
    .from('license_verification')
    .select('*')
    .eq('tracking_code', tracking_code.toUpperCase())
    .single()

  const expired = license ? isExpired(license.expires_at) : false
  const dias    = license ? daysUntil(license.expires_at) : null

  const isValid = license && !expired

  return (
    <div className="min-h-screen gradient-brand flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">
        {/* Header MPT */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/30">
              <span className="text-2xl">🏛️</span>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-400">Municipalidad Provincial de</p>
              <p className="font-bold text-white">Trujillo</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">Verificación de Licencia de Funcionamiento</p>
        </div>

        {/* Resultado */}
        {!license ? (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-8 text-center space-y-3">
            <XCircle size={48} className="text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-red-300">Licencia no encontrada</h1>
            <p className="text-sm text-slate-400">
              El código <strong className="text-white">{tracking_code}</strong> no corresponde a ninguna licencia aprobada.
            </p>
            <p className="text-xs text-slate-500">
              Verifica el código e intenta nuevamente, o contáctate con la MPT.
            </p>
          </div>
        ) : (
          <>
            {/* Estado visual */}
            <div className={`rounded-2xl border p-6 text-center space-y-3 ${
              isValid
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex justify-center">
                {isValid
                  ? <CheckCircle size={56} className="text-emerald-400 animate-glow" />
                  : <XCircle    size={56} className="text-red-400" />
                }
              </div>
              <div>
                <p className={`text-xl font-bold ${isValid ? 'text-emerald-300' : 'text-red-300'}`}>
                  {isValid ? '✓ Licencia VÁLIDA' : '✗ Licencia VENCIDA'}
                </p>
                <p className="font-mono text-lg text-white mt-1">{license.tracking_code}</p>
              </div>
              {isValid && dias !== null && (
                <p className="text-xs text-slate-400">
                  {dias > 30
                    ? `Vigente por ${dias} días más`
                    : <span className="text-amber-400 font-medium">⚠ Vence en {dias} días — Renovación pronto</span>
                  }
                </p>
              )}
            </div>

            {/* Datos del negocio */}
            <div className="rounded-2xl glass border border-white/10 p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                <Shield size={14} className="text-amber-400" />
                Datos del establecimiento
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <Building2 size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Razón Social</p>
                    <p className="font-semibold text-white">{license.business_name}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Domicilio del establecimiento</p>
                    <p className="text-slate-300">{license.fiscal_address}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Calendar size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Aprobada el</p>
                    <p className="text-slate-300">{formatDate(license.approved_at)}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock size={14} className={`mt-0.5 shrink-0 ${expired ? 'text-red-400' : 'text-emerald-400'}`} />
                  <div>
                    <p className="text-xs text-slate-500">Vigente hasta</p>
                    <p className={`font-semibold ${expired ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatDate(license.expires_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Nota legal */}
            <p className="text-center text-xs text-slate-600">
              Esta verificación es emitida por la Municipalidad Provincial de Trujillo.
              Para consultas, visita la Gerencia de Desarrollo Económico Local o llama al (044) 29-2400.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
