'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { RadarEvento, EstadoRadar, TrackingCosto } from '@/types/database'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import {
  Loader2, X, BarChart2, TrendingUp, TrendingDown, Minus,
  ExternalLink, Plane, BedDouble, CalendarDays, CheckCircle2,
  Clock, Target,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import Link from 'next/link'
import { TEMAS } from '@/app/radar/page'

const TEMA_COLORS: Record<string, string> = {
  'Innovación': 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200',
  'Maquinaria': 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  'Finanzas':   'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  'Geología':   'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
  'Energía':    'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  'Minería':    'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200',
  'Otro':       'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
}
const TEMA_ACTIVE: Record<string, string> = {
  'Innovación': 'bg-violet-600 text-white border-violet-600',
  'Maquinaria': 'bg-orange-500 text-white border-orange-500',
  'Finanzas':   'bg-blue-600 text-white border-blue-600',
  'Geología':   'bg-amber-600 text-white border-amber-600',
  'Energía':    'bg-yellow-500 text-white border-yellow-500',
  'Minería':    'bg-stone-600 text-white border-stone-600',
  'Otro':       'bg-slate-600 text-white border-slate-600',
}

const CalendarioWrapper = dynamic(
  () => import('@/components/CalendarioWrapper'),
  { ssr: false, loading: () => <CalSkeleton /> },
)

// ── Color config ─────────────────────────────────────────────────────────

const ESTADO_COLOR: Record<EstadoRadar, string> = {
  ventana_optima:   '#10b981',
  buscando_precios: '#f59e0b',
  expirado:         '#94a3b8',
}

const SEMAPHORE: Record<EstadoRadar, { dot: string; badge: string; label: string; pulse: boolean }> = {
  ventana_optima:   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Ventana óptima',  pulse: true  },
  buscando_precios: { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Monitoreando',   pulse: false },
  expirado:         { dot: 'bg-slate-300',   badge: 'bg-slate-100 text-slate-500 border-slate-200',      label: 'Expirado',       pulse: false },
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

// ── Page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [radares, setRadares]       = useState<RadarEvento[]>([])
  const [loading, setLoading]       = useState(true)
  const [temaActivo, setTemaActivo] = useState<string | null>(null)

  // Historial modal
  const [histRadar, setHistRadar]   = useState<RadarEvento | null>(null)
  const [tracking, setTracking]     = useState<TrackingCosto[]>([])
  const [trackLoading, setTrackLoading] = useState(false)

  const fetchRadares = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('radar_eventos')
      .select('*')
      .neq('estado_radar', 'expirado')
      .order('fecha_estimada')
    setRadares(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRadares() }, [fetchRadares])

  // Temas que realmente tienen eventos cargados
  const temasConEventos = TEMAS.filter(t => radares.some(r => r.tema === t))

  const radaresVisibles = temaActivo
    ? radares.filter(r => r.tema === temaActivo)
    : radares

  const calendarEvents: EventInput[] = radaresVisibles.map(r => ({
    id:              r.id,
    title:           r.nombre_clave,
    start:           r.fecha_estimada,
    backgroundColor: ESTADO_COLOR[r.estado_radar],
    borderColor:     ESTADO_COLOR[r.estado_radar],
    textColor:       '#fff',
    extendedProps:   { data: r },
  }))

  function handleEventClick(arg: EventClickArg) {
    openHistorial(arg.event.extendedProps.data as RadarEvento)
  }

  async function openHistorial(r: RadarEvento) {
    setHistRadar(r); setTrackLoading(true)
    const { data } = await supabase
      .from('tracking_costos').select('*')
      .eq('radar_id', r.id).order('created_at')
    setTracking(data ?? []); setTrackLoading(false)
  }

  const counts = {
    ventana_optima:   radares.filter(r => r.estado_radar === 'ventana_optima').length,
    buscando_precios: radares.filter(r => r.estado_radar === 'buscando_precios').length,
    total:            radares.length,
  }
  const proximos30 = radares.filter(r => {
    const dias = Math.ceil((new Date(r.fecha_estimada).getTime() - Date.now()) / 86400000)
    return dias >= 0 && dias <= 30
  }).length

  const chartData   = buildChart(tracking)
  const latestVuelo = [...tracking].filter(t => t.tipo === 'vuelo').pop()
  const latestHotel = [...tracking].filter(t => t.tipo === 'hotel').pop()

  return (
    <div className="p-8 space-y-6">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0c1e3c]">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Calendario global de eventos validados en Radar
          </p>
        </div>
        <Link
          href="/radar"
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 shadow-sm"
        >
          <Target className="h-4 w-4" />
          Ir al Radar IA
        </Link>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Eventos en Radar', value: counts.total,            icon: CalendarDays,  color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Ventana óptima',   value: counts.ventana_optima,   icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Monitoreando',     value: counts.buscando_precios, icon: BarChart2,     color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Próximos 30 días', value: proximos30,              icon: Clock,         color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`rounded-lg p-2.5 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              <p className="text-xl font-semibold text-[#0c1e3c]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tema pins ─────────────────────────────────────────────────── */}
      {temasConEventos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1">Filtrar por tema:</span>
          <button
            onClick={() => setTemaActivo(null)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              temaActivo === null
                ? 'bg-[#0c1e3c] text-white border-[#0c1e3c]'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos ({radares.length})
          </button>
          {temasConEventos.map(tema => {
            const count  = radares.filter(r => r.tema === tema).length
            const active = temaActivo === tema
            return (
              <button
                key={tema}
                onClick={() => setTemaActivo(prev => prev === tema ? null : tema)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? (TEMA_ACTIVE[tema] ?? 'bg-slate-600 text-white border-slate-600')
                    : (TEMA_COLORS[tema] ?? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200')
                }`}
              >
                {tema} · {count}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Leyenda:</span>
        {[
          { color: '#10b981', label: 'Ventana óptima — comprar ahora' },
          { color: '#f59e0b', label: 'Monitoreando precios' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
        <span className="text-slate-400 ml-2">Haz clic en un evento para ver costos actuales</span>
      </div>

      {/* ── Calendar ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-1">
        {loading
          ? <CalSkeleton />
          : <CalendarioWrapper events={calendarEvents} onEventClick={handleEventClick} />
        }
      </div>

      {/* ── Active radar list ──────────────────────────────────────────── */}
      {radaresVisibles.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Monitores activos ({radaresVisibles.length}{temaActivo ? ` · ${temaActivo}` : ''})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide text-left">
                  <th className="px-4 py-2.5 font-medium w-6" />
                  <th className="px-4 py-2.5 font-medium">Evento</th>
                  <th className="px-4 py-2.5 font-medium">Tema</th>
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ppto. Vuelo SCL</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ppto. Hotel/noche</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {radaresVisibles.map(r => {
                  const s    = SEMAPHORE[r.estado_radar]
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
                      <td className="px-4 py-3">
                        {r.tema
                          ? <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${TEMA_COLORS[r.tema] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>{r.tema}</span>
                          : <span className="text-slate-300 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        <p>{new Date(r.fecha_estimada).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <p className={`mt-0.5 ${dias < 0 ? 'text-red-400' : dias < 30 ? 'text-amber-500' : 'text-slate-400'}`}>
                          {dias < 0 ? 'Pasado' : `en ${dias}d`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 text-sm">
                        {r.presupuesto_max_vuelo != null
                          ? <span className="flex items-center justify-end gap-1"><Plane className="h-3 w-3 text-sky-400" />{fmt(r.presupuesto_max_vuelo, r.moneda)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 text-sm">
                        {r.presupuesto_max_noche != null
                          ? <span className="flex items-center justify-end gap-1"><BedDouble className="h-3 w-3 text-amber-400" />{fmt(r.presupuesto_max_noche, r.moneda)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openHistorial(r)}
                          title="Ver costos actuales"
                          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <BarChart2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {radares.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No hay eventos en el Radar todavía.</p>
          <Link href="/radar" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
            Ir al Radar IA a cazar eventos
          </Link>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: Costos actuales trackeados
      ══════════════════════════════════════════════════════════════ */}
      {histRadar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">

            {/* Header */}
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
                {histRadar.fuente_url && (
                  <a href={histRadar.fuente_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-200/60 hover:text-white rounded-md p-1.5 hover:bg-white/10">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
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
                    <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Plane className="h-4 w-4 text-sky-500" />
                        <p className="text-xs font-semibold text-sky-700">Vuelo SCL →</p>
                      </div>
                      {latestVuelo
                        ? <>
                            <p className="text-xl font-bold text-[#0c1e3c]">{fmt(latestVuelo.precio_obtenido, latestVuelo.moneda)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <DeltaBadge precio={latestVuelo.precio_obtenido} ppto={histRadar.presupuesto_max_vuelo} />
                              <span className="text-xs text-slate-400">vs ppto. {histRadar.presupuesto_max_vuelo ? fmt(histRadar.presupuesto_max_vuelo, histRadar.moneda) : '—'}</span>
                            </div>
                          </>
                        : <p className="text-sm text-slate-400 mt-1">Sin datos aún</p>
                      }
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <BedDouble className="h-4 w-4 text-amber-500" />
                        <p className="text-xs font-semibold text-amber-700">Hotel / noche</p>
                      </div>
                      {latestHotel
                        ? <>
                            <p className="text-xl font-bold text-[#0c1e3c]">{fmt(latestHotel.precio_obtenido, latestHotel.moneda)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <DeltaBadge precio={latestHotel.precio_obtenido} ppto={histRadar.presupuesto_max_noche} />
                              <span className="text-xs text-slate-400">vs ppto. {histRadar.presupuesto_max_noche ? fmt(histRadar.presupuesto_max_noche, histRadar.moneda) : '—'}</span>
                            </div>
                          </>
                        : <p className="text-sm text-slate-400 mt-1">Sin datos aún</p>
                      }
                    </div>
                  </div>

                  {/* Chart */}
                  {chartData.length > 0 ? (
                    <>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Evolución de precios</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }}
                            tickFormatter={v => new Date(v).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} width={55} />
                          <Tooltip
                            formatter={(v, name) => [typeof v === 'number' ? `${histRadar.moneda} ${v.toFixed(2)}` : String(v), name === 'vuelo' ? '✈ Vuelo SCL' : '🏨 Hotel/noche']}
                            labelFormatter={l => new Date(l).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                          />
                          <Legend formatter={v => v === 'vuelo' ? '✈ Vuelo SCL' : '🏨 Hotel/noche'} iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          {histRadar.presupuesto_max_vuelo && (
                            <ReferenceLine y={histRadar.presupuesto_max_vuelo} stroke="#0ea5e9" strokeDasharray="5 4" strokeWidth={1.5}
                              label={{ value: 'Ppto. vuelo', fontSize: 9, fill: '#0ea5e9', position: 'insideTopRight' }} />
                          )}
                          {histRadar.presupuesto_max_noche && (
                            <ReferenceLine y={histRadar.presupuesto_max_noche} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={1.5}
                              label={{ value: 'Ppto. hotel', fontSize: 9, fill: '#f59e0b', position: 'insideTopRight' }} />
                          )}
                          <Line type="monotone" dataKey="vuelo" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          <Line type="monotone" dataKey="hotel" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                      <BarChart2 className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Sin datos. Usa "Simular precios" en el Radar para generar el primer registro.</p>
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
                                <td className="px-4 py-2 text-slate-500">
                                  {new Date(t.fecha_consulta).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${t.tipo === 'vuelo' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {t.tipo === 'vuelo' ? '✈ SCL' : '🏨'} {t.tipo}
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
    </div>
  )
}

function CalSkeleton() {
  return (
    <div className="h-[540px] flex items-center justify-center text-slate-300 gap-2">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Cargando calendario…</span>
    </div>
  )
}
