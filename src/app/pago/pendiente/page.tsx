import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Clock, AlertTriangle } from 'lucide-react'

export default function PagoPendientePage() {
  return (
    <div className="min-h-screen gradient-brand flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse">
          <Clock size={36} className="text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Pago pendiente</h1>
        <p className="text-slate-400">
          Tu pago está siendo procesado por Mercado Pago. Una vez confirmado, tu solicitud avanzará automáticamente.
        </p>
        <Card>
          <div className="flex gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <p className="text-sm text-slate-400 text-left">
              No cierres esta ventana si tienes el pago en proceso. Si ya completaste el pago, espera unos minutos y consulta tu código de seguimiento.
            </p>
          </div>
        </Card>
        <Link
          href="/tramite"
          className="inline-block text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          Volver al inicio del trámite
        </Link>
      </div>
    </div>
  )
}
