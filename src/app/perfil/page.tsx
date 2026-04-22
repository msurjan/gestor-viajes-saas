'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PerfilUsuario, Empresa, EstadoAgenda } from '@/types/database'
import {
  UserCircle, Building2, Mail, Save, Loader2,
  CheckCircle2, AlertTriangle, BarChart3,
} from 'lucide-react'

const ESTADO_LABELS: Record<EstadoAgenda, string> = {
  evaluacion: 'Evaluando',
  confirmado_visita: 'Confirmado Asistente',
  confirmado_auspiciador: 'Confirmado Sponsor',
  descartado: 'Descartados',
}

const ESTADO_COLORS: Record<EstadoAgenda, string> = {
  evaluacion: 'bg-amber-100 text-amber-800',
  confirmado_visita: 'bg-blue-100 text-blue-800',
  confirmado_auspiciador: 'bg-emerald-100 text-emerald-800',
  descartado: 'bg-slate-100 text-slate-600',
}

const inp =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition'

export default function PerfilPage() {
  const [session, setSession] = useState<any>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [stats, setStats] = useState<Record<EstadoAgenda, number>>({
    evaluacion: 0,
    confirmado_visita: 0,
    confirmado_auspiciador: 0,
    descartado: 0,
  })
  const [loadingData, setLoadingData] = useState(true)

  // Form fields
  const [cargo, setCargo] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [empNombre, setEmpNombre] = useState('')
  const [empSector, setEmpSector] = useState('')
  const [empPais, setEmpPais] = useState('')

  const [savingPerfil, setSavingPerfil] = useState(false)
  const [savedPerfil, setSavedPerfil] = useState(false)
  const [savingEmp, setSavingEmp] = useState(false)
  const [savedEmp, setSavedEmp] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSessionLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s)
      setSessionLoaded(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return
    setLoadingData(true)

    const { data: p } = await supabase
      .from('perfiles_usuarios')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    setPerfil(p)
    if (p) {
      setCargo(p.cargo_estrategico ?? '')
      setLinkedin(p.linkedin_url ?? '')
      if (p.empresa_id) {
        const { data: e } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', p.empresa_id)
          .maybeSingle()
        setEmpresa(e)
        if (e) {
          setEmpNombre(e.nombre)
          setEmpSector(e.sector_industrial ?? '')
          setEmpPais(e.pais ?? '')
        }
      }
    }

    const { data: asistencias } = await supabase
      .from('asistencias_eventos')
      .select('estado_asistencia')
      .eq('user_id', session.user.id)

    if (asistencias) {
      const counts: Record<EstadoAgenda, number> = {
        evaluacion: 0,
        confirmado_visita: 0,
        confirmado_auspiciador: 0,
        descartado: 0,
      }
      asistencias.forEach(a => {
        if (a.estado_asistencia in counts) counts[a.estado_asistencia as EstadoAgenda]++
      })
      setStats(counts)
    }

    setLoadingData(false)
  }, [session])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSavePerfil() {
    if (!session?.user?.id) return
    setSavingPerfil(true)
    setErrorMsg(null)
    const { error } = await supabase.from('perfiles_usuarios').upsert({
      user_id: session.user.id,
      empresa_id: perfil?.empresa_id ?? null,
      cargo_estrategico: cargo.trim() || null,
      linkedin_url: linkedin.trim() || null,
    })
    if (error) {
      setErrorMsg(error.message)
    } else {
      setSavedPerfil(true)
      setTimeout(() => setSavedPerfil(false), 3000)
      fetchData()
    }
    setSavingPerfil(false)
  }

  async function handleSaveEmpresa() {
    if (!session?.user?.id || !empNombre.trim()) return
    setSavingEmp(true)
    setErrorMsg(null)

    if (empresa?.id) {
      const { error } = await supabase
        .from('empresas')
        .update({
          nombre: empNombre.trim(),
          sector_industrial: empSector.trim() || null,
          pais: empPais.trim() || null,
        })
        .eq('id', empresa.id)
      if (error) {
        setErrorMsg(error.message)
        setSavingEmp(false)
        return
      }
    } else {
      const { data: newEmp, error: errCreate } = await supabase
        .from('empresas')
        .insert({ nombre: empNombre.trim(), sector_industrial: empSector.trim() || null, pais: empPais.trim() || null })
        .select()
        .single()
      if (errCreate || !newEmp) {
        setErrorMsg(errCreate?.message ?? 'Error al crear empresa')
        setSavingEmp(false)
        return
      }
      await supabase.from('perfiles_usuarios').upsert({
        user_id: session.user.id,
        empresa_id: newEmp.id,
        cargo_estrategico: cargo.trim() || null,
        linkedin_url: linkedin.trim() || null,
      })
    }

    setSavedEmp(true)
    setTimeout(() => setSavedEmp(false), 3000)
    fetchData()
    setSavingEmp(false)
  }

  // Auth guard
  if (!sessionLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }
  if (!session) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  const userEmail: string = session.user.email ?? ''
  const initials = userEmail.slice(0, 2).toUpperCase()
  const totalEventos = Object.values(stats).reduce((a, b) => a + b, 0)

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#0c1e3c]">Mi Perfil</h1>
        <p className="text-sm text-slate-500 mt-1">Gestiona tu información corporativa y preferencias.</p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ─────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Avatar card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-[#0c1e3c] flex items-center justify-center mb-4 shadow-md">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
            <p className="font-semibold text-[#0c1e3c] text-sm break-all">{userEmail}</p>
            {cargo && <p className="text-xs text-slate-500 mt-1">{cargo}</p>}
            {empresa && (
              <p className="text-xs text-blue-600 mt-1 font-medium">{empresa.nombre}</p>
            )}
          </div>

          {/* Stats card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Mi Actividad</h3>
            </div>
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {(Object.entries(ESTADO_LABELS) as [EstadoAgenda, string][]).map(([estado, label]) => (
                  <div key={estado} className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLORS[estado]}`}>
                      {label}
                    </span>
                    <span className="text-sm font-bold text-[#0c1e3c] tabular-nums">{stats[estado]}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Total eventos</span>
                  <span className="text-sm font-bold text-[#0c1e3c] tabular-nums">{totalEventos}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: forms ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal info */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Información Personal</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Email corporativo</label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-500 break-all">{userEmail}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Cargo estratégico</label>
                <input
                  type="text"
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  placeholder="ej. VP de Operaciones"
                  className={inp}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">LinkedIn</label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={e => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/usuario"
                  className={inp}
                />
              </div>
              <div className="pt-1 flex items-center gap-3">
                <button
                  onClick={handleSavePerfil}
                  disabled={savingPerfil}
                  className="flex items-center gap-2 rounded-lg bg-[#0c1e3c] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {savingPerfil
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Save className="h-4 w-4" />}
                  Guardar perfil
                </button>
                {savedPerfil && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4" /> Guardado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Company info */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Empresa</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  Nombre de la empresa <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={empNombre}
                  onChange={e => setEmpNombre(e.target.value)}
                  placeholder="ej. Graiph S.A."
                  className={inp}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600">Sector industrial</label>
                  <input
                    type="text"
                    value={empSector}
                    onChange={e => setEmpSector(e.target.value)}
                    placeholder="ej. Minería"
                    className={inp}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600">País</label>
                  <input
                    type="text"
                    value={empPais}
                    onChange={e => setEmpPais(e.target.value)}
                    placeholder="ej. Chile"
                    className={inp}
                  />
                </div>
              </div>
              <div className="pt-1 flex items-center gap-3">
                <button
                  onClick={handleSaveEmpresa}
                  disabled={savingEmp || !empNombre.trim()}
                  className="flex items-center gap-2 rounded-lg bg-[#0c1e3c] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {savingEmp
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Save className="h-4 w-4" />}
                  Guardar empresa
                </button>
                {savedEmp && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4" /> Guardado
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
