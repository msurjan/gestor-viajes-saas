import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
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
      <body className="h-full bg-slate-50 font-sans antialiased">
        <div className="flex h-full">
          <Sidebar />
          <main className="ml-64 flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  )
}
