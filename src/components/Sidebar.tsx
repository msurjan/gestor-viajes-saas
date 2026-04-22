'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard,
  CalendarDays,
  Globe,
  Radar,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/',        label: 'Dashboard', icon: LayoutDashboard },
  { href: '/eventos', label: 'Eventos',   icon: CalendarDays    },
  { href: '/radar',   label: 'Radar IA',  icon: Radar           },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0c1e3c] text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
        <Globe className="h-7 w-7 text-blue-400" strokeWidth={1.5} />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide">Gestor Viajes</p>
          <p className="text-[10px] text-blue-300/70 uppercase tracking-widest">
            by Graiph
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-100/70 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer: sign-out */}
      <div className="border-t border-white/10 px-3 py-4 space-y-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-100/70 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
          Cerrar sesión
        </button>
        <p className="text-[11px] text-blue-200/30 px-3">MVP v0.1 · 2026</p>
      </div>
    </aside>
  )
}
