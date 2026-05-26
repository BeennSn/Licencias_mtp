import type { Metadata } from 'next'
import { TRAMITE_STEPS } from '@/lib/utils/stateMachine'
import { Stepper } from '@/components/ui/Stepper'

export const metadata: Metadata = {
  title: 'Iniciar Trámite',
  description: 'Inicia tu trámite de Licencia de Funcionamiento Municipal en Trujillo.',
}

export default function TramiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen gradient-brand">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30">
              <span className="text-lg">🏛️</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 leading-none">Municipalidad Provincial de</p>
              <p className="text-sm font-bold text-white leading-tight">Trujillo</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 text-right">
            <p>Licencias de Funcionamiento</p>
            <p className="text-slate-600">Sistema en línea</p>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-10">
          <Stepper steps={TRAMITE_STEPS} currentStep={1} />
        </div>
        {children}
      </main>
    </div>
  )
}
