'use client'

import { Suspense, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import { Globe, Loader2, AlertCircle, Lock, LogIn } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted]         = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [nombre, setNombre]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const errorDesc = searchParams.get('error_description')
    if (errorDesc) setError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')))
  }, [searchParams])

  if (!mounted) return null

  // ── OAuth ────────────────────────────────────────────────────────────────
  async function handleOAuthLogin(provider: 'azure') {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        scopes: 'Calendars.ReadWrite',
        redirectTo: window.location.origin,
      },
    })
  }

  // ── Anonymous (Explorar sin cuenta) ──────────────────────────────────────
  async function handleGuestLogin() {
    setGuestLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      setError('No se pudo iniciar como invitado. Verifica que los logins anónimos estén habilitados en Supabase.')
      setGuestLoading(false)
      return
    }
    window.location.href = '/'
  }

  // ── Email / Password ─────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isRegistering) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: nombre } },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Crear perfil inmediatamente si el usuario ya está confirmado
      if (data.user) {
        await supabase.from('perfiles_usuarios').upsert({
          user_id: data.user.id,
          es_demo: false,
        })
      }

      // Intentar login directo (funciona si email confirmation está desactivado)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInError) {
        window.location.href = '/'
        return
      }

      // Si falla (necesita confirmación de email), volver al form de login
      setError(null)
      setIsRegistering(false)
      setLoading(false)
      return
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      setError(
        loginError.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : loginError.message,
      )
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c1e3c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Globe className="h-9 w-9 text-blue-400" strokeWidth={1.5} />
          <div className="leading-tight">
            <p className="text-white font-semibold tracking-wide text-lg">Vento Global</p>
            <p className="text-blue-300/60 text-[10px] uppercase tracking-widest">Corporate Intelligence Hub</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-200" />
              <p className="text-sm font-medium text-blue-100">
                {isRegistering ? 'Crear cuenta nueva' : 'Acceso corporativo'}
              </p>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              {isRegistering ? 'Registro' : 'Iniciar sesión'}
            </h1>
          </div>

          <div className="px-8 py-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600">Nombre Completo</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Email Corporativo</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || guestLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0c1e3c] py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-60 transition-colors shadow-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {isRegistering ? 'Crear mi cuenta' : 'Ingresar'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(!isRegistering); setError(null) }}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crear una corporativa'}
                </button>
              </div>

              {!isRegistering && (
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                  <button
                    type="button"
                    disabled={loading || guestLoading}
                    onClick={() => handleOAuthLogin('azure')}
                    className="w-full flex items-center justify-center gap-3 bg-[#0078D4] hover:bg-[#005a9e] text-white py-3 rounded-xl font-medium transition-all shadow-sm text-sm disabled:opacity-60"
                  >
                    <Globe className="h-4 w-4" /> Entrar con Microsoft
                  </button>

                  <button
                    type="button"
                    disabled={loading || guestLoading}
                    onClick={handleGuestLogin}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 text-sm font-medium transition-all disabled:opacity-60"
                  >
                    {guestLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Globe className="h-4 w-4" />}
                    {guestLoading ? 'Iniciando…' : 'Explorar sin cuenta'}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">
                    Puedes ver todos los eventos. Regístrate para guardar tu agenda.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-blue-200/30 mt-6">
          MVP v0.2 · 2026 · Vento Global
        </p>
      </div>
    </div>
  )
}
