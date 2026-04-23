'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { EventoAgenda, EstadoAgenda, NoticiaEvento } from '@/types/database'
import {
  ArrowLeft, CalendarDays, MapPin, Tag, ExternalLink,
  Download, Loader2, Newspaper, Share2, X, CheckCircle2,
  Trash2, Send, Globe, Clock, LogIn,
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'

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

export default function EventoDetallePage() {
  const params = useParams<{ id: string }>()
  const eventoId = params?.id

  const [session, setSession] = useState<any>(null)

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchData = useCallback(async () => {
    if (!eventoId) return
    setLoading(true)

    try {
      const [{ data: ev, error: evErr }, asistResult, { data: news }] = await Promise.all([
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
        setEstadoAsistencia((asistResult as any).data?.estado_asistencia ?? null)
        setNoticias(news ?? [])
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [eventoId, session])

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

  async function handleDesvincular() {
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

  if (loading && !evento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (notFound || !evento) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <p className="text-slate-500 text-sm">Evento no encontrado.</p>
        <Link href="/" className="text-indigo-600 hover:underline text-sm">← Volver al Dashboard</Link>
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
    <>
      {session && <Sidebar />}
      <div className={session ? 'sm:ml-20 lg:ml-64' : ''}>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <div className="bg-[#0c1e3c] text-white px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-blue-300/70 hover:text-blue-200 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Agenda Corporativa
            </Link>
            {!session && (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-bold bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 px-3 py-1.5 rounded-lg transition-colors border border-blue-400/30"
              >
                <LogIn className="h-3.5 w-3.5" /> Iniciar Sesión
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {evento.tema && (
              <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border border-white/20 text-white/80 flex items-center gap-1">
                <Tag className="h-3 w-3" /> {evento.tema}
              </span>
            )}
            {estadoAsistencia && (
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${ESTADO_COLORS[estadoAsistencia]}`}>
                {ESTADO_LABELS[estadoAsistencia]}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold leading-tight mb-5">{evento.nombre}</h1>

          <div className="flex flex-wrap items-center gap-5 text-sm text-blue-200/70">
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
          {/* Left: description + news */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4" /> Descripción Oficial
              </h2>
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
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700">Radar de Prensa Automatizado</h2>
              </div>
              <div className="p-6">
                {noticias.length === 0 ? (
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
                )}
              </div>
            </div>
          </div>

          {/* Right: attendance + actions */}
          <div className="space-y-4">
            {/* Attendance */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-700">Mi Asistencia</h3>
              </div>
              <div className="p-5 space-y-3">
                {!session?.user?.id ? (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center space-y-3">
                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                      Inicia sesión con tu cuenta corporativa para registrar tu asistencia a este evento.
                    </p>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      <LogIn className="h-3.5 w-3.5" /> Iniciar Sesión
                    </Link>
                  </div>
                ) : (
                  <>
                    <select
                      value={estadoAsistencia ?? ''}
                      onChange={e => handleStatusChange(e.target.value as EstadoAgenda)}
                      disabled={savingStatus}
                      className="w-full text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-3 font-medium text-slate-700 bg-white shadow-sm transition"
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

                    {estadoAsistencia && (
                      <button
                        onClick={handleDesvincular}
                        disabled={deleting}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium py-2 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                      >
                        {deleting
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                        Desvincularme de este evento
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-700">Acciones</h3>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => setShareModal(true)}
                  disabled={!session?.user?.id}
                  title={!session?.user?.id ? 'Inicia sesión para compartir' : undefined}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 px-4 py-3 text-sm font-medium text-slate-700 hover:text-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Share2 className="h-4 w-4 text-indigo-500" />
                  Compartir por email
                </button>
                <button
                  onClick={() => downloadIcs(evento)}
                  disabled={!session?.user?.id}
                  title={!session?.user?.id ? 'Inicia sesión para descargar' : undefined}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 text-slate-400" />
                  Bajar archivo .ics
                </button>
                <button
                  onClick={() => alert('Sincronización con Google Calendar (Requiere Token OAuth).')}
                  disabled={!session?.user?.id}
                  title={!session?.user?.id ? 'Solo disponible en plan B2B' : undefined}
                  className="w-full flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 px-4 py-3 text-sm font-medium text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🗓️ Sincronizar Calendario
                </button>
              </div>
            </div>

            {/* Event meta */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Datos del evento
              </h3>
              {loc && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">{loc}</span>
                </div>
              )}
              <div className="flex items-start gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600">{dateStart} — {dateEnd}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Clock className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600">{durDays} día{durDays !== 1 ? 's' : ''} de duración</span>
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
    </>
  )
}
