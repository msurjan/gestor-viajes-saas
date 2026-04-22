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
  UserCircle,
} from 'lucide-react'

const navItems = [
  { href: '/',        label: 'Dashboard', icon: LayoutDashboard },
  { href: '/perfil',  label: 'Mi Perfil', icon: UserCircle },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    const guest = localStorage.getItem('isGuest') === 'true'
    setIsGuest(guest)
  }, [])

  async function handleSignOut() {
    if (isGuest) {
      localStorage.removeItem('isGuest')
    } else {
      await supabase.auth.signOut()
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden sm:flex w-20 lg:w-64 flex-col bg-[#0c1e3c] text-white transition-all duration-300 ease-in-out">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center lg:justify-start lg:gap-3 border-b border-white/10 lg:px-6 px-4">
        <Globe className="h-7 w-7 text-blue-400 flex-shrink-0" strokeWidth={1.5} />
        <div className="leading-tight hidden lg:block overflow-hidden whitespace-nowrap">
          <p className="text-sm font-semibold tracking-wide">Agenda Corporativa</p>
          <p className="text-[10px] text-blue-300/70 uppercase tracking-widest">
            by Agenda Corporativa
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          if (isGuest && href === '/perfil') return null // Guests can't see profile
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center lg:justify-start gap-3 rounded-lg lg:px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-100/70 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />
              <span className="hidden lg:block overflow-hidden whitespace-nowrap">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer: sign-out */}
      <div className="border-t border-white/10 px-3 py-4 space-y-3">
        <button
          onClick={handleSignOut}
          title={isGuest ? "Iniciar Sesión" : "Cerrar sesión"}
          className="flex w-full items-center justify-center lg:justify-start gap-3 rounded-lg lg:px-3 py-2.5 text-sm font-medium text-blue-100/70 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          {isGuest ? <LogIn className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} /> : <LogOut className="h-5 w-5 flex-shrink-0" strokeWidth={1.75} />}
          <span className="hidden lg:block overflow-hidden whitespace-nowrap">{isGuest ? 'Iniciar Sesión' : 'Cerrar sesión'}</span>
        </button>
        <p className="text-[11px] text-blue-200/30 px-3 hidden lg:block">MVP v0.2 · 2026</p>
      </div>
    </aside>
  )
}
