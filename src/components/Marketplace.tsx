'use client'

import Link from 'next/link'
import { MapPin, CalendarDays, Tag, Ticket } from 'lucide-react'
import type { EventoAgenda, EstadoAgenda } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────

type EventoConAsistencia = EventoAgenda & { estado?: EstadoAgenda }

export interface MarketplaceProps {
  eventos: EventoConAsistencia[]
  isDemo?: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<EstadoAgenda, string> = {
  evaluacion:             'bg-amber-100/90 text-amber-800',
  confirmado_visita:      'bg-blue-500/90 text-white',
  confirmado_auspiciador: 'bg-emerald-500/90 text-white',
  descartado:             'bg-slate-500/80 text-white line-through',
}

const ESTADO_LABEL: Record<EstadoAgenda, string> = {
  evaluacion:             'Evaluando',
  confirmado_visita:      '✓ Asistente',
  confirmado_auspiciador: '★ Sponsor',
  descartado:             'Descartado',
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Card ──────────────────────────────────────────────────────────────────

function EventoCard({
  evento,
  isDemo,
}: {
  evento: EventoConAsistencia
  isDemo: boolean
}) {
  const loc = [evento.ciudad, evento.pais].filter(Boolean).join(', ')

  return (
    <Link
      href={`/eventos/${evento.id}`}
      className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      {/* ── Image / placeholder ─────────────────────────────────────────── */}
      <div className="relative h-48 w-full flex-shrink-0 overflow-hidden">
        {evento.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={evento.imagen_url}
            alt={evento.nombre}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-5xl opacity-50 select-none">🌐</span>
          </div>
        )}

        {/* Gradient fade at bottom for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />

        {/* Estado badge — top right */}
        {evento.estado && (
          <span
            className={`absolute top-3 right-3 text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full backdrop-blur-sm ${ESTADO_BADGE[evento.estado]}`}
          >
            {ESTADO_LABEL[evento.estado]}
          </span>
        )}

        {/* Tema badge — bottom left */}
        {evento.tema && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700 backdrop-blur-sm">
            <Tag className="h-2.5 w-2.5" />
            {evento.tema}
          </span>
        )}

        {/* Demo overlay — top left */}
        {isDemo && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-200/80 text-yellow-800 backdrop-blur-sm">
            Demo
          </span>
        )}
      </div>

      {/* ── Card body ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-bold text-[#0c1e3c] text-sm leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
          {evento.nombre}
        </h3>

        <div className="space-y-1.5 mt-0.5">
          {loc && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
              <span className="truncate">{loc}</span>
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3 w-3 flex-shrink-0 text-slate-400" />
            {fmtDate(evento.fecha_inicio)}
            {evento.fecha_fin !== evento.fecha_inicio && (
              <> — {fmtDate(evento.fecha_fin)}</>
            )}
          </p>
        </div>

        {/* Cost badge — pinned to card bottom */}
        {evento.costo_entrada && (
          <div className="mt-auto pt-3">
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-semibold">
              <Ticket className="h-3.5 w-3.5 flex-shrink-0" />
              {evento.costo_entrada}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Grid ──────────────────────────────────────────────────────────────────

export default function Marketplace({ eventos, isDemo = false }: MarketplaceProps) {
  if (eventos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-5xl">🌐</span>
        <p className="text-sm font-medium text-slate-400">
          Sin eventos para los filtros seleccionados.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <p className="text-xs text-slate-400 mb-4 font-medium">
        {eventos.length} evento{eventos.length !== 1 ? 's' : ''} en el catálogo
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {eventos.map(evento => (
          <EventoCard key={evento.id} evento={evento} isDemo={isDemo} />
        ))}
      </div>
    </div>
  )
}
