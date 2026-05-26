import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Licencias Municipales — Municipalidad Provincial de Trujillo',
    template: '%s | MPT Licencias',
  },
  description: 'Sistema Automatizado de Licencias de Funcionamiento Municipal. Obtén tu licencia en línea de forma rápida, segura y transparente.',
  keywords: ['licencia de funcionamiento', 'Trujillo', 'municipalidad', 'MPT', 'empresa', 'negocio'],
  authors: [{ name: 'Municipalidad Provincial de Trujillo' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    siteName: 'MPT Licencias',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-[#0a0f1e] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
