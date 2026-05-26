import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Shield, Zap, FileCheck, QrCode, Clock, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Municipalidad Provincial de Trujillo — Licencias de Funcionamiento en Línea',
  description: 'Obtén tu Licencia de Funcionamiento Municipal en línea. Trámite 100% digital: valida tu RUC, sube tu plano y paga con Mercado Pago en minutos.',
}

const STEPS = [
  { icon: '🔍', title: 'Valida tu RUC', desc: 'Consulta automática con SUNAT. Solo negocios activos y habidos en Trujillo.' },
  { icon: '📄', title: 'Sube el plano', desc: 'Adjunta el plano de distribución de tu local (PDF, JPG o PNG).' },
  { icon: '💳', title: 'Paga en línea', desc: 'Pago seguro de S/. 180 vía Mercado Pago. Se genera tu código TRU.' },
  { icon: '🏛️', title: 'Inspección', desc: 'Un inspector municipal visita tu local y valida las condiciones.' },
  { icon: '✅', title: 'Licencia digital', desc: 'Recibes tu licencia con QR verificable. Vigencia de 1 año.' },
]

const FEATURES = [
  { icon: <Zap size={20} />,       title: 'Trámite 100% digital',  desc: 'Sin filas, sin papel. Desde cualquier dispositivo.' },
  { icon: <Shield size={20} />,    title: 'Pago seguro',           desc: 'Mercado Pago — la plataforma de pagos más usada en Perú.' },
  { icon: <Clock size={20} />,     title: 'Seguimiento en tiempo real', desc: 'Sigue el estado de tu licencia con tu código TRU.' },
  { icon: <QrCode size={20} />,    title: 'Licencia con QR',       desc: 'Verifica la autenticidad de cualquier licencia en segundos.' },
  { icon: <FileCheck size={20} />, title: 'Vigencia 1 año',        desc: 'Renovación automática con aviso 30 días antes del vencimiento.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-lg">
              🏛️
            </div>
            <div>
              <p className="text-xs text-slate-500 leading-none">Municipalidad Provincial de</p>
              <p className="text-sm font-bold text-white leading-tight">Trujillo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/verificar/TRU-2025-000001"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <QrCode size={14} />
              Verificar licencia
            </Link>
            <Link
              href="/auth/login"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Ingresar
            </Link>
            <Link
              href="/tramite"
              id="cta-nav-iniciar"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:opacity-90 transition-opacity"
            >
              Iniciar trámite <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 gradient-brand opacity-50" />
        <div className="absolute top-20 left-1/4 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

        <div className="relative mx-auto max-w-5xl px-4 text-center space-y-8">
          {/* Chip */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Nuevo sistema digital · Trujillo
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight">
            Tu <span className="gradient-text">Licencia Municipal</span>
            <br />en minutos, no en semanas
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            El sistema oficial de la Municipalidad Provincial de Trujillo para obtener y
            gestionar tu Licencia de Funcionamiento completamente en línea.
            Sin filas. Sin papeles. Con seguimiento en tiempo real.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/tramite"
              id="cta-hero-principal"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 px-8 py-4 text-base font-bold text-slate-900 hover:opacity-90 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-all duration-200 active:scale-[0.98]"
            >
              Iniciar trámite gratis
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/auth/login"
              id="cta-hero-panel"
              className="inline-flex items-center justify-center gap-2 rounded-2xl glass border border-white/15 px-8 py-4 text-base font-semibold text-white hover:border-amber-500/30 hover:bg-white/10 transition-all duration-200"
            >
              Ver mi panel
              <ChevronRight size={18} />
            </Link>
          </div>

          {/* Social proof */}
          <p className="text-xs text-slate-600">
            Trámite digital · Pago seguro · Validez legal · Verificación QR
          </p>
        </div>
      </section>

      {/* Pasos */}
      <section className="py-20 bg-[#080d1a]">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white">¿Cómo funciona?</h2>
            <p className="text-slate-400 mt-2">5 pasos simples para obtener tu licencia</p>
          </div>
          <div className="relative">
            {/* Línea conectora */}
            <div className="absolute top-10 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent hidden lg:block" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {STEPS.map((step, i) => (
                <div key={i} className="relative flex flex-col items-center text-center gap-3">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl glass border border-amber-500/20 text-4xl hover:border-amber-500/50 transition-colors">
                    {step.icon}
                    <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-amber-500 text-[10px] font-bold text-slate-900 flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white text-sm">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white">Todo lo que necesitas</h2>
            <p className="text-slate-400 mt-2">Un sistema diseñado para simplificar el trámite</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass glass-hover rounded-2xl p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 bg-[#080d1a]">
        <div className="mx-auto max-w-2xl px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">
            ¿Listo para formalizar tu negocio?
          </h2>
          <p className="text-slate-400">
            Comienza ahora. Solo necesitas tu RUC y el plano de tu local.
            El trámite completo toma menos de 10 minutos.
          </p>
          <Link
            href="/tramite"
            id="cta-bottom"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 px-10 py-4 text-base font-bold text-slate-900 hover:opacity-90 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-all duration-200"
          >
            Iniciar trámite ahora
            <ArrowRight size={18} />
          </Link>
          <p className="text-xs text-slate-600">
            Derecho de trámite: S/. 0.50 — Pago único a través de Mercado Pago
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>🏛️</span>
            <span>© {new Date().getFullYear()} Municipalidad Provincial de Trujillo</span>
          </div>
          <div className="flex gap-4">
            <Link href="/verificar/TRU-0000-000000" className="hover:text-slate-400 transition-colors">Verificar licencia</Link>
            <span>·</span>
            <Link href="/tramite" className="hover:text-slate-400 transition-colors">Nuevo trámite</Link>
            <span>·</span>
            <Link href="/auth/login" className="hover:text-slate-400 transition-colors">Panel</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
