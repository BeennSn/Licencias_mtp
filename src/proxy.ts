import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type UserRole } from '@/types/database.types'

// Rutas protegidas por rol
const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/contribuyente': ['contribuyente', 'admin'],
  '/inspector':     ['inspector', 'admin'],
  '/admin':         ['admin'],
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresca la sesión (necesario para SSR con App Router)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Verificar si la ruta requiere autenticación
  const matchedPrefix = Object.keys(PROTECTED_ROUTES).find(prefix =>
    pathname.startsWith(prefix)
  )

  if (matchedPrefix) {
    // Sin sesión → redirigir al login con redirect param
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Obtener el rol del usuario desde profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profileData = profile as { role: UserRole } | null
    const allowedRoles = PROTECTED_ROUTES[matchedPrefix]

    if (!profileData || !allowedRoles.includes(profileData.role)) {
      // Rol no autorizado → redirigir al dashboard de su rol
      const redirectPath =
        profileData?.role === 'inspector' ? '/inspector' :
        profileData?.role === 'admin'     ? '/admin' :
                                            '/contribuyente'

      const url = request.nextUrl.clone()
      url.pathname = redirectPath
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/contribuyente/:path*',
    '/inspector/:path*',
    '/admin/:path*',
    '/auth/:path*',
  ],
}
