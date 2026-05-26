'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatSoles } from '@/lib/utils/formatters'
import { LICENCIA_AMOUNT } from '@/lib/utils/stateMachine'
import { CreditCard, Shield, Building2, MapPin, FileText, ChevronRight } from 'lucide-react'

interface PaymentSummaryProps {
  applicationId: string
  businessName: string
  ruc: string
  address: string
  documentUploaded: boolean
}

export function PaymentSummary({
  applicationId,
  businessName,
  ruc,
  address,
  documentUploaded,
}: PaymentSummaryProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handlePay = async () => {
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('/api/mercadopago/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al generar el enlace de pago.')
        return
      }

      // Redirigir a Checkout Pro de Mercado Pago
      window.location.href = data.checkoutUrl
    } catch {
      setError('Error de red. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumen del negocio */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Resumen del trámite
        </h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <Building2 size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Negocio</p>
              <p className="text-sm font-semibold text-white">{businessName}</p>
              <p className="text-xs text-slate-400">RUC {ruc}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPin size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Domicilio fiscal</p>
              <p className="text-sm text-white">{address}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <FileText size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Plano del local</p>
              <p className={`text-sm ${documentUploaded ? 'text-emerald-400' : 'text-red-400'}`}>
                {documentUploaded ? '✓ Subido correctamente' : '✗ Pendiente de subida'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Detalle de pago */}
      <Card gold>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-slate-300">Licencia de Funcionamiento</span>
          <span className="text-xl font-bold gradient-text">{formatSoles(LICENCIA_AMOUNT)}</span>
        </div>
        <div className="border-t border-amber-500/20 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">TUPA — Derecho de trámite</span>
            <span className="text-white font-semibold">{formatSoles(LICENCIA_AMOUNT)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-400">IGV</span>
            <span className="text-slate-400">Incluido</span>
          </div>
        </div>
      </Card>

      {/* Seguridad */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Shield size={14} className="text-emerald-400" />
        <span>Pago procesado de forma segura por <strong className="text-slate-300">Mercado Pago</strong>. MPT no almacena datos de tu tarjeta.</span>
      </div>

      {error && (
        <p className="text-sm text-red-400 flex gap-2">
          <span>⚠</span> {error}
        </p>
      )}

      <Button
        onClick={handlePay}
        loading={loading}
        disabled={!documentUploaded}
        size="lg"
        className="w-full"
        id="btn-pagar-mercadopago"
        iconEnd={<ChevronRight size={18} />}
        icon={<CreditCard size={18} />}
      >
        {loading ? 'Redirigiendo a Mercado Pago...' : `Pagar ${formatSoles(LICENCIA_AMOUNT)} con Mercado Pago`}
      </Button>

      {!documentUploaded && (
        <p className="text-center text-xs text-slate-500">
          Debes subir el plano del local antes de proceder al pago.
        </p>
      )}
    </div>
  )
}
