'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { YapePayment } from '@/components/tramite/YapePayment'
import { formatSoles } from '@/lib/utils/formatters'
import { LICENCIA_AMOUNT } from '@/lib/utils/stateMachine'
import { CreditCard, Shield, Building2, MapPin, FileText, Smartphone, ChevronRight } from 'lucide-react'

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
  const router = useRouter()
  const [method, setMethod] = useState<'checkout' | 'yape' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckoutRedirect = async () => {
    setLoading(true)
    setError(null)
    setMethod('checkout')

    try {
      const res = await fetch('/api/mercadopago/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al generar el enlace de pago.')
        setMethod(null)
        return
      }

      window.location.href = data.checkoutUrl
    } catch {
      setError('Error de red. Por favor intenta nuevamente.')
      setMethod(null)
    } finally {
      setLoading(false)
    }
  }

  const handleYapeSuccess = (trackingCode: string) => {
    sessionStorage.removeItem('mpt_application_id')
    sessionStorage.removeItem('mpt_sunat_data')
    sessionStorage.removeItem('mpt_doc_url')

    setTimeout(() => {
      router.push(`/verificar/${trackingCode}`)
    }, 2500)
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

      {/* Métodos de pago */}
      {method === 'yape' ? (
        <YapePayment
          applicationId={applicationId}
          businessName={businessName}
          onSuccess={handleYapeSuccess}
          onBack={() => setMethod(null)}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Selecciona un método de pago
          </p>

          <Button
            onClick={handleCheckoutRedirect}
            loading={loading && method === 'checkout'}
            disabled={!documentUploaded}
            size="lg"
            className="w-full"
            id="btn-pagar-mercadopago"
            iconEnd={<ChevronRight size={18} />}
            icon={<CreditCard size={18} />}
          >
            {loading && method === 'checkout'
              ? 'Redirigiendo a Mercado Pago...'
              : 'Tarjeta crédito/débito — Mercado Pago'}
          </Button>

          <Button
            onClick={() => setMethod('yape')}
            disabled={!documentUploaded}
            size="lg"
            variant="secondary"
            className="w-full"
            id="btn-pagar-yape"
            iconEnd={<ChevronRight size={18} />}
            icon={<Smartphone size={18} />}
          >
            Yape — Código QR
          </Button>

          {!documentUploaded && (
            <p className="text-center text-xs text-slate-500">
              Debes subir el plano del local antes de proceder al pago.
            </p>
          )}
        </div>
      )}

      {/* Seguridad */}
      {method !== 'yape' && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield size={14} className="text-emerald-400" />
          <span>Pago procesado de forma segura por <strong className="text-slate-300">Mercado Pago</strong>. MPT no almacena datos de tu tarjeta.</span>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 flex gap-2">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
