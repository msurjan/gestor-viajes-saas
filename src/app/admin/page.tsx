'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { cazarEvento, type EventoBorrador } from '@/app/actions/cazar-evento'
import {
  ArrowLeft, Loader2, ShieldAlert, PlusCircle, CheckCircle2,
  AlertTriangle, Settings, Zap, Search, BarChart3,
  Users, TrendingUp, Globe, CalendarDays, X, Database, Inbox,
  ThumbsUp, ThumbsDown, Mail, Link2,
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'marcelosurjan@gmail.com'

const TEMAS = [
  'Minería y Metales',
  'Energía y Renovables',
  'Tecnología e IA',
  'Finanzas e Inversión',
  'Infraestructura y Construcción',
  'Sostenibilidad y ESG',
  'Logística y Transporte',
  'Manufactura e Industria 4.0',
  'Petróleo y Gas',
  'Otros Temas Estratégicos'
]

const MODELOS = [
  { id: 'sonar',     label: 'sonar — económico',     price: 0.005 },
  { id: 'sonar-pro', label: 'sonar-pro — alta calidad', price: 0.015 },
]

const EMPTY_FORM = {
  nombre: '', descripcion: '', tema: '',
  fecha_inicio: '', fecha_fin: '',
  ciudad: '', pais: '', fuente_url: '', costo_entrada: '',
}

type TabId = 'ia' | 'stats' | 'usuarios' | 'perfiles' | 'sugerencias'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'ia',          label: 'Buscador IA',    icon: Search    },
  { id: 'stats',       label: 'Estadísticas',   icon: BarChart3 },
  { id: 'usuarios',    label: 'Usuarios',       icon: Users     },
  { id: 'perfiles',    label: 'Perfiles',       icon: TrendingUp },
  { id: 'sugerencias', label: 'Sugerencias',    icon: Inbox     },
]

const ESTADO_LABELS: Record<string, string> = {
  evaluacion:             'Evaluando ir',
  confirmado_visita:      'Confirmado (Asistente)',
  confirmado_auspiciador: 'Confirmado (Sponsor)',
  descartado:             'No me interesa',
}

const SQL_EVENTOS_VISTOS = `CREATE TABLE IF NOT EXISTS eventos_vistos (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text,
  evento_id       uuid         REFERENCES eventos_agenda(id) ON DELETE CASCADE,
  session_id      text,
  duracion_segundos int,
  created_at      timestamptz  NOT NULL DEFAULT now()
);
ALTER TABLE eventos_vistos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read" ON eventos_vistos FOR SELECT TO authenticated USING (true);`

// ── Helpers ──────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split('T')[0] }
function in90()  {
  const d = new Date(); d.setDate(d.getDate() + 90)
  return d.toISOString().split('T')[0]
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [session, setSession]         = useState<any>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [tab, setTab]                 = useState<TabId>('ia')

  // ── IA tab ─────────────────────────────────────────────────────────────
  const [query, setQuery]             = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [borradores, setBorradores]   = useState<EventoBorrador[]>([])
  const [savingId, setSavingId]       = useState<string | null>(null)
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set())

  const [form, setForm]               = useState(EMPTY_FORM)
  const [formSaving, setFormSaving]   = useState(false)
  const [formResult, setFormResult]   = useState<'ok' | 'error' | null>(null)

  const [credits, setCredits]         = useState('5.00')
  const [creditsDraft, setCreditsDraft] = useState('5.00')
  const [modelo, setModelo]           = useState('sonar')
  const [creditsSaved, setCreditsSaved] = useState(false)

  // ── Stats tab ──────────────────────────────────────────────────────────
  const [statsEventos, setStatsEventos] = useState<any[]>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsLoaded, setStatsLoaded]   = useState(false)

  // ── Usuarios tab ───────────────────────────────────────────────────────
  const [eventosVistos, setEventosVistos]     = useState<any[]>([])
  const [vistosError, setVistosError]         = useState(false)
  const [usuariosLoading, setUsuariosLoading] = useState(false)
  const [usuariosLoaded, setUsuariosLoaded]   = useState(false)

  // ── Perfiles tab ───────────────────────────────────────────────────────
  const [asistencias, setAsistencias]   = useState<any[]>([])
  const [topEventos, setTopEventos]     = useState<{ nombre: string; count: number }[]>([])
  const [perfilesLoading, setPerfilesLoading] = useState(false)
  const [perfilesLoaded, setPerfilesLoaded]   = useState(false)

  // ── Sugerencias tab ────────────────────────────────────────────────────
  const [sugerencias, setSugerencias]     = useState<any[]>([])
  const [sugerenciasLoading, setSugerenciasLoading] = useState(false)
  const [sugerenciasLoaded, setSugerenciasLoaded]   = useState(false)
  const [processingId, setProcessingId]   = useState<string | null>(null)

  // ── Auth ────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s); setSessionLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s); setSessionLoaded(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const c = localStorage.getItem('perplexity_credits') ?? '5.00'
    const m = localStorage.getItem('perplexity_model') ?? 'sonar'
    setCredits(c); setCreditsDraft(c); setModelo(m)
  }, [])

  // ── Data loaders ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    if (statsLoaded) return
    setStatsLoading(true)
    const { data } = await supabase
      .from('eventos_agenda')
      .select('id, nombre, tema, pais, fecha_inicio, fecha_fin')
    setStatsEventos(data ?? [])
    setStatsLoading(false)
    setStatsLoaded(true)
  }, [statsLoaded])

  const fetchUsuarios = useCallback(async () => {
    if (usuariosLoaded) return
    setUsuariosLoading(true)
    const { data, error } = await supabase
      .from('eventos_vistos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) { setVistosError(true) }
    else { setEventosVistos(data ?? []) }
    setUsuariosLoading(false)
    setUsuariosLoaded(true)
  }, [usuariosLoaded])

  const fetchSugerencias = useCallback(async () => {
    if (sugerenciasLoaded) return
    setSugerenciasLoading(true)
    const { data } = await supabase
      .from('sugerencias_eventos')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
    setSugerencias(data ?? [])
    setSugerenciasLoading(false)
    setSugerenciasLoaded(true)
  }, [sugerenciasLoaded])

  const fetchPerfiles = useCallback(async () => {
    if (perfilesLoaded) return
    setPerfilesLoading(true)
    const { data: asist } = await supabase
      .from('asistencias_eventos')
      .select('evento_id, estado_asistencia, user_id')

    if (asist) {
      setAsistencias(asist)

      // Top eventos por asistencias
      const counts: Record<string, number> = {}
      asist.forEach(a => { counts[a.evento_id] = (counts[a.evento_id] ?? 0) + 1 })
      const topIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id)

      if (topIds.length > 0) {
        const { data: evs } = await supabase
          .from('eventos_agenda')
          .select('id, nombre')
          .in('id', topIds)
        const top = topIds.map(id => ({
          nombre: evs?.find(e => e.id === id)?.nombre ?? id.slice(0, 8),
          count: counts[id],
        }))
        setTopEventos(top)
      }
    }
    setPerfilesLoading(false)
    setPerfilesLoaded(true)
  }, [perfilesLoaded])

  useEffect(() => {
    if (tab === 'stats')       fetchStats()
    if (tab === 'usuarios')    fetchUsuarios()
    if (tab === 'perfiles')    fetchPerfiles()
    if (tab === 'sugerencias') fetchSugerencias()
  }, [tab, fetchStats, fetchUsuarios, fetchPerfiles, fetchSugerencias])

  // ── Guards ──────────────────────────────────────────────────────────────

  if (!sessionLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!session || session.user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center gap-4 text-center max-w-sm w-full">
          <ShieldAlert className="h-10 w-10 text-red-400" />
          <h1 className="text-lg font-bold text-slate-800">Acceso restringido</h1>
          <p className="text-sm text-slate-500">Esta sección es exclusiva para administradores.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors mt-2">
            <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ── IA tab handlers ─────────────────────────────────────────────────────

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setIsSearching(true)
    const res = await cazarEvento(query)

    // Verificar si ya existen en la base de datos
    const nombres = res.borradores.map(b => b.nombre)
    const { data: existentes } = await supabase
      .from('eventos_agenda')
      .select('nombre, fecha_inicio')
      .in('nombre', nombres)

    const borradoresConCheck = res.borradores.map(b => ({
      ...b,
      yaExiste: existentes?.some(ex => 
        ex.nombre === b.nombre && 
        ex.fecha_inicio === b.fecha_inicio
      ) ?? false
    }))

    setBorradores(prev => {
      const newOnes = borradoresConCheck.filter(b => !prev.some(p => p.id === b.id))
      return [...newOnes, ...prev]
    })
    setIsSearching(false)
  }

  function updateBorrador(id: string, field: keyof EventoBorrador, value: string) {
    setBorradores(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b))
  }

  async function handleSaveBorrador(b: EventoBorrador) {
    setSavingId(b.id)
    const { error } = await supabase.from('eventos_agenda').insert({
      nombre: b.nombre, descripcion: b.descripcion, tema: b.tema || null,
      fecha_inicio: b.fecha_inicio, fecha_fin: b.fecha_fin,
      ciudad: b.ciudad || null, pais: b.pais || null,
      fuente_url: b.fuente_url || null, costo_entrada: b.costo_entrada || null,
      lat: b.lat || null, lng: b.lng || null, imagen_url: b.imagen_url || null,
    })
    setSavingId(null)
    if (!error) setSavedIds(prev => new Set([...prev, b.id]))
  }

  async function handleCreateEvento(e: React.FormEvent) {
    e.preventDefault()
    setFormSaving(true); setFormResult(null)

    // Check for duplicates before manual insert
    const { data: ex } = await supabase
      .from('eventos_agenda')
      .select('id')
      .eq('nombre', form.nombre.trim())
      .eq('fecha_inicio', form.fecha_inicio)
      .maybeSingle()

    if (ex) {
      setFormResult('error')
      setFormSaving(false)
      setErrorMsg('Este evento ya existe en el catálogo para esa fecha.')
      return
    }

    const { error } = await supabase.from('eventos_agenda').insert({
      nombre: form.nombre.trim(), descripcion: form.descripcion.trim(),
      tema: form.tema || null, fecha_inicio: form.fecha_inicio, fecha_fin: form.fecha_fin,
      ciudad: form.ciudad.trim() || null, pais: form.pais.trim() || null,
      fuente_url: form.fuente_url.trim() || null, costo_entrada: form.costo_entrada.trim() || null,
    })
    setFormResult(error ? 'error' : 'ok')
    setFormSaving(false)
    if (!error) { setForm(EMPTY_FORM); setTimeout(() => setFormResult(null), 4000) }
    else { setErrorMsg(error.message) }
  }

  async function handleAprobar(s: any) {
    setProcessingId(s.id)
    const { error } = await supabase.from('eventos_agenda').insert({
      nombre:       s.nombre,
      descripcion:  s.descripcion  || null,
      tema:         s.tema         || null,
      fecha_inicio: s.fecha_inicio,
      fecha_fin:    s.fecha_fin,
      ciudad:       s.ciudad       || null,
      pais:         s.pais         || null,
      fuente_url:   s.fuente_url   || null,
    })
    if (!error) {
      await supabase.from('sugerencias_eventos').update({ estado: 'aprobado' }).eq('id', s.id)
      setSugerencias(prev => prev.filter(x => x.id !== s.id))
    }
    setProcessingId(null)
  }

  async function handleRechazar(id: string) {
    setProcessingId(id)
    await supabase.from('sugerencias_eventos').update({ estado: 'rechazado' }).eq('id', id)
    setSugerencias(prev => prev.filter(x => x.id !== id))
    setProcessingId(null)
  }

  function handleSaveCredits() {
    const val = parseFloat(creditsDraft)
    if (isNaN(val) || val < 0) return
    const formatted = val.toFixed(2)
    localStorage.setItem('perplexity_credits', formatted)
    localStorage.setItem('perplexity_model', modelo)
    setCredits(formatted)
    setCreditsSaved(true)
    setTimeout(() => setCreditsSaved(false), 2500)
  }

  // ── Derived stats ────────────────────────────────────────────────────────

  const todayStr = today(); const in90Str = in90()

  const byTema = statsEventos.reduce<Record<string, number>>((acc, e) => {
    const k = e.tema ?? 'Sin tema'; acc[k] = (acc[k] ?? 0) + 1; return acc
  }, {})
  const maxTema = Math.max(...Object.values(byTema), 1)

  const byPais = statsEventos.reduce<Record<string, number>>((acc, e) => {
    if (e.pais) { acc[e.pais] = (acc[e.pais] ?? 0) + 1 } return acc
  }, {})
  const topPaises = Object.entries(byPais).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxPais = Math.max(...topPaises.map(p => p[1]), 1)

  const proximos = statsEventos.filter(e => e.fecha_inicio >= todayStr && e.fecha_inicio <= in90Str).length
  const futuros  = statsEventos.filter(e => e.fecha_inicio > todayStr).length
  const pasados  = statsEventos.filter(e => e.fecha_fin < todayStr).length

  const byEstado = asistencias.reduce<Record<string, number>>((acc, a) => {
    acc[a.estado_asistencia] = (acc[a.estado_asistencia] ?? 0) + 1; return acc
  }, {})
  const usuariosUnicos = new Set(asistencias.map(a => a.user_id)).size

  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const vistosRecientes = eventosVistos.filter(v => new Date(v.created_at) > sevenDaysAgo)
  const usuariosUnicosVistos = new Set(vistosRecientes.map(v => v.user_id).filter(Boolean)).size
  const byEventoVisto = eventosVistos.reduce<Record<string, number>>((acc, v) => {
    if (v.evento_id) { acc[v.evento_id] = (acc[v.evento_id] ?? 0) + 1 } return acc
  }, {})
  const topVistos = Object.entries(byEventoVisto).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const creditsNum   = parseFloat(credits)
  const modeloInfo   = MODELOS.find(m => m.id === modelo) ?? MODELOS[0]
  const busquedasEst = isNaN(creditsNum) ? 0 : Math.floor(creditsNum / modeloInfo.price)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="sm:ml-20 lg:ml-64">

      {/* Header */}
      <div className="bg-[#0c1e3c] text-white px-8 py-8">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-blue-400" strokeWidth={1.5} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Panel de Administración</h1>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500 text-white px-2 py-0.5 rounded-full">ADMIN</span>
            </div>
            <p className="text-sm text-blue-300/60 mt-0.5">{session.user.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-white/15 text-white'
                  : 'text-blue-200/60 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 max-w-6xl mx-auto space-y-6">

        {/* ══════════════════════════════════════════════════════════════
            TAB 1 — Buscador IA + Eventos
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'ia' && (
          <>
            {/* Credits monitor */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-700">Monitor de Créditos Perplexity</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Créditos</p>
                    <p className="text-2xl font-bold text-emerald-700">${credits}</p>
                    <p className="text-[10px] text-emerald-500 mt-0.5">USD</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Búsquedas est.</p>
                    <p className="text-2xl font-bold text-blue-700">{busquedasEst.toLocaleString()}</p>
                    <p className="text-[10px] text-blue-500 mt-0.5">con {modeloInfo.id}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Precio/búsqueda</p>
                    <p className="text-2xl font-bold text-slate-700">${modeloInfo.price.toFixed(3)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">USD / request</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo (USD)</label>
                    <input
                      type="number" step="0.01" min="0" value={creditsDraft}
                      onChange={e => setCreditsDraft(e.target.value)}
                      className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Modelo</label>
                    <select
                      value={modelo} onChange={e => setModelo(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white focus:border-blue-400 focus:outline-none"
                    >
                      {MODELOS.map(m => <option key={m.id} value={m.id}>{m.label} — ${m.price.toFixed(3)}/req</option>)}
                    </select>
                  </div>
                  <button
                    onClick={handleSaveCredits}
                    className="flex items-center gap-2 rounded-xl bg-[#0c1e3c] hover:bg-blue-900 text-white px-5 py-2 text-sm font-semibold transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Guardar
                  </button>
                  {creditsSaved && <span className="text-xs text-emerald-600 font-medium">✓ Guardado</span>}
                </div>
              </div>
            </div>

            {/* AI Search */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
                <Search className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-700">Buscador IA (Perplexity sonar)</h2>
              </div>
              <div className="p-6 space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                    <input
                      type="text" value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Buscar evento con IA (ej. PDAC 2027)..."
                      disabled={isSearching}
                      className="w-full rounded-full border border-indigo-200 bg-indigo-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-indigo-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                    />
                  </div>
                  <button
                    type="submit" disabled={isSearching || !query.trim()}
                    className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {isSearching ? 'Buscando…' : 'Buscar'}
                  </button>
                  {isSearching && (
                    <button
                      type="button" onClick={() => setIsSearching(false)}
                      className="flex items-center gap-1.5 rounded-lg bg-red-100 hover:bg-red-200 border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition-colors"
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </button>
                  )}
                </form>

                {borradores.length > 0 && (
                  <div className="space-y-4">
                    {borradores.map(b => {
                      const saved = savedIds.has(b.id)
                      const iCls = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400'
                      return (
                        <div key={b.id} className={`rounded-xl border p-4 space-y-3 ${saved ? 'border-emerald-200 bg-emerald-50/30' : 'border-indigo-100 bg-indigo-50/20'}`}>

                          {/* Nombre */}
                          <input
                            type="text"
                            value={b.nombre}
                            onChange={e => updateBorrador(b.id, 'nombre', e.target.value)}
                            disabled={saved}
                            placeholder="Nombre del evento"
                            className={`${iCls} text-sm font-semibold`}
                          />

                          {/* Fechas + Ubicación */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Inicio</p>
                              <input
                                type="date"
                                value={b.fecha_inicio}
                                onChange={e => updateBorrador(b.id, 'fecha_inicio', e.target.value)}
                                disabled={saved}
                                className={iCls}
                              />
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Fin</p>
                              <input
                                type="date"
                                value={b.fecha_fin}
                                onChange={e => updateBorrador(b.id, 'fecha_fin', e.target.value)}
                                disabled={saved}
                                className={iCls}
                              />
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Ciudad</p>
                              <input
                                type="text"
                                value={b.ciudad ?? ''}
                                onChange={e => updateBorrador(b.id, 'ciudad', e.target.value)}
                                disabled={saved}
                                placeholder="Ciudad"
                                className={iCls}
                              />
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">País</p>
                              <input
                                type="text"
                                value={b.pais ?? ''}
                                onChange={e => updateBorrador(b.id, 'pais', e.target.value)}
                                disabled={saved}
                                placeholder="País"
                                className={iCls}
                              />
                            </div>
                          </div>

                          {/* Tema + URL */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Tema</p>
                              <select
                                value={b.tema ?? ''}
                                onChange={e => updateBorrador(b.id, 'tema', e.target.value)}
                                disabled={saved}
                                className={iCls}
                              >
                                <option value="">Sin tema</option>
                                {TEMAS.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">URL fuente</p>
                              <input
                                type="text"
                                value={b.fuente_url ?? ''}
                                onChange={e => updateBorrador(b.id, 'fuente_url', e.target.value)}
                                disabled={saved}
                                placeholder="https://..."
                                className={iCls}
                              />
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-1">
                            {b.yaExiste && !saved ? (
                              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">Ya en catálogo</span>
                              </div>
                            ) : <div />}
                            <button
                              onClick={() => handleSaveBorrador(b)}
                              disabled={!!savingId || saved || b.yaExiste}
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                                saved
                                  ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                  : b.yaExiste 
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                  : 'bg-[#0c1e3c] hover:bg-blue-900 text-white disabled:opacity-60'
                              }`}
                            >
                              {savingId === b.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : saved
                                ? <CheckCircle2 className="h-3.5 w-3.5" />
                                : <PlusCircle className="h-3.5 w-3.5" />}
                              {saved ? 'Guardado en catálogo' : b.yaExiste ? 'Evento duplicado' : 'Guardar en catálogo'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Manual form */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">Crear evento manualmente</h2>
              </div>
              <form onSubmit={handleCreateEvento} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre *</label>
                    <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="PDAC 2027"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción *</label>
                    <textarea required rows={3} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                      placeholder="Descripción oficial del evento..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Tema</label>
                    <select value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400">
                      <option value="">Sin tema</option>
                      {TEMAS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo de entrada</label>
                    <input value={form.costo_entrada} onChange={e => setForm(f => ({ ...f, costo_entrada: e.target.value }))}
                      placeholder="Standard: $500 USD"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha inicio *</label>
                    <input required type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha fin *</label>
                    <input required type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Ciudad</label>
                    <input value={form.ciudad} onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
                      placeholder="Toronto"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">País</label>
                    <input value={form.pais} onChange={e => setForm(f => ({ ...f, pais: e.target.value }))}
                      placeholder="Canada"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">URL fuente oficial</label>
                    <input type="url" value={form.fuente_url} onChange={e => setForm(f => ({ ...f, fuente_url: e.target.value }))}
                      placeholder="https://www.pdac.ca"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                </div>

                {formResult === 'ok' && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Evento creado en el catálogo global.
                  </div>
                )}
                {formResult === 'error' && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" /> Error al guardar. Verifica los datos.
                  </div>
                )}

                <div className="flex justify-end">
                  <button type="submit" disabled={formSaving}
                    className="flex items-center gap-2 rounded-xl bg-[#0c1e3c] hover:bg-blue-900 text-white px-6 py-2.5 text-sm font-semibold transition-colors shadow-sm disabled:opacity-60">
                    {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    Crear evento
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2 — Estadísticas del Catálogo
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'stats' && (
          <>
            {statsLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            )}
            {!statsLoading && (
              <>
                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total eventos', value: statsEventos.length, color: 'text-slate-700' },
                    { label: 'Próximos 90 días', value: proximos, color: 'text-blue-700' },
                    { label: 'Futuros (total)', value: futuros, color: 'text-indigo-700' },
                    { label: 'Pasados', value: pasados, color: 'text-slate-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 text-center">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                      <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* By tema */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-indigo-500" /> Por Tema
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(byTema).sort((a, b) => b[1] - a[1]).map(([tema, count]) => (
                        <div key={tema}>
                          <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span className="font-medium">{tema}</span>
                            <span className="text-slate-400">{count}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${(count / maxTema) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* By pais */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" /> Top 5 Países
                    </h3>
                    <div className="space-y-3">
                      {topPaises.map(([pais, count]) => (
                        <div key={pais}>
                          <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span className="font-medium">{pais}</span>
                            <span className="text-slate-400">{count}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${(count / maxPais) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3 — Inteligencia de Usuarios
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'usuarios' && (
          <>
            {usuariosLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            )}
            {!usuariosLoading && vistosError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-amber-800">Tabla eventos_vistos no existe</h3>
                </div>
                <p className="text-xs text-amber-700">Ejecuta este SQL en Supabase → SQL Editor para crear la tabla de tracking:</p>
                <pre className="bg-white border border-amber-200 rounded-xl p-4 text-xs text-slate-700 overflow-x-auto leading-relaxed">
                  {SQL_EVENTOS_VISTOS}
                </pre>
              </div>
            )}
            {!usuariosLoading && !vistosError && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 text-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Usuarios únicos (7d)</p>
                    <p className="text-3xl font-bold text-blue-700">{usuariosUnicosVistos}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 text-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Vistas totales (7d)</p>
                    <p className="text-3xl font-bold text-indigo-700">{vistosRecientes.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 text-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Eventos distintos vistos</p>
                    <p className="text-3xl font-bold text-slate-700">{Object.keys(byEventoVisto).length}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-500" /> Top 5 Eventos Más Vistos
                  </h3>
                  {topVistos.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Sin datos de vistas registradas aún.</p>
                  ) : (
                    <div className="space-y-2">
                      {topVistos.map(([eventoId, count], i) => (
                        <div key={eventoId} className="flex items-center gap-3 text-sm">
                          <span className="text-xs font-bold text-slate-300 w-4 text-right">{i + 1}</span>
                          <span className="flex-1 text-slate-600 font-mono text-xs">{eventoId.slice(0, 12)}…</span>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{count} vistas</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
                    <h3 className="text-sm font-semibold text-slate-700">Sesiones recientes</h3>
                  </div>
                  {eventosVistos.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Sin sesiones registradas aún.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left px-6 py-3 font-semibold text-slate-400 uppercase tracking-wide">Session</th>
                            <th className="text-left px-6 py-3 font-semibold text-slate-400 uppercase tracking-wide">Evento</th>
                            <th className="text-left px-6 py-3 font-semibold text-slate-400 uppercase tracking-wide">Duración</th>
                            <th className="text-left px-6 py-3 font-semibold text-slate-400 uppercase tracking-wide">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {eventosVistos.slice(0, 20).map(v => (
                            <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3 font-mono text-slate-500">{(v.session_id ?? '—').slice(0, 10)}…</td>
                              <td className="px-6 py-3 text-slate-600 font-mono">{(v.evento_id ?? '—').slice(0, 10)}…</td>
                              <td className="px-6 py-3 text-slate-500">{v.duracion_segundos != null ? `${v.duracion_segundos}s` : '—'}</td>
                              <td className="px-6 py-3 text-slate-400">{new Date(v.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4 — Perfiles de Interés
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'perfiles' && (
          <>
            {perfilesLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            )}
            {!perfilesLoading && (
              <>
                {/* Commercial value note */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 flex gap-4">
                  <TrendingUp className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-blue-800">Valor Comercial — Datos de Intención de Viaje</p>
                    <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                      Estos datos representan intención de viaje real — valor comercial para aerolíneas, hoteles y sponsors de eventos.
                      Cada usuario que marca "Confirmado Asistente" es un viajero corporativo confirmado con necesidades de hospedaje,
                      transporte y servicios en destino.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* By estado */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-500" /> Por Estado de Asistencia
                    </h3>
                    {Object.keys(byEstado).length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Sin datos de asistencias aún.</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(byEstado).sort((a, b) => b[1] - a[1]).map(([estado, count]) => (
                          <div key={estado} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{ESTADO_LABELS[estado] ?? estado}</p>
                              <p className="text-xs text-slate-400">{count} usuario{count !== 1 ? 's' : ''}</p>
                            </div>
                            <span className="text-2xl font-bold text-indigo-600">{count}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuarios únicos totales</p>
                          <span className="text-lg font-bold text-slate-700">{usuariosUnicos}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top events */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" /> Top Eventos con más Asistencias
                    </h3>
                    {topEventos.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Sin datos de asistencias aún.</p>
                    ) : (
                      <div className="space-y-3">
                        {topEventos.map((ev, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-lg font-bold text-slate-200 w-5 text-right shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{ev.nombre}</p>
                              <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${(ev.count / (topEventos[0]?.count ?? 1)) * 100}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm font-bold text-emerald-600 shrink-0">{ev.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 5 — Sugerencias Pendientes
        ══════════════════════════════════════════════════════════════ */}
        {tab === 'sugerencias' && (
          <>
            {sugerenciasLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            )}

            {!sugerenciasLoading && sugerencias.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Inbox className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">Sin sugerencias pendientes</p>
                <p className="text-xs text-slate-400">Las propuestas enviadas desde el formulario público aparecerán aquí.</p>
              </div>
            )}

            {!sugerenciasLoading && sugerencias.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-medium">
                  {sugerencias.length} sugerencia{sugerencias.length !== 1 ? 's' : ''} pendiente{sugerencias.length !== 1 ? 's' : ''} de revisión
                </p>

                {sugerencias.map(s => (
                  <div key={s.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                    {/* Card header */}
                    <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            s.tipo === 'evento'    ? 'bg-blue-100 text-blue-700' :
                            s.tipo === 'tematica'  ? 'bg-indigo-100 text-indigo-700' :
                            s.tipo === 'geografia' ? 'bg-emerald-100 text-emerald-700' :
                                                     'bg-amber-100 text-amber-700'
                          }`}>
                            {s.tipo === 'evento'    ? 'Evento' :
                             s.tipo === 'tematica'  ? 'Temática' :
                             s.tipo === 'geografia' ? 'Geografía' : 'Otra'}
                          </span>
                        </div>
                        <p className="text-base font-bold text-slate-800 leading-tight">{s.nombre}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Recibida el {new Date(s.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="shrink-0 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                        Pendiente
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">

                      {s.descripcion && (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Descripción</p>
                          <p className="text-slate-600 leading-relaxed text-xs">{s.descripcion}</p>
                        </div>
                      )}

                      {(s.fecha_inicio || s.fecha_fin) && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Fechas</p>
                          <p className="text-slate-700 flex items-center gap-1.5 text-xs">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {s.fecha_inicio ?? '—'} → {s.fecha_fin ?? '—'}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Ubicación</p>
                        <p className="text-slate-700 flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {[s.ciudad, s.pais].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>

                      {s.tema && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Tema</p>
                          <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded">
                            {s.tema}
                          </span>
                        </div>
                      )}

                      {s.fuente_url && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Sitio web</p>
                          <a
                            href={s.fuente_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs flex items-center gap-1 truncate"
                          >
                            <Link2 className="h-3 w-3 shrink-0" />
                            {s.fuente_url}
                          </a>
                        </div>
                      )}

                      {(s.nombre_contacto || s.email_contacto) && (
                        <div className="sm:col-span-2 border-t border-slate-100 pt-3 mt-1">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Contacto</p>
                          <p className="text-slate-600 text-xs flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {[s.nombre_contacto, s.email_contacto].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card footer — acciones */}
                    <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleRechazar(s.id)}
                        disabled={processingId === s.id}
                        className="flex items-center gap-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {processingId === s.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <ThumbsDown className="h-4 w-4" />}
                        Rechazar
                      </button>
                      <button
                        onClick={() => handleAprobar(s)}
                        disabled={processingId === s.id}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                      >
                        {processingId === s.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <ThumbsUp className="h-4 w-4" />}
                        Aprobar y publicar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
      </div>
    </div>
  )
}
