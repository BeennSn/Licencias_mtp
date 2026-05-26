'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentUploader } from '@/components/tramite/DocumentUploader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChevronRight, ChevronLeft, FileText } from 'lucide-react'

export default function DocumentosPage() {
  const router           = useRouter()
  const [appId, setAppId]         = useState<string | null>(null)
  const [uploaded, setUploaded]   = useState(false)
  const [docUrl, setDocUrl]       = useState<string | null>(null)

  useEffect(() => {
    const id = sessionStorage.getItem('mpt_application_id')
    if (!id) {
      // Sin ID de solicitud → volver al inicio del trámite
      router.replace('/tramite')
      return
    }
    setAppId(id)
  }, [router])

  if (!appId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold gradient-text">Paso 2: Documentación del Local</h1>
        <p className="text-slate-400 text-sm">
          Sube el plano de ubicación o croquis del establecimiento para continuar con el trámite.
        </p>
      </div>

      {/* Instrucciones */}
      <Card>
        <div className="flex gap-3">
          <FileText size={20} className="text-amber-400 shrink-0" />
          <div className="text-sm space-y-2">
            <p className="font-semibold text-white">Requisitos del documento</p>
            <ul className="text-slate-400 space-y-1 text-xs list-disc list-inside">
              <li>Plano de distribución del establecimiento (escala 1:50 o 1:100)</li>
              <li>Debe mostrar medidas, áreas y accesos</li>
              <li>Formatos aceptados: PDF, JPG o PNG</li>
              <li>Tamaño máximo: 10 MB</li>
              <li>El documento será revisado por el inspector municipal</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Uploader */}
      <DocumentUploader
        applicationId={appId}
        onSuccess={(url) => {
          setDocUrl(url)
          setUploaded(true)
          sessionStorage.setItem('mpt_doc_url', url)
        }}
      />

      {/* Navegación */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          icon={<ChevronLeft size={16} />}
          id="btn-volver-paso1"
        >
          Volver
        </Button>
        <Button
          disabled={!uploaded}
          onClick={() => router.push('/tramite/pago')}
          size="lg"
          className="flex-1"
          id="btn-continuar-paso3"
          iconEnd={<ChevronRight size={18} />}
        >
          Continuar — Pago
        </Button>
      </div>
    </div>
  )
}
