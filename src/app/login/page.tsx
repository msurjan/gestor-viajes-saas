'use client'

import { Suspense, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Globe, Loader2, AlertCircle, Lock, LogIn } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    // Detectar errores de OAuth devueltos en la URL (ej: ?error_description=...)
    const errorDesc = searchParams.get('error_description')
    if (errorDesc) {
      setError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')))
    }
    
    // Si viene un hash con error (flujo implícito)
    if (typeof window !== 'undefined' && window.location.hash.includes('error_description')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const hashErrorDesc = hashParams.get('error_description')
      if (hashErrorDesc) setError(decodeURIComponent(hashErrorDesc.replace(/\+/g, ' ')))
    }
  }, [searchParams])

  async function handleOAuthLogin(provider: 'azure') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        scopes: 'Calendars.ReadWrite', // Scope para Microsoft Graph API
        redirectTo: window.location.origin
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isRegistering) {
      // Registro de cuenta DEMO
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: nombre,
            company_name: empresa
          }
        }
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Crear el perfil como DEMO
      if (data.user) {
        // Buscamos o creamos la empresa
        let empresaId = null
        if (empresa) {
          const { data: empData } = await supabase.from('empresas').select('id').eq('nombre', empresa).single()
          if (empData) {
            empresaId = empData.id
          } else {
            const { data: newEmp } = await supabase.from('empresas').insert({ nombre: empresa }).select().single()
            if (newEmp) empresaId = newEmp.id
          }
        }

        await supabase.from('perfiles_usuarios').upsert({
          user_id: data.user.id,
          empresa_id: empresaId,
          es_demo: true
        })
      }

      alert("Cuenta demo creada. Por favor verifica tu email si es necesario o intenta ingresar.")
      setIsRegistering(false)
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setError('Email no registrado. ¿Quieres crear una cuenta demo?')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0c1e3c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Globe className="h-9 w-9 text-blue-400" strokeWidth={1.5} />
          <div className="leading-tight">
            <p className="text-white font-semibold tracking-wide text-lg">Agenda Corporativa</p>
            <p className="text-blue-300/60 text-[10px] uppercase tracking-widest">by Agenda Corporativa</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Card header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-200" />
              <p className="text-sm font-medium text-blue-100">Acceso corporativo</p>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              {isRegistering ? 'Crear Cuenta Demo' : 'Iniciar sesión'}
            </h1>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            
            {!isRegistering && (
              <>
                {/* OAuth Buttons */}
                <div className="space-y-3 mb-6">
                  <button 
                    onClick={() => handleOAuthLogin('azure')}
                    className="w-full flex items-center justify-center gap-3 bg-[#0078D4] hover:bg-[#005a9e] text-white py-3 rounded-xl font-medium transition-all shadow-sm text-sm"
                  >
                    <LogIn className="h-4 w-4" /> Entrar con Microsoft
                  </button>
                </div>

                <div className="relative flex items-center py-2 mb-4">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">o con email</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Nombre completo</label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      placeholder="Marcelo Surjan"
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Empresa</label>
                    <input
                      type="text"
                      value={empresa}
                      onChange={e => setEmpresa(e.target.value)}
                      placeholder="Geológica"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    {error}
                    {error.includes('¿Quieres crear una cuenta demo?') && (
                      <button 
                        type="button"
                        onClick={() => setIsRegistering(true)}
                        className="block mt-1 font-bold underline"
                      >
                        Sí, crear cuenta demo gratuita
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0c1e3c] py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-60 transition-colors shadow-sm mt-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Procesando…' : (isRegistering ? 'Crear Demo' : 'Ingresar')}
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering)
                    setError(null)
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {isRegistering ? '¿Ya tienes cuenta? Iniciar sesión' : '¿Eres nuevo? Prueba la versión demo'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-blue-200/30 mt-6">
          MVP v0.2 · 2026 · Agenda Corporativa
        </p>
      </div>
    </div>
  )
}
