'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { EventoAgenda, EstadoAgenda, NoticiaEvento } from '@/types/database'
import {
  ArrowLeft, CalendarDays, MapPin, Tag, ExternalLink,
  Download, Loader2, Newspaper, Share2, X, CheckCircle2,
  Trash2, Send, Globe, Clock,
} from 'lucide-react'

const ESTADO_COLORS: Record<EstadoAgenda, string> = {
  evaluacion: 'bg-amber-100 text-amber-800 border-amber-300',
  confirmado_visita: 'bg-blue-100 text-blue-800 border-blue-300',
  confirmado_auspiciador: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  descartado: 'bg-slate-100 text-slate-600 border-slate-300',
}

const ESTADO_LABELS: Record<EstadoAgenda, string> = {
  evaluacion: 'Evaluando ir',
  confirmado_visita: 'Confirmado (Asistente)',
  confirmado_auspiciador: 'Confirmado (Sponsor)',
  descartado: 'No me interesa',
}

function downloadIcs(e: EventoAgenda) {
  const fmt = (d: string) => d.replace(/-/g, '')
  const loc = [e.ciudad, e.pais].filter(Boolean).join(', ')
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${fmt(e.fecha_inicio)}`,
    `DTEND;VALUE=DATE:${fmt(e.fecha_fin)}`,
    `SUMMARY:${e.nombre}`,
    `DESCRIPTION:${e.descripcion ?? ''}`,
    loc ? `LOCATION:${loc}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${e.nombre.replace(/\s+/g, '_')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function EventoDetallePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise)
  const eventoId = params?.id

  const [session, setSession] = useState<any>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [evento, setEvento] = useState<EventoAgenda | null>(null)
  const [estadoAsistencia, setEstadoAsistencia] = useState<EstadoAgenda | null>(null)
  const [noticias, setNoticias] = useState<NoticiaEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [savingStatus, setSavingStatus] = useState(false)
  const [savedStatus, setSavedStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [shareModal, setShareModal] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareNote, setShareNote] = useState('')
  const [tabActual, setTabActual] = useState<'descripcion' | 'prensa'>('descripcion')

  async function checkDemoStatus(userId: string) {
    try {
      const { data } = await supabase.from('perfiles_usuarios').select('es_demo').eq('user_id', userId).maybeSingle()
      if (data) setIsDemo(!!data.es_demo)
    } catch (e) {
      console.error('Error checking demo status:', e)
    }
  }

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        checkDemoStatus(session.user.id)
        localStorage.removeItem('isGuest')
      } else {
        setIsGuest(localStorage.getItem('isGuest') === 'true')
      }
      setSessionLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s)
      if (s) checkDemoStatus(s.user.id)
      setSessionLoaded(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchData = useCallback(async () => {
    if (!eventoId || (!session?.user?.id && !isGuest)) return
    setLoading(true)

    try {
      const [{ data: ev, error: evErr }, { data: asist }, { data: news }] = await Promise.all([
        supabase.from('eventos_agenda').select('*').eq('id', eventoId).maybeSingle(),
        session?.user?.id
          ? supabase
              .from('asistencias_eventos')
              .select('estado_asistencia')
              .eq('user_id', session.user.id)
              .eq('evento_id', eventoId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('noticias_eventos')
          .select('*')
          .eq('evento_id', eventoId)
          .order('fecha_publicacion', { ascending: false })
          .limit(5),
      ])

      if (evErr || !ev) {
        setNotFound(true)
      } else {
        setEvento(ev)
        setEstadoAsistencia((asist as any)?.estado_asistencia ?? null)
        setNoticias((news as any) ?? [])
      }
    } catch (e) {
      console.error('Error fetching data:', e)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [eventoId, session, isGuest])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusChange(nuevoEstado: EstadoAgenda) {
    if (!session?.user?.id || !eventoId) return
    setSavingStatus(true)

    if (estadoAsistencia) {
      await supabase
        .from('asistencias_eventos')
        .update({ estado_asistencia: nuevoEstado })
        .eq('user_id', session.user.id)
        .eq('evento_id', eventoId)
    } else {
      await supabase
        .from('asistencias_eventos')
        .insert({ user_id: session.user.id, evento_id: eventoId, estado_asistencia: nuevoEstado })
    }

    setEstadoAsistencia(nuevoEstado)
    setSavedStatus(true)
    setTimeout(() => setSavedStatus(false), 2500)
    setSavingStatus(false)
  }

  async function handleDelete() {
    if (!session?.user?.id || !eventoId) return
    if (!window.confirm('¿Desvincularte de este evento?')) return
    setDeleting(true)
    await supabase
      .from('asistencias_eventos')
      .delete()
      .eq('user_id', session.user.id)
      .eq('evento_id', eventoId)
    setEstadoAsistencia(null)
    setDeleting(false)
  }

  function handleShare() {
    if (!evento) return
    const loc = [evento.ciudad, evento.pais].filter(Boolean).join(', ')
    const dateStr = new Date(evento.fecha_inicio).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
    const body = [
      'Hola,',
      '',
      'Te comparto información sobre el siguiente evento de la agenda corporativa:',
      '',
      `📍 ${evento.nombre}`,
      `📅 ${dateStr}`,
      loc ? `📌 ${loc}` : '',
      evento.descripcion ? `\n${evento.descripcion}` : '',
      evento.fuente_url ? `\n🔗 Más info: ${evento.fuente_url}` : '',
      shareNote ? `\nNota personal: ${shareNote}` : '',
      '',
      'Saludos,',
      'Agenda Corporativa',
    ].filter(l => l !== null).join('\n')

    window.open(
      `mailto:${shareEmail}?subject=${encodeURIComponent(`Te comparto: ${evento.nombre}`)}&body=${encodeURIComponent(body)}`,
      '_blank',
    )
    setShareModal(false)
    setShareEmail('')
    setShareNote('')
  }

  // Guards
  if (!sessionLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!session && !isGuest) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  if (notFound || !evento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-sm w-full">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Evento no encontrado</h2>
          <p className="text-slate-500 text-sm mb-6">El evento que buscas no existe o ha sido eliminado del catálogo.</p>
          <Link href="/" className="inline-block bg-[#0c1e3c] text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors">
            Volver al Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const dateStart = new Date(evento.fecha_inicio).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const dateEnd = new Date(evento.fecha_fin).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const loc = [evento.ciudad, evento.pais].filter(Boolean).join(', ')
  const durDays =
    Math.ceil(
      (new Date(evento.fecha_fin).getTime() - new Date(evento.fecha_inicio).getTime()) /
      (1000 * 60 * 60 * 24),
    ) + 1

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <div className="bg-[#0c1e3c] text-white px-8 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-300/70 hover:text-blue-200 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Mi Agenda Corporativa
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${isGuest ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isGuest ? 'Modo Demo' : 'Evento Corporativo'}
              </span>
              {evento.tema && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border border-white/20 text-white/80 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> {evento.tema}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold leading-tight">{evento.nombre}</h1>
          </div>
          {estadoAsistencia && (
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${ESTADO_COLORS[estadoAsistencia]}`}>
              {ESTADO_LABELS[estadoAsistencia]}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm text-blue-200/70 mt-5">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 flex-shrink-0" />
            {dateStart} — {dateEnd}
          </span>
          {loc && (
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" /> {loc}
            </span>
          )}
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" /> {durDays} día{durDays !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-slate-50 min-h-[calc(100vh-280px)]">
        {/* Left: tabs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              {([
                { key: 'descripcion', label: 'Descripción', Icon: Globe },
                { key: 'prensa',      label: 'Radar de Prensa', Icon: Newspaper },
              ] as const).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTabActual(key)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    tabActual === key
                      ? 'border-indigo-500 text-indigo-700 bg-indigo-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tabActual === 'descripcion' && (
                <>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {evento.descripcion || 'Sin descripción disponible.'}
                  </p>
                  {evento.fuente_url && (
                    <a
                      href={evento.fuente_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-800 mt-4 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Sitio oficial del evento
                    </a>
                  )}
                </>
              )}

              {tabActual === 'prensa' && (
                noticias.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">
                    No hay noticias recientes en la base de datos para este evento.
                  </p>
                ) : (
                  <div className="space-y-5 divide-y divide-slate-50">
                    {noticias.map(n => (
                      <div key={n.id} className="pt-5 first:pt-0">
                        <a
                          href={n.url_fuente}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-indigo-900 hover:text-indigo-600 hover:underline leading-tight block text-sm"
                        >
                          {n.titular}
                        </a>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-3">{n.resumen}</p>
                        <span className="text-[10px] font-medium text-slate-400 block mt-1.5">
                          {new Date(n.fecha_publicacion).toLocaleDateString('es-MX', {
                            day: '2-digit', month: 'long', year: 'numeric',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right: attendance + actions */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-700">Mi Asistencia</h3>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mi Interés en Asistir</label>
              <div className="space-y-3">
                <select
                  disabled={loading || isGuest}
                  className={`w-full text-sm border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 py-3 px-4 font-semibold text-slate-700 bg-slate-50 transition-all ${isGuest ? 'opacity-60 cursor-not-allowed' : ''}`}
                  value={estadoAsistencia || ''}
                  onChange={(e) => handleStatusChange(e.target.value as EstadoAgenda)}
                >
                  <option value="" disabled>Selecciona tu estado...</option>
                  <option value="evaluacion">Evaluando ir</option>
                  <option value="confirmado_visita">Confirmado (Asistente)</option>
                  <option value="confirmado_auspiciador">Confirmado (Sponsor)</option>
                  <option value="descartado">No me interesa</option>
                </select>

                {savingStatus && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Guardando...
                  </div>
                )}
                {savedStatus && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Estado actualizado
                  </div>
                )}
                {estadoAsistencia && !isGuest && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors mt-2"
                  >
                    {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Desvincularme del evento
                  </button>
                )}
                
                {isGuest && (
                  <p className="text-[10px] text-blue-600 font-medium text-center mt-2 px-2">
                    Inicia sesión con tu cuenta corporativa para gestionar tu asistencia.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-700">Acciones</h3>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => setShareModal(true)}
                disabled={isGuest}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 px-4 py-3 text-sm font-medium text-slate-700 hover:text-indigo-700 transition-colors disabled:opacity-40"
              >
                <Share2 className="h-4 w-4 text-indigo-500" />
                Compartir por email
              </button>
              <button
                onClick={() => downloadIcs(evento!)}
                disabled={isGuest}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors disabled:opacity-40"
              >
                <Download className="h-4 w-4 text-slate-400" />
                Bajar archivo .ics
              </button>
              <button
                onClick={() => alert('Sincronización con Google Calendar (Requiere Token OAuth).')}
                className="w-full flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 px-4 py-3 text-sm font-medium text-blue-700 transition-colors"
              >
                🗓️ Sincronizar Calendario
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Share modal ────────────────────────────────────────── */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-white/20">
            <div className="flex items-center justify-between bg-[#0c1e3c] text-white px-6 py-5">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-blue-300" />
                <h2 className="text-base font-semibold">Compartir por email</h2>
              </div>
              <button
                onClick={() => setShareModal(false)}
                className="text-blue-200/60 hover:text-white rounded-md p-1.5 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                <p className="text-sm font-semibold text-indigo-900">{evento.nombre}</p>
                <p className="text-xs text-indigo-600 mt-1">{dateStart}{loc ? ` · ${loc}` : ''}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  Para (destinatario)
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={e => setShareEmail(e.target.value)}
                  placeholder="colega@empresa.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">
                  Nota adicional <span className="text-slate-400">(opcional)</span>
                </label>
                <textarea
                  value={shareNote}
                  onChange={e => setShareNote(e.target.value)}
                  rows={3}
                  placeholder="¿Por qué es relevante este evento para tu contacto?"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShareModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#0c1e3c] py-2.5 text-sm font-medium text-white hover:bg-blue-900 transition-colors shadow-sm"
                >
                  <Send className="h-4 w-4" /> Abrir en Email
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Abre tu cliente de email con el mensaje pre-completado.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
