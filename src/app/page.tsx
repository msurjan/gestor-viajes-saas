'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { EventoAgenda, EstadoAgenda, AsistenciaEvento } from '@/types/database'
import { cazarEvento, type EventoBorrador } from '@/app/actions/cazar-evento'
import type { EventInput } from '@fullcalendar/core'
import Link from 'next/link'
import {
  Loader2, X, CalendarDays, Search, ExternalLink, Download, MapPin, Tag, ArrowRight, CheckCircle2, Map as MapIcon, Trash2, LogIn, Newspaper, ArrowUpRight, LayoutGrid, Globe
} from 'lucide-react'
import Marketplace from '@/components/Marketplace'

const CalendarioWrapper = dynamic(() => import('@/components/CalendarioWrapper'), { ssr: false, loading: () => <CalSkeleton /> })
const MapaEventos = dynamic(() => import('@/components/MapaEventos'), { ssr: false, loading: () => <CalSkeleton /> })

const ESTADO_COLORS: Record<EstadoAgenda, string> = {
  evaluacion: 'bg-amber-100 text-amber-800 border-amber-300',
  confirmado_visita: 'bg-blue-100 text-blue-800 border-blue-300',
  confirmado_auspiciador: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  descartado: 'bg-slate-100 text-slate-600 border-slate-300',
}

const TEMAS_DISPONIBLES = ['Innovación', 'Maquinaria', 'Finanzas', 'Geología', 'Energía', 'Minería', 'Otro']

type EventoConAsistencia = EventoAgenda & { estado?: EstadoAgenda }

type ModalData = 
  | { type: 'borrador', data: EventoBorrador }
  | { type: 'agenda', data: EventoConAsistencia }

function addOneDay(dateStr: string): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().split('T')[0]
}

function downloadIcs(e: EventoBorrador | EventoConAsistencia) {
  const fmt = (d: string) => d.replace(/-/g, '')
  const loc = [e.ciudad, e.pais].filter(Boolean).join(', ')
  const endDate = addOneDay(e.fecha_fin)   // Outlook requires exclusive end date
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${fmt(e.fecha_inicio)}`,
    `DTEND;VALUE=DATE:${fmt(endDate)}`,
    `SUMMARY:${e.nombre}`,
    `DESCRIPTION:${e.descripcion}`,
    loc ? `LOCATION:${loc}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
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

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [eventos, setEventos] = useState<EventoConAsistencia[]>([])
  const [borradores, setBorradores] = useState<EventoBorrador[]>([])
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const [modal, setModal] = useState<ModalData | null>(null)
  const [savingStatus, setSavingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [filtrosTema, setFiltrosTema] = useState<string[]>([])
  const [vistaActual, setVistaActual] = useState<'calendario' | 'mapa' | 'eventos'>('calendario')
  
  const [noticiasModal, setNoticiasModal] = useState<any[]>([])
  const [loadingNoticias, setLoadingNoticias] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        checkDemoStatus(session.user.id)
        localStorage.removeItem('isGuest') // If logged in, not a guest
      } else {
        const guest = localStorage.getItem('isGuest') === 'true'
        setIsGuest(guest)
      }
      setSessionLoaded(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        checkDemoStatus(session.user.id)
      }
      setSessionLoaded(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkDemoStatus(userId: string) {
    const { data } = await supabase
      .from('perfiles_usuarios')
      .select('es_demo')
      .eq('user_id', userId)
      .single()
    if (data) {
      setIsDemo(!!data.es_demo)
    }
  }

  const fetchEventos = useCallback(async () => {
    if (!session?.user?.id && !isGuest) {
      setLoading(false)
      return
    }
    setLoading(true)
    
    // 1. Obtenemos TODOS los eventos del catálogo global
    const { data: globalEvents, error: errGlobal } = await supabase
      .from('eventos_agenda')
      .select('*')
      .order('fecha_inicio')

    // 2. Obtenemos las asistencias específicas de este usuario (solo si no es invitado)
    let asistencias: any[] = []
    if (session?.user?.id) {
      const { data } = await supabase
        .from('asistencias_eventos')
        .select('evento_id, estado_asistencia')
        .eq('user_id', session.user.id)
      asistencias = data ?? []
    }

    if (globalEvents && !errGlobal) {
      const asistMap = new Map()
      if (asistencias) {
        asistencias.forEach(a => asistMap.set(a.evento_id, a.estado_asistencia))
      }

      const misEventos: EventoConAsistencia[] = globalEvents.map((e: any) => ({
        ...e,
        estado: asistMap.get(e.id) // undefined si el usuario no ha interactuado
      }))
      
      setEventos(misEventos)
    }
    setLoading(false)
  }, [session])

  useEffect(() => { fetchEventos() }, [fetchEventos])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setIsSearching(true)
    const res = await cazarEvento(query)
    
    if (res.borradores.length > 0) {
      // Filtrar los que ya existen en el catálogo global (por nombre exacto o muy similar)
      const nuevosValidos = res.borradores.filter(b => {
        const nomBorrador = b.nombre.toLowerCase().trim()
        // Si hay algún evento global que contenga el nombre del borrador o viceversa
        return !eventos.some(e => {
          const nomGlobal = e.nombre.toLowerCase().trim()
          return nomGlobal.includes(nomBorrador) || nomBorrador.includes(nomGlobal)
        })
      })

      if (nuevosValidos.length === 0) {
        alert("Los eventos que encontró la IA ya se encuentran en el Catálogo Global.")
        setQuery('')
      } else {
        setBorradores(prev => {
          const newD = nuevosValidos.filter(b => !prev.some(p => p.id === b.id))
          return [...newD, ...prev]
        })
        setQuery('')
      }
    } else {
      alert("No se encontraron resultados.")
    }
    setIsSearching(false)
  }

  const eventosFiltrados = eventos.filter(e => filtrosTema.length === 0 || (e.tema && filtrosTema.includes(e.tema)))
  const borradoresFiltrados = borradores.filter(b => filtrosTema.length === 0 || (b.tema && filtrosTema.includes(b.tema)))

  const calendarEvents: EventInput[] = [
    ...eventosFiltrados.map(e => ({
      id: e.id,
      title: e.nombre,
      start: e.fecha_inicio,
      end: e.fecha_fin,
      className: e.estado ? ESTADO_COLORS[e.estado] : 'bg-slate-50 text-slate-500 border-slate-200 border-dashed border',
      extendedProps: { type: 'agenda', data: e }
    })),
    ...borradoresFiltrados.map(b => ({
      id: b.id,
      title: `[IA] ${b.nombre}`,
      start: b.fecha_inicio,
      end: b.fecha_fin,
      className: 'bg-indigo-50 text-indigo-700 border-indigo-300 border-dashed border',
      extendedProps: { type: 'borrador', data: b }
    }))
  ]

  async function handleEventClick(arg: any) {
    const modalData = arg.event.extendedProps as ModalData
    setModal(modalData)
    
    // Si es un evento global, cargamos sus noticias
    if (modalData.type === 'agenda') {
      setLoadingNoticias(true)
      const { data } = await supabase.from('noticias_eventos').select('*').eq('evento_id', modalData.data.id).order('fecha_publicacion', { ascending: false }).limit(3)
      setNoticiasModal(data ?? [])
      setLoadingNoticias(false)
    } else {
      setNoticiasModal([])
    }
  }

  async function handleStatusChange(nuevoEstado: EstadoAgenda) {
    if (!modal || !session?.user) return
    
    if (isDemo) {
      alert("Estás en modo DEMO. En esta versión de prueba no se guardan tus preferencias de asistencia en la cuenta.")
      setModal(null)
      return
    }

    setSavingStatus(true)

    try {
      if (modal.type === 'borrador') {
        const b = modal.data
        // 1. Insertar evento en catálogo global
        const insertData: any = {
            nombre: b.nombre,
            descripcion: b.descripcion,
            fecha_inicio: b.fecha_inicio,
            fecha_fin: b.fecha_fin,
            ciudad: b.ciudad,
            pais: b.pais,
            lat: b.lat,
            lng: b.lng,
            fuente_url: b.fuente_url,
            tema: b.tema,
            ...(b.costo_entrada ? { costo_entrada: b.costo_entrada } : {}),
            ...(b.imagen_url ? { imagen_url: b.imagen_url } : {}),
        }
        const { data: ev, error: errEv } = await supabase.from('eventos_agenda').insert(insertData).select().single()

        if (errEv || !ev) throw errEv

        // 2. Asociar usuario al evento
        const { error: errAsist } = await supabase.from('asistencias_eventos').insert({
          user_id: session.user.id,
          evento_id: ev.id,
          estado_asistencia: nuevoEstado
        })

        if (errAsist) throw errAsist

        setBorradores(prev => prev.filter(x => x.id !== b.id))
        await fetchEventos()
      } else {
        // Actualizar el estado del usuario para este evento
        const a = modal.data
        const { error } = await supabase.from('asistencias_eventos').update({ 
          estado_asistencia: nuevoEstado 
        }).eq('user_id', session.user.id).eq('evento_id', a.id)
        
        if (error) throw error
        await fetchEventos()
      }
      setModal(null)
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleDelete() {
    if (!modal || !session?.user) return
    const confirmDelete = window.confirm(modal.type === 'borrador' ? "¿Descartar este borrador?" : "¿Desvincularte de este evento?")
    if (!confirmDelete) return

    setDeleting(true)
    try {
      if (modal.type === 'borrador') {
        setBorradores(prev => prev.filter(x => x.id !== modal.data.id))
      } else {
        // En M2M, eliminar la asistencia, no el evento global
        const { error } = await supabase.from('asistencias_eventos').delete()
          .eq('user_id', session.user.id)
          .eq('evento_id', modal.data.id)
        if (!error) {
          await fetchEventos()
        } else {
          alert("Error al eliminar: " + error.message)
        }
      }
      setModal(null)
    } finally {
      setDeleting(false)
    }
  }

  async function handleAutoScheduleGoogle() {
    alert("Sincronización silenciosa con Google Calendar (Requiere Token OAuth). Esta funcionalidad enviará el evento directamente a tu calendario corporativo vía API.")
  }

  function toggleFiltro(tema: string) {
    setFiltrosTema(prev => prev.includes(tema) ? prev.filter(t => t !== tema) : [...prev, tema])
  }

  // --- UI NO AUTENTICADO ---
  if (!sessionLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
  }

  if (!session && !isGuest) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      
      {isGuest && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600">
            <Globe className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-900">Modo Invitado (Lectura)</p>
            <p className="text-xs text-blue-700">Estás explorando el catálogo global. Para guardar eventos en tu agenda personal, por favor inicia sesión o crea una cuenta.</p>
          </div>
          <Link 
            href="/login" 
            onClick={() => localStorage.removeItem('isGuest')}
            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Iniciar Sesión
          </Link>
        </div>
      )}

      {isDemo && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 shadow-sm mb-4">
          <div className="bg-amber-100 p-2 rounded-full text-amber-600">
            <Tag className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">Versión Demo Activada</p>
            <p className="text-xs text-amber-700">Explora el catálogo y el radar de prensa. Las preferencias de eventos no se guardarán en esta cuenta gratuita.</p>
          </div>
          <button className="text-xs font-bold text-amber-800 bg-amber-200/50 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
            Adquirir Plan B2B
          </button>
        </div>
      )}
      
      {/* ── Header & Cazador ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0c1e3c]">Mi Agenda Corporativa</h1>
          <p className="text-sm text-slate-500 mt-1">
            Catálogo global B2B. Asistencias individuales.
          </p>
        </div>
        
        {!isGuest && (
          <form onSubmit={handleSearch} className="relative w-full lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
              <input
                type="text"
                placeholder="Cazar evento con IA (ej. PDAC 2027)..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full rounded-full border border-indigo-200 bg-indigo-50/50 py-2.5 pl-10 pr-24 text-sm text-slate-800 placeholder-indigo-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                disabled={isSearching}
              />
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="absolute right-1 top-1 bottom-1 rounded-full bg-indigo-600 px-4 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* ── Main View (Map or Calendar) ──────────────────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase mr-1">Filtrar:</span>
              {TEMAS_DISPONIBLES.map(tema => (
                <button
                  key={tema}
                  onClick={() => toggleFiltro(tema)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${filtrosTema.includes(tema) ? 'bg-[#0c1e3c] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {tema}
                </button>
              ))}
            </div>

            <div className="bg-slate-100 p-1 rounded-lg inline-flex items-center self-start">
              <button
                onClick={() => setVistaActual('calendario')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${vistaActual === 'calendario' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <CalendarDays className="h-4 w-4" /> Calendario
              </button>
              <button
                onClick={() => setVistaActual('mapa')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${vistaActual === 'mapa' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <MapIcon className="h-4 w-4" /> Mapa
              </button>
              <button
                onClick={() => setVistaActual('eventos')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${vistaActual === 'eventos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid className="h-4 w-4" /> Eventos
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${vistaActual === 'eventos' ? '' : 'p-1 min-h-[600px]'} flex flex-col`}>
            {loading ? <CalSkeleton /> : (
              vistaActual === 'calendario'
                ? <CalendarioWrapper events={calendarEvents} onEventClick={handleEventClick} />
                : vistaActual === 'mapa'
                ? <MapaEventos events={calendarEvents} onEventClick={handleEventClick} />
                : <Marketplace eventos={eventosFiltrados} isDemo={isDemo} />
            )}
          </div>
        </div>

        {/* ── Sidebar Panels ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          
          <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="bg-indigo-50/50 border-b border-indigo-100 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                <Search className="h-4 w-4 text-indigo-500" />
                Por Validar (IA)
              </h3>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{borradoresFiltrados.length}</span>
            </div>
            <div className="p-3 overflow-y-auto max-h-[300px] flex-1 space-y-2 bg-slate-50/30">
              {borradoresFiltrados.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Busca eventos en el catálogo global.</p>
              ) : (
                borradoresFiltrados.map(b => (
                  <button 
                    key={b.id}
                    onClick={() => setModal({ type: 'borrador', data: b })}
                    className="w-full text-left rounded-xl bg-white border border-indigo-100 p-3 hover:border-indigo-300 hover:shadow-sm transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold text-indigo-900 leading-tight pr-6">{b.nombre}</p>
                      <ArrowRight className="h-4 w-4 text-indigo-300 group-hover:text-indigo-600 absolute right-3 top-3 transition-colors" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/> {new Date(b.fecha_inicio).toLocaleDateString('es-MX', {day: '2-digit', month: 'short'})}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {b.ciudad}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                Mi Asistencia
              </h3>
              <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{eventosFiltrados.length}</span>
            </div>
            <div className="p-3 overflow-y-auto max-h-[400px] flex-1 space-y-2">
              {eventosFiltrados.filter(e => e.estado).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No has confirmado asistencia a ningún evento.</p>
              ) : (
                eventosFiltrados.filter(e => e.estado).map(e => (
                  <button 
                    key={e.id}
                    onClick={() => setModal({ type: 'agenda', data: e })}
                    className="w-full text-left rounded-xl bg-white border border-slate-100 p-3 hover:border-slate-300 hover:shadow-sm transition-all group"
                  >
                    <p className="text-sm font-medium text-slate-800 leading-tight mb-1.5">{e.nombre}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md ${e.estado ? ESTADO_COLORS[e.estado] : ''}`}>
                        {e.estado ? e.estado.replace('_', ' ') : ''}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(e.fecha_inicio).toLocaleDateString('es-MX', {month: 'short', year: '2-digit'})}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Modal Evento ──────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col border border-white/20">
            
            <div className="flex items-start justify-between border-b border-slate-100 bg-[#0c1e3c] text-white px-6 py-5">
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${modal.type === 'borrador' ? 'bg-indigo-500 text-white' : modal.data.estado ? 'bg-emerald-500 text-white' : 'bg-white/20 text-blue-100'}`}>
                    {modal.type === 'borrador' ? 'Cacería IA' : modal.data.estado ? 'Mi Asistencia' : 'Catálogo Global'}
                  </span>
                  {modal.data.tema && (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-white/20 text-white/80 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {modal.data.tema}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold leading-tight">{modal.data.nombre}</h2>
                <div className="flex items-center gap-3 text-xs text-blue-200/70 mt-2">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5"/> 
                    {new Date(modal.data.fecha_inicio).toLocaleDateString('es-MX', {day: '2-digit', month: 'short', year: 'numeric'})}
                  </span>
                  {modal.data.ciudad && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/> 
                      {[modal.data.ciudad, modal.data.pais].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setModal(null)} className="text-blue-200/60 hover:text-white rounded-md p-1.5 hover:bg-white/10 shrink-0 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descripción Oficial</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{modal.data.descripcion || 'Sin descripción disponible.'}</p>
                {modal.data.fuente_url && (
                  <a href={modal.data.fuente_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-800 mt-2">
                    <ExternalLink className="h-3.5 w-3.5" /> Enlace de la Organización
                  </a>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Mi Interés en Asistir</label>
                  <select 
                    disabled={savingStatus || isGuest}
                    className={`w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm py-2 px-3 font-medium text-slate-700 bg-white ${isGuest ? 'opacity-60 cursor-not-allowed' : ''}`}
                    value={modal.type === 'agenda' ? modal.data.estado : ''}
                    onChange={(e) => handleStatusChange(e.target.value as EstadoAgenda)}
                  >
                    {modal.type === 'borrador' && <option value="" disabled>Selecciona tu estado de asistencia...</option>}
                    <option value="evaluacion">Evaluando ir</option>
                    <option value="confirmado_visita">Confirmado (Asistente)</option>
                    <option value="confirmado_auspiciador">Confirmado (Sponsor)</option>
                    <option value="descartado">No me interesa</option>
                  </select>
                </div>
                {savingStatus && <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto" />}
              </div>

              {/* Módulo de Noticias B2B (Solo en Agenda Global) */}
              {modal.type === 'agenda' && (
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Newspaper className="h-4 w-4" /> Radar de Prensa Automatizado
                  </h4>
                  {loadingNoticias ? (
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" /> Buscando actualizaciones en el mercado...
                    </div>
                  ) : noticiasModal.length > 0 ? (
                    <div className="space-y-3">
                      {noticiasModal.map(n => (
                        <div key={n.id} className="text-sm">
                          <a href={n.url_fuente} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-900 hover:text-indigo-600 hover:underline leading-tight block">
                            {n.titular}
                          </a>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.resumen}</p>
                          <span className="text-[10px] font-medium text-slate-400 block mt-1">{new Date(n.fecha_publicacion).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No hay noticias recientes para este evento en la prensa.</p>
                  )}
                </div>
              )}

              {/* Botones de acción */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <span title={isDemo ? 'Solo disponible en plan B2B' : undefined} className="inline-flex">
                    <button
                      onClick={handleAutoScheduleGoogle}
                      disabled={isDemo}
                      className="flex items-center gap-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 text-xs font-medium transition-colors border border-blue-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                    >
                      🗓️ Sincronizar Calendario
                    </button>
                  </span>
                  <button
                    onClick={() => downloadIcs(modal.data)}
                    className="flex items-center gap-2 rounded-lg bg-white text-slate-700 hover:bg-slate-50 px-3 py-2 text-xs font-medium transition-colors border border-slate-200 shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    Bajar .ics
                  </button>
                  {modal.type === 'agenda' && (
                    <Link
                      href={`/eventos/${modal.data.id}`}
                      onClick={() => setModal(null)}
                      className="flex items-center gap-2 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 px-3 py-2 text-xs font-medium transition-colors border border-indigo-200 shadow-sm"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Ver detalle completo
                    </Link>
                  )}
                </div>

                {!isGuest && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold p-2 rounded-md hover:bg-red-50 transition-colors"
                  >
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    {modal.type === 'borrador' ? 'Descartar' : 'Desvincularme'}
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function CalSkeleton() {
  return (
    <div className="h-[600px] flex flex-col items-center justify-center text-slate-300 gap-3">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm font-medium">Cargando módulos...</span>
    </div>
  )
}
