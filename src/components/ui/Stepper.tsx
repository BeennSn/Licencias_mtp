import { type TRAMITE_STEPS } from '@/lib/utils/stateMachine'
import clsx from 'clsx'
import { Check } from 'lucide-react'

interface StepperProps {
  steps: typeof TRAMITE_STEPS
  currentStep: number
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav aria-label="Progreso del trámite" className="w-full">
      <ol className="flex items-center justify-center gap-0">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.id
          const isCurrent   = currentStep === step.id
          const isUpcoming  = currentStep < step.id

          return (
            <li key={step.id} className="flex items-center">
              {/* Nodo */}
              <div className="flex flex-col items-center">
                <div
                  className={clsx(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300',
                    isCompleted && 'border-amber-500 bg-amber-500 text-white',
                    isCurrent   && 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]',
                    isUpcoming  && 'border-slate-700 bg-slate-800 text-slate-500'
                  )}
                >
                  {isCompleted
                    ? <Check size={16} strokeWidth={2.5} />
                    : <span>{step.id}</span>
                  }
                </div>
                <div className="mt-2 text-center">
                  <p className={clsx(
                    'text-xs font-medium',
                    isCurrent  ? 'text-amber-400' : isCompleted ? 'text-slate-300' : 'text-slate-600'
                  )}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5 hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Línea conectora */}
              {idx < steps.length - 1 && (
                <div
                  className={clsx(
                    'mx-2 mb-6 h-0.5 w-12 sm:w-20 transition-all duration-500',
                    currentStep > step.id ? 'bg-amber-500' : 'bg-slate-700'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
