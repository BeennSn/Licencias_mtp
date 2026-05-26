import { createBrowserClient } from '@supabase/ssr'

// Singleton para el cliente de Supabase en el browser
let client: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseBrowserClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
