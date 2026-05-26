import { type ReactNode } from 'react'
import Link from 'next/link'
import { BarChart3, Users, Calendar, LogOut } from 'lucide-react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0f1e]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <span className="text-sm font-semibold text-white">MPT — Admin</span>
          </div>
          <nav className="flex items-center gap-1 flex-wrap">
            <Link href="/admin" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <BarChart3 size={14} /> Métricas
            </Link>
            <Link href="/admin?status=PAGADO" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <Users size={14} /> Por asignar
            </Link>
            <Link href="/admin/feriados" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <Calendar size={14} /> Feriados
            </Link>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
                <LogOut size={14} /> Salir
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  )
}
