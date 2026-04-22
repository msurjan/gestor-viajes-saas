import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { Globe, LayoutDashboard, UserCircle } from 'lucide-react'
import Sidebar from '@/components/Sidebar'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Agenda Corporativa · Agenda Corporativa',
  description: 'Plataforma de gestión de eventos y viajes corporativos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="h-full bg-slate-50 font-sans antialiased text-slate-900">
        <div className="flex h-full flex-col sm:flex-row">
          {/* Mobile Top Bar */}
          <header className="sm:hidden flex h-14 items-center justify-between px-4 bg-[#0c1e3c] text-white shrink-0 shadow-md">
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-blue-400" />
              <span className="font-bold text-sm">Agenda Corporativa</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="p-1 hover:text-blue-300 transition-colors">
                <LayoutDashboard className="h-5 w-5" />
              </Link>
              <Link href="/perfil" className="p-1 hover:text-blue-300 transition-colors">
                <UserCircle className="h-5 w-5" />
              </Link>
            </div>
          </header>

          <Sidebar />
          
          <main className="flex-1 overflow-y-auto sm:ml-20 lg:ml-64 p-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
