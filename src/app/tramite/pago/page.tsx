'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentSummary } from '@/components/tramite/PaymentSummary'
import { type SunatRucResponse } from '@/types/sunat.types'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function PagoPage() {
  const router = useRouter()
  const [appId, setAppId]         = useState<string | null>(null)
  const [sunatData, setSunatData] = useState<SunatRucResponse | null>(null)
  const [docUrl, setDocUrl]       = useState<string | null>(null)

  useEffect(() => {
    const id   = sessionStorage.getItem('mpt_application_id')
    const data = sessionStorage.getItem('mpt_sunat_data')
    const doc  = sessionStorage.getItem('mpt_doc_url')

    if (!id || !data) {
      router.replace('/tramite')
      return
    }

    setAppId(id)
    setSunatData(JSON.parse(data))
    setDocUrl(doc)
  }, [router])

  if (!appId || !sunatData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold gradient-text">Paso 3: Pago de la Licencia</h1>
        <p className="text-slate-400 text-sm">
          Revisa el resumen y procede al pago seguro con Mercado Pago.
          Al completar el pago se generará tu código de seguimiento.
        </p>
      </div>

      <PaymentSummary
        applicationId={appId}
        businessName={sunatData.razonSocial}
        ruc={sunatData.ruc}
        address={sunatData.direccion}
        documentUploaded={!!docUrl}
      />

      <Button
        variant="ghost"
        onClick={() => router.back()}
        icon={<ChevronLeft size={16} />}
        id="btn-volver-paso2"
      >
        Volver a documentos
      </Button>
    </div>
  )
}
