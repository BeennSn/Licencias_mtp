'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RucForm } from '@/components/tramite/RucForm'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { type SunatValidationResult } from '@/types/sunat.types'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ChevronRight, Info } from 'lucide-react'

export default function TramitePage() {
  const router = useRouter()
  const [sunatResult, setSunatResult] = useState<SunatValidationResult | null>(null)
  const [creating, setCreating]       = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const handleRucSuccess = (result: SunatValidationResult) => {
    setSunatResult(result)
  }

  const handleContinue = async () => {
    if (!sunatResult?.data) return
    setCreating(true)
    setError(null)

    try {
      const supabase = createSupabaseBrowserClient()
      const d        = sunatResult.data

      // Crear la solicitud en estado PENDIENTE_PAGO (sin user_id, flujo sin login)
      const { data: application, error: dbError } = await supabase
        .from('applications')
        .insert({
          ruc:                d.ruc,
          business_name:      d.razonSocial,
          fiscal_address:     d.direccion,
          economic_activity:  d.actividadEconomica ?? null,
          business_type:      d.tipoContribuyente ?? null,
          status:             'PENDIENTE_PAGO',
          user_id:            null,
        })
        .select('id')
        .single()

      if (dbError) throw dbError

      // Guardar el ID en sessionStorage para persistir entre pasos
      sessionStorage.setItem('mpt_application_id', application.id)
      sessionStorage.setItem('mpt_sunat_data', JSON.stringify(sunatResult.data))

      router.push('/tramite/documentos')
    } catch (err) {
      console.error(err)
      setError('Error al registrar tu solicitud. Por favor intenta nuevamente.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Encabezado del paso */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold gradient-text">Paso 1: Validación de RUC</h1>
        <p className="text-slate-400 text-sm">
          Ingresa tu RUC para verificar que tu negocio está habilitado en la Provincia de Trujillo.
        </p>
      </div>

      {/* Info rápida */}
      <Card className="flex gap-3">
        <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-400 space-y-1">
          <p>Para obtener la licencia tu RUC debe cumplir con:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Estado <span className="text-emerald-400 font-medium">ACTIVO</span> en SUNAT</li>
            <li>Condición <span className="text-emerald-400 font-medium">HABIDO</span> en SUNAT</li>
            <li>Domicilio fiscal en la <span className="text-amber-400 font-medium">Provincia de Trujillo</span></li>
          </ul>
        </div>
      </Card>

      {/* Formulario */}
      <RucForm onSuccess={handleRucSuccess} />

      {/* Botón continuar */}
      {sunatResult?.valid && (
        <div className="space-y-2">
          {error && <p className="text-red-400 text-sm text-center">⚠ {error}</p>}
          <Button
            onClick={handleContinue}
            loading={creating}
            size="lg"
            className="w-full"
            id="btn-continuar-paso2"
            iconEnd={<ChevronRight size={18} />}
          >
            {creating ? 'Registrando solicitud...' : 'Continuar — Subir Plano'}
          </Button>
        </div>
      )}
    </div>
  )
}
