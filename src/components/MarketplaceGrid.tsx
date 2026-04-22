'use client'

import { CalendarDays, MapPin, Tag, Lock, Sparkles, DollarSign } from 'lucide-react'
import type { EventoAgenda, EstadoAgenda } from '@/types/database'
import type { EventoBorrador } from '@/app/actions/cazar-evento'

// ── Types ────────────────────────────────────────────────────────────────

type EventoConAsistencia = EventoAgenda & { estado?: EstadoAgenda }

interface Props {
  eventos: EventoConAsistencia[]
  borradores: EventoBorrador[]
  onEventoClick: (e: EventoConAsistencia) => void
  onBorradorClick: (b: EventoBorrador) => void
  isDemo: boolean
}

// ── Design constants ─────────────────────────────────────────────────────

const TEMA_GRADIENT: Record<string, string> = {
  'Minería':    'from-slate-700 via-slate-800 to-blue-900',
  'Energía':    'from-orange-600 via-amber-700 to-orange-900',
  'Finanzas':   'from-emerald-600 via-teal-700 to-emerald-900',
  'Innovación': 'from-violet-600 via-purple-700 to-violet-900',
  'Geología':   'from-stone-600 via-amber-800 to-stone-900',
  'Maquinaria': 'from-sky-600 via-cyan-700 to-sky-900',
  'Otro':       'from-slate-500 via-slate-700 to-slate-900',
}

const TEMA_ICON: Record<string, string> = {
  'Minería':    '⛏️',
  'Energía':    '⚡',
  'Finanzas':   '📈',
  'Innovación': '🚀',
  'Geología':   '🪨',
  'Maquinaria': '⚙️',
  'Otro':       '🌐',
}

const ESTADO_BADGE: Record<EstadoAgenda, string> = {
  evaluacion:             'bg-amber-400/90 text-amber-900',
  confirmado_visita:      'bg-blue-500/90 text-white',
  confirmado_auspiciador: 'bg-emerald-500/90 text-white',
  descartado:             'bg-slate-500/80 text-white',
}

const ESTADO_LABEL: Record<EstadoAgenda, string> = {
  evaluacion:             'Evaluando',
  confirmado_visita:      '✓ Asistente',
  confirmado_auspiciador: '★ Sponsor',
  descartado:             'Descartado',
}

// ── Helpers ──────────────────────────────────────────────────────────────

function gradient(tema: string | null) {
  return TEMA_GRADIENT[tema ?? ''] ?? TEMA_GRADIENT['Otro']
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Sub-components ───────────────────────────────────────────────────────

function CardImage({
  imagenUrl,
  nombre,
  tema,
}: {
  imagenUrl: string | null
  nombre: string
  tema: string | null
}) {
  const temaKey = tema ?? 'Otro'
  const grad = gradient(temaKey)

  if (imagenUrl) {
    return (
      <div className="relative h-44 w-full overflow-hidden bg-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagenUrl}
          alt={nombre}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.display = 'none'
            const parent = e.currentTarget.parentElement
            if (parent) parent.classList.add('fallback-gradient')
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>
    )
  }

  return (
    <div className={`relative h-44 w-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
      <div className="text-center select-none">
        <span className="text-5xl opacity-70">{TEMA_ICON[temaKey] ?? '🌐'}</span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
    </div>
  )
}

// ── Agenda event card ────────────────────────────────────────────────────

function EventoCard({
  evento,
  onClick,
  isDemo,
}: {
  evento: EventoConAsistencia
  onClick: () => void
  isDemo: boolean
}) {
  const loc = [evento.ciudad, evento.pais].filter(Boolean).join(', ')

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all duration-200 flex flex-col"
    >
      {/* Image / gradient */}
      <div className="relative">
        <CardImage imagenUrl={evento.imagen_url} nombre={evento.nombre} tema={evento.tema} />

        {/* Estado badge – top right */}
        {evento.estado && (
          <span className={`absolute top-3 right-3 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${ESTADO_BADGE[evento.estado]}`}>
            {ESTADO_LABEL[evento.estado]}
          </span>
        )}

        {/* Tema badge – bottom left */}
        {evento.tema && (
          <span className="absolute bottom-3 left-3 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700 backdrop-blur-sm flex items-center gap-1">
            <Tag className="h-2.5 w-2.5" />
            {evento.tema}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-[#0c1e3c] text-sm leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
          {evento.nombre}
        </h3>

        <div className="space-y-1">
          {loc && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
              <span className="truncate">{loc}</span>
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3 w-3 flex-shrink-0 text-slate-400" />
            {fmtDate(evento.fecha_inicio)}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {evento.costo_entrada ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <DollarSign className="h-3.5 w-3.5" />
              {evento.costo_entrada}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Costo no disponible</span>
          )}

          {isDemo && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
              <Lock className="h-3 w-3" /> Demo
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── AI-draft borrador card ───────────────────────────────────────────────

function BorradorCard({
  borrador,
  onClick,
}: {
  borrador: EventoBorrador
  onClick: () => void
}) {
  const loc = [borrador.ciudad, borrador.pais].filter(Boolean).join(', ')

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-md hover:border-indigo-400 transition-all duration-200 flex flex-col"
    >
      {/* Image / gradient */}
      <div className="relative">
        <CardImage imagenUrl={borrador.imagen_url || null} nombre={borrador.nombre} tema={borrador.tema} />

        {/* AI badge */}
        <span className="absolute top-3 left-3 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-600/90 text-white backdrop-blur-sm flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" /> IA
        </span>

        {borrador.tema && (
          <span className="absolute bottom-3 left-3 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700 backdrop-blur-sm flex items-center gap-1">
            <Tag className="h-2.5 w-2.5" />
            {borrador.tema}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-semibold text-indigo-900 text-sm leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
          {borrador.nombre}
        </h3>

        <div className="space-y-1">
          {loc && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
              <span className="truncate">{loc}</span>
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3 w-3 flex-shrink-0 text-slate-400" />
            {fmtDate(borrador.fecha_inicio)}
          </p>
        </div>

        <div className="mt-auto pt-3 border-t border-indigo-100 flex items-center justify-between gap-2">
          {borrador.costo_entrada ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <DollarSign className="h-3.5 w-3.5" />
              {borrador.costo_entrada}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Costo no disponible</span>
          )}
          <span className="text-[10px] text-indigo-500 font-medium">
            {Math.round(borrador.confianza * 100)}% confianza
          </span>
        </div>
      </div>
    </button>
  )
}

// ── Main grid component ──────────────────────────────────────────────────

export default function MarketplaceGrid({ eventos, borradores, onEventoClick, onBorradorClick, isDemo }: Props) {
  const total = eventos.length + borradores.length

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-300">
        <span className="text-5xl">🌐</span>
        <p className="text-sm font-medium text-slate-400">Sin eventos para los filtros seleccionados.</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <p className="text-xs text-slate-400 mb-4 font-medium">
        {total} evento{total !== 1 ? 's' : ''} en el catálogo
        {borradores.length > 0 && (
          <span className="ml-1.5 text-indigo-400">· {borradores.length} sugerido{borradores.length !== 1 ? 's' : ''} por IA</span>
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* AI drafts first so they're visible at the top */}
        {borradores.map(b => (
          <BorradorCard key={b.id} borrador={b} onClick={() => onBorradorClick(b)} />
        ))}
        {eventos.map(e => (
          <EventoCard key={e.id} evento={e} onClick={() => onEventoClick(e)} isDemo={isDemo} />
        ))}
      </div>
    </div>
  )
}
