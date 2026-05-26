import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, FileText, LogOut } from 'lucide-react'

export default async function ContribuyenteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0f1e]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏛️</span>
            <span className="text-sm font-semibold text-white">MPT Licencias</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/contribuyente" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <Home size={14} /> Panel
            </Link>
            <Link href="/tramite" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <FileText size={14} /> Nuevo trámite
            </Link>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
                <LogOut size={14} /> Salir
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  )
}
