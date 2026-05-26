import { Suspense } from 'react'
import PagoExitoContent from './PagoExitoContent'
import { Loader2 } from 'lucide-react'

export default function PagoExitoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-brand flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={40} className="animate-spin text-amber-400 mx-auto" />
          <p className="text-slate-400 text-sm">Verificando pago...</p>
        </div>
      </div>
    }>
      <PagoExitoContent />
    </Suspense>
  )
}
