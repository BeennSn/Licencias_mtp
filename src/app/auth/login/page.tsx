'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router              = useRouter()
  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createSupabaseBrowserClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Correo o contraseña incorrectos. Intenta nuevamente.')
      setLoading(false)
      return
    }

    // Redirigir según el rol
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const profile = profileData as { role: string } | null

    const redirect =
      profile?.role === 'inspector' ? '/inspector' :
      profile?.role === 'admin'     ? '/admin'     :
                                      '/contribuyente'

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="min-h-screen gradient-brand flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/30 text-3xl">
            🏛️
          </div>
          <h1 className="text-2xl font-bold text-white">Ingresar al sistema</h1>
          <p className="text-sm text-slate-400">Municipalidad Provincial de Trujillo</p>
        </div>

        <Card>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              id="login-email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail size={16} />}
              placeholder="nombre@empresa.com"
              required
            />
            <Input
              id="login-password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              placeholder="••••••••"
              required
            />

            {error && (
              <p className="text-sm text-red-400 text-center">⚠ {error}</p>
            )}

            <Button
              type="submit"
              loading={loading}
              size="lg"
              className="w-full"
              id="btn-ingresar"
              iconEnd={<ArrowRight size={16} />}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </Card>

        <div className="text-center space-y-2">
          <Link
            href="/tramite"
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            ¿No tienes cuenta? Inicia tu trámite →
          </Link>
        </div>
      </div>
    </div>
  )
}
