'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { cazarEvento } from '@/app/actions/cazar-evento'
import type { EventoBorrador } from '@/app/actions/cazar-evento'
import type { RadarEvento, RadarEventoInsert, EstadoRadar, TrackingCosto } from '@/types/database'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import {
  Search, Loader2, X, AlertTriangle, CheckCircle2, ExternalLink,
  Sparkles, BarChart2, Plus, Pencil, Trash2, RefreshCw,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

// Dynamic import to avoid SSR issues with FullCalendar DOM access
const CalendarioWrapper = dynamic(
  () => import('@/components/CalendarioWrapper'),
  { ssr: false, loading: () => <CalSkeleton /> },
)

// ── Color config ────────────────────────────────────────────────────────

const ESTADO_COLOR: Record<EstadoRadar, string> = {
  ventana_optima:   '#10b981',
  buscando_precios: '#f59e0b',
  expirado:         '#94a3b8',
}

const SEMAPHORE: Record<EstadoRadar, { dot: string; badge: string; label: string; pulse: boolean }> = {
  ventana_optima:   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Ventana óptima', pulse: true  },
  buscando_precios: { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Monitoreando',   pulse: false },
  expirado:         { dot: 'bg-slate-300',   badge: 'bg-slate-100 text-slate-500 border-slate-200',      label: 'Expirado',       pulse: false },
}

const ESTADOS: EstadoRadar[] = ['buscando_precios', 'ventana_optima', 'expirado']
const MONEDAS = ['USD', 'EUR', 'MXN', 'COP', 'ARS']

const EMPTY_FORM: RadarEventoInsert = {
  nombre_clave: '', fecha_estimada: '', ciudad: null, pais: null,
  fuente_url: null, estado_radar: 'buscando_precios',
  presupuesto_max_noche: null, presupuesto_max_vuelo: null, moneda: 'USD',
}

function inp() {
  return 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition'
}
function fmt(n: number, m = 'USD') {
  return `${m} ${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
type ChartPoint = { fecha: string; vuelo?: number; hotel?: number }
function buildChart(data: TrackingCosto[]): ChartPoint[] {
  const map: Record<string, ChartPoint> = {}
  for (const t of data) {
    if (!map[t.fecha_consulta]) map[t.fecha_consulta] = { fecha: t.fecha_consulta }
    map[t.fecha_consulta][t.tipo] = t.precio_obtenido
  }
  return Object.values(map).sort((a, b) => a.fecha.localeCompare(b.fecha))
}
function DeltaBadge({ precio, ppto }: { precio: number | null; ppto: number | null }) {
  if (precio == null || ppto == null) return <span className="text-slate-300 text-xs">—</span>
  const pct = ((precio - ppto) / ppto) * 100
  const Icon = pct > 1 ? TrendingUp : pct < -1 ? TrendingDown : Minus
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pct > 1 ? 'text-red-600' : pct < -1 ? 'text-emerald-600' : 'text-slate-400'}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function RadarPage() {
  // Radar data
  const [radares, setRadares]         = useState<RadarEvento[]>([])
  const [loading, setLoading]         = useState(true)

  // AI search
  const [query, setQuery]             = useState('')
  const [borradores, setBorradores]   = useState<EventoBorrador[]>([])
  const [aiSource, setAiSource]       = useState<string | null>(null)
  const [aiError, setAiError]         = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  // CRUD modal
  const [crudOpen, setCrudOpen]       = useState(false)
  const [editId, setEditId]           = useState<string | null>(null)
  const [form, setForm]               = useState<RadarEventoInsert>(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState<string | null>(null)
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)

  // Borrador validation modal
  const [selectedBorrador, setSelectedBorrador] = useState<EventoBorrador | null>(null)
  const [validating, setValidating]   = useState(false)

  // Historial modal
  const [histRadar, setHistRadar]     = useState<RadarEvento | null>(null)
  const [tracking, setTracking]       = useState<TrackingCosto[]>([])
  const [trackLoading, setTrackLoading] = useState(false)

  // Cron sim
  const [cronLoading, setCronLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // ── Fetch radares ──
  const fetchRadares = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('radar_eventos').select('*').order('fecha_estimada')
    setRadares(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRadares() }, [fetchRadares])

  // ── Build calendar events ──
  const calendarEvents: EventInput[] = [
    // Existing radar events
    ...radares.map(r => ({
      id:              r.id,
      title:           r.nombre_clave,
      start:           r.fecha_estimada,
      backgroundColor: ESTADO_COLOR[r.estado_radar],
      borderColor:     ESTADO_COLOR[r.estado_radar],
      textColor:       '#fff',
      extendedProps:   { type: 'radar', data: r },
    })),
    // AI draft events
    ...borradores.map(b => ({
      id:              b.id,
      title:           `🔍 ${b.nombre}`,
      start:           b.fecha_inicio,
      end:             b.fecha_fin,
      backgroundColor: '#8b5cf6',
      borderColor:     '#7c3aed',
      textColor:       '#fff',
      extendedProps:   { type: 'borrador', data: b },
    })),
  ]

  // ── Calendar click ──
  function handleEventClick(arg: EventClickArg) {
    const { type, data } = arg.event.extendedProps
    if (type === 'borrador') {
      setSelectedBorrador(data as EventoBorrador)
    } else {
      openHistorial(data as RadarEvento)
    }
  }

  // ── AI Search ──
  async function handleBuscar() {
    if (!query.trim() || isPending) return
    setAiError(null); setAiSource(null)
    startTransition(async () => {
      const result = await cazarEvento(query)
      setBorradores(result.borradores)
      setAiSource(result.fuente)
      if (result.error) setAiError(result.error)
    })
  }

  // ── Validate borrador → save to radar_eventos ──
  async function handleValidar(b: EventoBorrador) {
    setValidating(true)
    const payload: RadarEventoInsert = {
      nombre_clave:          b.nombre,
      fecha_estimada:        b.fecha_inicio,
      ciudad:                b.ciudad,
      pais:                  b.pais,
      fuente_url:            b.fuente_url,
      estado_radar:          'buscando_precios',
      presupuesto_max_noche: null,
      presupuesto_max_vuelo: null,
      moneda:                'USD',
    }
    const { error } = await supabase.from('radar_eventos').insert(payload)
    setValidating(false)
    if (error) { alert(error.message); return }
    // Remove from drafts, refresh radares
    setBorradores(prev => prev.filter(x => x.id !== b.id))
    setSelectedBorrador(null)
    fetchRadares()
  }

  // ── CRUD ──
  function openCrear() {
    setForm(EMPTY_FORM); setEditId(null); setFormError(null); setCrudOpen(true)
  }
  function openEditar(r: RadarEvento) {
    const { id, created_at, updated_at, ...rest } = r
    setForm(rest); setEditId(id); setFormError(null); setCrudOpen(true)
  }
  function closeCrud() { setCrudOpen(false); setFormError(null) }
  function field(key: keyof RadarEventoInsert, val: string | null) {
    setForm(p => ({ ...p, [key]: val === '' ? null : val }))
  }
  async function handleSave() {
    if (!form.nombre_clave.trim()) { setFormError('El nombre clave es requerido.'); return }
    if (!form.fecha_estimada)      { setFormError('La fecha estimada es requerida.'); return }
    setSaving(true); setFormError(null)
    const payload = {
      ...form,
      presupuesto_max_noche: form.presupuesto_max_noche ? Number(form.presupuesto_max_noche) : null,
      presupuesto_max_vuelo: form.presupuesto_max_vuelo ? Number(form.presupuesto_max_vuelo) : null,
    }
    const { error } = editId
      ? await supabase.from('radar_eventos').update(payload).eq('id', editId)
      : await supabase.from('radar_eventos').insert(payload)
    setSaving(false)
    if (error) { setFormError(error.message); return }
    closeCrud(); fetchRadares()
  }
  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('radar_eventos').delete().eq('id', deleteId)
    setDeleting(false); setDeleteId(null); fetchRadares()
  }

  // ── Historial ──
  async function openHistorial(r: RadarEvento) {
    setHistRadar(r); setTrackLoading(true)
    const { data } = await supabase
      .from('tracking_costos').select('*')
      .eq('radar_id', r.id).order('created_at')
    setTracking(data ?? []); setTrackLoading(false)
  }

  // ── Cron sim ──
  async function triggerCron() {
    setCronLoading(true)
    try {
      const res  = await fetch('/api/cron', { headers: { Authorization: 'Bearer gestor-viajes-cron-2026' } })
      const json = await res.json()
      if (json.processed > 0) fetchRadares()
      alert(`✓ ${json.processed} radar(es) actualizados con precios simulados.`)
    } catch { alert('Error al ejecutar el cron.') }
    setCronLoading(false)
  }

  const counts = {
    ventana_optima:   radares.filter(r => r.estado_radar === 'ventana_optima').length,
    buscando_precios: radares.filter(r => r.estado_radar === 'buscando_precios').length,
    expirado:         radares.filter(r => r.estado_radar === 'expirado').length,
  }

  const chartData   = buildChart(tracking)
  const latestVuelo = [...tracking].filter(t => t.tipo === 'vuelo').pop()
  const latestHotel = [...tracking].filter(t => t.tipo === 'hotel').pop()

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0c1e3c]">Radar Estratégico</h1>
          <p className="text-sm text-slate-500 mt-1">Motor de IA · Monitor de precios y ventanas de compra</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={triggerCron} disabled={cronLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {cronLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Simular precios
          </button>
          <button onClick={openCrear}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
            <Plus className="h-4 w-4" />
            Nuevo monitor
          </button>
        </div>
      </div>

      {/* ── Caza de Eventos (AI Search) ──────────────────────────────── */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <h2 className="text-sm font-semibold text-violet-900">Caza de Eventos</h2>
          <span className="text-xs text-violet-400 font-medium">Motor IA</span>
        </div>
        <p className="text-xs text-violet-700/70">
          Escribe el nombre de un evento o conferencia y la IA buscará fechas, país y link oficial.
          El resultado aparecerá en el calendario como borrador — haz clic para validarlo.
        </p>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              placeholder='ej. PDAC, ADIPEC, Coaltrans, Davos...'
              className="w-full rounded-xl border border-violet-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-violet-300 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <button
            onClick={handleBuscar}
            disabled={isPending || !query.trim()}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Consultando IA…</>
              : <><Sparkles className="h-4 w-4" />Buscar</>
            }
          </button>
        </div>

        {/* AI result banner */}
        {borradores.length > 0 && (
          <div className="flex flex-col gap-3 rounded-lg bg-violet-100 border border-violet-200 px-4 py-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-violet-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-violet-800">
                  <strong>¡Éxito! La IA encontró {borradores.length} evento(s)</strong>.
                  {aiSource === 'mock' && (
                    <span className="ml-2 text-violet-500 text-xs">(modo demo)</span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {borradores.map(b => (
                    <button 
                      key={b.id} 
                      onClick={() => setSelectedBorrador(b)} 
                      className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 shadow-sm transition-transform active:scale-95"
                    >
                      <Sparkles className="h-3 w-3" />
                      Ver y Validar: {b.nombre}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setBorradores([])} className="text-violet-400 hover:text-violet-700 p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        {aiError && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            IA: {aiError} — mostrando datos de demostración.
          </div>
        )}
      </div>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {([
          ['ventana_optima',   '#10b981', '🟢', 'Ventana óptima'],
          ['buscando_precios', '#f59e0b', '🟡', 'Monitoreando'],
          ['expirado',         '#94a3b8', '⚪', 'Expirados'],
        ] as const).map(([key, , emoji, label]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-[#0c1e3c]">{counts[key]}</p>
            <p className="text-xs text-slate-500 mt-1">{emoji} {label}</p>
          </div>
        ))}
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
          <p className="text-2xl font-bold text-violet-700">{borradores.length}</p>
          <p className="text-xs text-violet-500 mt-1">🔍 Borradores IA</p>
        </div>
      </div>

      {/* ── Leyenda ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Leyenda:</span>
        {[
          { color: '#10b981', label: 'Ventana óptima (comprar)' },
          { color: '#f59e0b', label: 'Monitoreando' },
          { color: '#94a3b8', label: 'Expirado' },
          { color: '#8b5cf6', label: 'Borrador IA (pendiente validar)' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* ── Calendar ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-1">
        <CalendarioWrapper events={calendarEvents} onEventClick={handleEventClick} />
      </div>

      {/* ── Radar table (collapsible list below calendar) ─────────────── */}
      {radares.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Monitores activos ({radares.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide text-left">
                  <th className="px-4 py-2.5 font-medium w-6" />
                  <th className="px-4 py-2.5 font-medium">Evento</th>
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ppto. Vuelo</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ppto. Hotel</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {radares.map(r => {
                  const s = SEMAPHORE[r.estado_radar]
                  const dias = Math.ceil((new Date(r.fecha_estimada).getTime() - Date.now()) / 86400000)
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-4 py-3">
                        <span className="relative flex h-2.5 w-2.5">
                          {s.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60`} />}
                          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${s.dot}`} />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0c1e3c]">{r.nombre_clave}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{[r.ciudad, r.pais].filter(Boolean).join(', ') || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        <p>{new Date(r.fecha_estimada).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <p className={`mt-0.5 ${dias < 0 ? 'text-red-400' : dias < 30 ? 'text-amber-500' : 'text-slate-400'}`}>
                          {dias < 0 ? 'Pasado' : `${dias}d`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                        {r.presupuesto_max_vuelo != null ? fmt(r.presupuesto_max_vuelo, r.moneda) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                        {r.presupuesto_max_noche != null ? fmt(r.presupuesto_max_noche, r.moneda) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openHistorial(r)} title="Historial" className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600">
                            <BarChart2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => openEditar(r)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(r.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: Borrador IA → Validar
      ══════════════════════════════════════════════════════════════ */}
      {selectedBorrador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-violet-200" />
                    <span className="text-xs font-medium text-violet-200 uppercase tracking-wide">Borrador encontrado por IA</span>
                  </div>
                  <h2 className="text-lg font-bold leading-snug">{selectedBorrador.nombre}</h2>
                </div>
                <button onClick={() => setSelectedBorrador(null)} className="text-white/60 hover:text-white rounded-md p-1.5 hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600">{selectedBorrador.descripcion}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="📅 Inicio"   value={new Date(selectedBorrador.fecha_inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })} />
                <InfoRow label="📅 Fin"      value={new Date(selectedBorrador.fecha_fin).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })} />
                <InfoRow label="🏙 Ciudad"   value={selectedBorrador.ciudad} />
                <InfoRow label="🌎 País"     value={selectedBorrador.pais} />
              </div>

              {/* Source link */}
              <a
                href={selectedBorrador.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{selectedBorrador.fuente_url}</span>
              </a>

              {/* Confidence */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${Math.round(selectedBorrador.confianza * 100)}%` }}
                  />
                </div>
                <span>Confianza IA: {Math.round(selectedBorrador.confianza * 100)}%</span>
              </div>

              <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
                Al validar, este evento se registrará en el Radar y comenzará a monitorear precios.
                Podrás configurar los presupuestos máximos desde la tabla.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setSelectedBorrador(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Descartar
              </button>
              <button
                onClick={() => handleValidar(selectedBorrador)}
                disabled={validating}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 shadow-md transition-colors"
              >
                {validating
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <CheckCircle2 className="h-5 w-5" />}
                VALIDAR — Iniciar tracking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: Historial de precios
      ══════════════════════════════════════════════════════════════ */}
      {histRadar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 bg-[#0c1e3c] text-white px-6 py-4">
              <div>
                <h2 className="font-semibold">{histRadar.nombre_clave}</h2>
                <p className="text-xs text-blue-200/70 mt-0.5">
                  {[histRadar.ciudad, histRadar.pais].filter(Boolean).join(', ')} ·{' '}
                  {new Date(histRadar.fecha_estimada).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${SEMAPHORE[histRadar.estado_radar].badge}`}>
                  {SEMAPHORE[histRadar.estado_radar].label}
                </span>
                <button onClick={() => setHistRadar(null)} className="text-blue-200/60 hover:text-white rounded-md p-1.5 hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {trackLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Cargando historial…</span>
                </div>
              ) : (
                <>
                  {/* Latest prices */}
                  <div className="grid grid-cols-2 gap-4">
                    {([['vuelo', latestVuelo, histRadar.presupuesto_max_vuelo, '✈ Vuelo'] , ['hotel', latestHotel, histRadar.presupuesto_max_noche, '🏨 Hotel/noche']] as const).map(
                      ([, latest, ppto, label]) => (
                        <div key={label as string} className="rounded-xl border border-slate-200 p-4">
                          <p className="text-xs text-slate-500 font-medium">{label}</p>
                          {latest
                            ? <>
                                <p className="text-xl font-bold text-[#0c1e3c] mt-1">{fmt(latest.precio_obtenido, latest.moneda)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <DeltaBadge precio={latest.precio_obtenido} ppto={ppto as number | null} />
                                  <span className="text-xs text-slate-400">vs ppto. {ppto ? fmt(ppto as number, histRadar.moneda) : '—'}</span>
                                </div>
                              </>
                            : <p className="text-sm text-slate-400 mt-1">Sin datos</p>
                          }
                        </div>
                      )
                    )}
                  </div>

                  {/* Chart */}
                  {chartData.length > 0 ? (
                    <>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Evolución de precios</p>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }}
                            tickFormatter={v => new Date(v).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} width={55} />
                          <Tooltip
                            formatter={(v, name) => [typeof v === 'number' ? `${histRadar.moneda} ${v.toFixed(2)}` : String(v), name === 'vuelo' ? 'Vuelo' : 'Hotel/noche']}
                            labelFormatter={l => new Date(l).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                          />
                          <Legend formatter={v => v === 'vuelo' ? '✈ Vuelo' : '🏨 Hotel/noche'} iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          {histRadar.presupuesto_max_vuelo && (
                            <ReferenceLine y={histRadar.presupuesto_max_vuelo} stroke="#3b82f6" strokeDasharray="5 4" strokeWidth={1.5}
                              label={{ value: 'Ppto. vuelo', fontSize: 9, fill: '#3b82f6', position: 'insideTopRight' }} />
                          )}
                          {histRadar.presupuesto_max_noche && (
                            <ReferenceLine y={histRadar.presupuesto_max_noche} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={1.5}
                              label={{ value: 'Ppto. hotel', fontSize: 9, fill: '#f59e0b', position: 'insideTopRight' }} />
                          )}
                          <Line type="monotone" dataKey="vuelo" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          <Line type="monotone" dataKey="hotel" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                      <BarChart2 className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Sin datos. Usa "Simular precios" para generar el primer registro.</p>
                    </div>
                  )}

                  {/* Raw table */}
                  {tracking.length > 0 && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 uppercase tracking-wide">
                            <th className="px-4 py-2 text-left font-medium">Fecha</th>
                            <th className="px-4 py-2 text-left font-medium">Tipo</th>
                            <th className="px-4 py-2 text-right font-medium">Precio</th>
                            <th className="px-4 py-2 text-right font-medium">vs Ppto.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {[...tracking].reverse().map(t => {
                            const ppto = t.tipo === 'vuelo' ? histRadar.presupuesto_max_vuelo : histRadar.presupuesto_max_noche
                            return (
                              <tr key={t.id} className="hover:bg-slate-50/40">
                                <td className="px-4 py-2 text-slate-500">{new Date(t.fecha_consulta).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${t.tipo === 'vuelo' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {t.tipo === 'vuelo' ? '✈' : '🏨'} {t.tipo}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-semibold text-[#0c1e3c]">{fmt(t.precio_obtenido, t.moneda)}</td>
                                <td className="px-4 py-2 text-right"><DeltaBadge precio={t.precio_obtenido} ppto={ppto} /></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: CRUD Monitor
      ══════════════════════════════════════════════════════════════ */}
      {crudOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 z-10">
              <h2 className="text-sm font-semibold text-[#0c1e3c]">
                {editId ? 'Editar monitor' : 'Nuevo monitor de precio'}
              </h2>
              <button onClick={closeCrud} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />{formError}
                </div>
              )}
              <Sec title="Identificación">
                <Fld label="Nombre clave *">
                  <input type="text" value={form.nombre_clave} onChange={e => setForm(p => ({ ...p, nombre_clave: e.target.value }))} placeholder='ej. "PDAC 2027"' className={inp()} />
                </Fld>
                <div className="grid grid-cols-2 gap-4">
                  <Fld label="Ciudad"><input type="text" value={form.ciudad ?? ''} onChange={e => field('ciudad', e.target.value)} placeholder="Toronto" className={inp()} /></Fld>
                  <Fld label="País"><input type="text" value={form.pais ?? ''} onChange={e => field('pais', e.target.value)} placeholder="Canadá" className={inp()} /></Fld>
                </div>
                <Fld label="URL oficial">
                  <input type="url" value={form.fuente_url ?? ''} onChange={e => field('fuente_url', e.target.value)} placeholder="https://…" className={inp()} />
                </Fld>
              </Sec>
              <Sec title="Fechas y estado">
                <div className="grid grid-cols-2 gap-4">
                  <Fld label="Fecha estimada *">
                    <input type="date" value={form.fecha_estimada} onChange={e => setForm(p => ({ ...p, fecha_estimada: e.target.value }))} className={inp()} />
                  </Fld>
                  <Fld label="Estado">
                    <select value={form.estado_radar} onChange={e => field('estado_radar', e.target.value)} className={inp()}>
                      {ESTADOS.map(s => <option key={s} value={s}>{SEMAPHORE[s].label}</option>)}
                    </select>
                  </Fld>
                </div>
              </Sec>
              <Sec title="Presupuestos máximos">
                <Fld label="Moneda">
                  <select value={form.moneda} onChange={e => setForm(p => ({ ...p, moneda: e.target.value }))} className={inp()}>
                    {MONEDAS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </Fld>
                <div className="grid grid-cols-2 gap-4">
                  <Fld label="Vuelo (total)">
                    <input type="number" min="0" value={form.presupuesto_max_vuelo ?? ''} onChange={e => field('presupuesto_max_vuelo', e.target.value)} placeholder="950" className={inp()} />
                  </Fld>
                  <Fld label="Hotel (por noche)">
                    <input type="number" min="0" value={form.presupuesto_max_noche ?? ''} onChange={e => field('presupuesto_max_noche', e.target.value)} placeholder="180" className={inp()} />
                  </Fld>
                </div>
              </Sec>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button onClick={closeCrud} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 shadow-sm">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editId ? 'Guardar cambios' : 'Crear monitor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ──────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-2"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              <div>
                <h3 className="text-sm font-semibold text-[#0c1e3c]">Eliminar monitor</h3>
                <p className="text-sm text-slate-500 mt-1">Se eliminará todo el historial de precios asociado.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Micro-components ────────────────────────────────────────────────────

function CalSkeleton() {
  return (
    <div className="h-[540px] flex items-center justify-center text-slate-300 gap-2">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Cargando calendario…</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800 mt-0.5">{value}</p>
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">{title}</h3>
      {children}
    </div>
  )
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      {children}
    </div>
  )
}
