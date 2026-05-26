'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Loader2, Copy, ExternalLink } from 'lucide-react'
import { type Application } from '@/types/database.types'

export default function PagoExitoContent() {
  const searchParams                          = useSearchParams()
  const router                                = useRouter()
  const [application, setApplication]        = useState<Application | null>(null)
  const [loading, setLoading]                = useState(true)
  const [copied, setCopied]                  = useState(false)

  useEffect(() => {
    const appId = sessionStorage.getItem('mpt_application_id')
    if (!appId) { router.replace('/tramite'); return }

    // Leer parámetros que Mercado Pago pasa en la redirect URL
    const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
    const mpStatus  = searchParams.get('status')

    const confirmPayment = async () => {
      if (paymentId) {
        // Llamar al backend para verificar el pago contra MP y actualizar DB
        const res = await fetch('/api/mercadopago/confirmar-pago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: appId, paymentId }),
        })
        const data = await res.json()
        if (data.confirmed && data.tracking_code) {
          const supabase = createSupabaseBrowserClient()
          const { data: app } = await supabase
            .from('applications')
            .select('*')
            .eq('id', appId)
            .single()
          setApplication(app as Application | null)
          setLoading(false)
          sessionStorage.removeItem('mpt_application_id')
          sessionStorage.removeItem('mpt_sunat_data')
          sessionStorage.removeItem('mpt_doc_url')
          return
        }
      }

      // Polling por si el webhook ya actualizó
      let attempts = 0
      const MAX_ATTEMPTS = 15

      const poll = async () => {
        attempts++
        const supabase = createSupabaseBrowserClient()
        const { data } = await supabase
          .from('applications')
          .select('*')
          .eq('id', appId)
          .single()

        const app = data as Application | null

        if (app?.status === 'PAGADO' || app?.tracking_code) {
          setApplication(app)
          setLoading(false)
          sessionStorage.removeItem('mpt_application_id')
          sessionStorage.removeItem('mpt_sunat_data')
          sessionStorage.removeItem('mpt_doc_url')
        } else if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, 2000)
        } else {
          // Timeout: intentar confirmación forzada por si el pago ya existía
          if (!paymentId) {
            const res = await fetch('/api/mercadopago/confirmar-pago', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ applicationId: appId }),
            })
            const data = await res.json()
            if (data.confirmed && data.tracking_code) {
              const supabase = createSupabaseBrowserClient()
              const { data: app } = await supabase
                .from('applications')
                .select('*')
                .eq('id', appId)
                .single()
              setApplication(app as Application | null)
            } else {
              setApplication(null)
            }
          } else {
            setApplication(null)
          }
          setLoading(false)
        }
      }

      setTimeout(poll, 2000)
    }

    confirmPayment()
  }, [router, searchParams])

  const copyCode = () => {
    if (application?.tracking_code) {
      navigator.clipboard.writeText(application.tracking_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-brand flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 text-center space-y-4">
          <Loader2 size={40} className="animate-spin text-amber-400 mx-auto" />
          <h2 className="text-lg font-semibold text-white">Confirmando tu pago...</h2>
          <p className="text-sm text-slate-400">
            Estamos esperando la confirmación de Mercado Pago. Esto puede tardar unos segundos.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-brand flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">
        {/* Éxito */}
        <div className="text-center space-y-3">
          <div className="animate-float">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center animate-glow">
              <CheckCircle size={40} className="text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">¡Pago exitoso!</h1>
          <p className="text-slate-400">
            Tu solicitud de licencia ha sido registrada y está siendo procesada.
          </p>
        </div>

        {/* Código de seguimiento */}
        {application?.tracking_code && (
          <Card gold className="text-center space-y-3">
            <p className="text-sm text-slate-400">Tu código de seguimiento</p>
            <div className="text-3xl font-bold tracking-widest gradient-text">
              {application.tracking_code}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={copyCode}
              icon={<Copy size={14} />}
              id="btn-copiar-codigo"
            >
              {copied ? '¡Copiado!' : 'Copiar código'}
            </Button>
            <p className="text-xs text-slate-500">
              Guarda este código. Con él podrás consultar el estado de tu licencia.
            </p>
          </Card>
        )}

        {/* Info de negocio */}
        {application && (
          <Card>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Negocio</span>
                <span className="text-white font-medium">{application.business_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RUC</span>
                <span className="text-white">{application.ruc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estado</span>
                <span className="text-blue-400 font-medium">Pago confirmado — en cola de inspección</span>
              </div>
            </div>
          </Card>
        )}

        {/* Próximos pasos */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">¿Qué sigue?</h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2"><span className="text-amber-400 font-bold">1.</span> Un inspector municipal será asignado a tu solicitud.</li>
            <li className="flex gap-2"><span className="text-amber-400 font-bold">2.</span> Recibirás la fecha de la visita de inspección al local.</li>
            <li className="flex gap-2"><span className="text-amber-400 font-bold">3.</span> Si todo está en orden, se emite tu licencia digital con QR.</li>
          </ol>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => router.push(`/verificar/${application?.tracking_code}`)}
            icon={<ExternalLink size={16} />}
            id="btn-ver-estado"
          >
            Ver estado público
          </Button>
          <Button
            className="flex-1"
            onClick={() => router.push('/auth/login')}
            id="btn-ingresar-dashboard"
          >
            Ingresar a mi panel
          </Button>
        </div>
      </div>
    </div>
  )
}
