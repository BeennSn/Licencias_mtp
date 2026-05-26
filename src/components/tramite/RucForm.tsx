'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { type SunatValidationResult } from '@/types/sunat.types'
import { isValidRucFormat } from '@/lib/utils/formatters'
import { Search, Building2, MapPin, Activity, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface RucFormProps {
  onSuccess: (result: SunatValidationResult) => void
}

export function RucForm({ onSuccess }: RucFormProps) {
  const [ruc, setRuc]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<SunatValidationResult | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!isValidRucFormat(ruc)) {
      setError('Ingresa un RUC válido de 11 dígitos (empieza en 10 o 20).')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch(`/api/sunat?ruc=${ruc}`)
      const data = await res.json() as SunatValidationResult & { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Error al consultar SUNAT.')
        return
      }

      setResult(data)
      if (data.valid) {
        onSuccess(data)
      }
    } catch {
      setError('Error de red. Verifica tu conexión e intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="ruc-input"
          label="Número de RUC"
          type="text"
          inputMode="numeric"
          maxLength={11}
          placeholder="Ej: 20131369477"
          value={ruc}
          onChange={e => setRuc(e.target.value.replace(/\D/g, ''))}
          error={error ?? undefined}
          hint="RUC de 11 dígitos registrado en SUNAT con domicilio en la Provincia de Trujillo."
          icon={<Search size={16} />}
          required
        />
        <Button
          type="submit"
          size="lg"
          loading={loading}
          className="w-full"
          id="btn-consultar-ruc"
        >
          {loading ? 'Consultando SUNAT...' : 'Consultar RUC en SUNAT'}
        </Button>
      </form>

      {/* Resultado */}
      {result && !result.valid && (
        <Card className="border-red-500/30 bg-red-500/10">
          <div className="flex gap-3">
            <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300 text-sm">RUC no habilitado</p>
              <p className="text-red-400/80 text-sm mt-1">{result.error}</p>
            </div>
          </div>
        </Card>
      )}

      {result?.valid && result.data && (
        <SunatResultCard data={result} />
      )}
    </div>
  )
}

function SunatResultCard({ data }: { data: SunatValidationResult }) {
  if (!data.data) return null
  const d = data.data

  return (
    <Card gold className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <CheckCircle size={20} className="text-emerald-400" />
        <h3 className="font-semibold text-emerald-300">RUC Válido — Puede continuar</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex gap-3">
          <Building2 size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Razón Social</p>
            <p className="text-sm font-semibold text-white">{d.razonSocial}</p>
            {d.nombreComercial && (
              <p className="text-xs text-slate-400">"{d.nombreComercial}"</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <MapPin size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Domicilio Fiscal</p>
            <p className="text-sm font-semibold text-white">{d.direccion}</p>
            <p className="text-xs text-slate-400">{d.distrito}, {d.provincia}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Activity size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Actividad Económica</p>
            <p className="text-sm font-semibold text-white">{d.actividadEconomica || '—'}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-400">Estado / Condición</p>
            <div className="flex gap-2 mt-0.5">
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                {d.estadoContribuyente}
              </span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                {d.condicionContribuyente}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
