import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { XCircle, RefreshCw } from 'lucide-react'

export default function PagoFalloPage() {
  return (
    <div className="min-h-screen gradient-brand flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
          <XCircle size={36} className="text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Pago no completado</h1>
        <p className="text-slate-400">
          Tu pago fue rechazado o cancelado. Tu solicitud sigue pendiente — puedes reintentar el pago.
        </p>
        <Card className="border-red-500/20">
          <p className="text-sm text-slate-400">
            La solicitud de tu licencia <strong className="text-white">fue guardada</strong>.
            No perderás tu turno — solo regresa al trámite para reintentar el pago.
          </p>
        </Card>
        <Link
          href="/tramite/pago"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 font-semibold hover:opacity-90 transition-opacity"
        >
          <RefreshCw size={16} />
          Reintentar pago
        </Link>
      </div>
    </div>
  )
}
