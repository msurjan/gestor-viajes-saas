'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Evento } from '@/types/database'
import {
  ArrowLeft, CalendarDays, MapPin, Users, DollarSign,
  Loader2, BookOpen, Receipt, ClipboardList, Plane,
} from 'lucide-react'
import InfoGeneralTab  from '@/components/eventos/InfoGeneralTab'
import LogisticaTab    from '@/components/eventos/LogisticaTab'
import GastosTab       from '@/components/eventos/GastosTab'
import ConocimientoTab from '@/components/eventos/ConocimientoTab'

// ── Types & constants ────────────────────────────────────────────────────

type Tab = 'info' | 'logistica' | 'gastos' | 'conocimiento'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'info',         label: 'Info general',    icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'logistica',    label: 'Vuelo & Hotel',   icon: <Plane         className="h-4 w-4" /> },
  { key: 'gastos',       label: 'Gastos',          icon: <Receipt       className="h-4 w-4" /> },
  { key: 'conocimiento', label: 'Conocimiento',    icon: <BookOpen      className="h-4 w-4" /> },
]

const ESTADO_BADGE: Record<string, string> = {
  borrador:   'bg-slate-100 text-slate-600',
  confirmado: 'bg-blue-100 text-blue-700',
  en_curso:   'bg-amber-100 text-amber-700',
  finalizado: 'bg-emerald-100 text-emerald-700',
  cancelado:  'bg-red-100 text-red-600',
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function EventoDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const router    = useRouter()
  const [evento, setEvento]   = useState<Evento | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<Tab>('info')

  useEffect(() => {
    supabase
      .from('eventos')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { router.push('/eventos'); return }
        setEvento(data as Evento)
        setLoading(false)
      })
  }, [id, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando evento…</span>
      </div>
    )
  }

  if (!evento) return null

  const locationParts = [evento.ciudad, evento.pais].filter(Boolean).join(', ')
  const subtitleParts = [
    evento.cliente,
    evento.tipo?.replace('_', ' '),
    locationParts,
  ].filter(Boolean)

  return (
    <div className="min-h-full flex flex-col">

      {/* ── Dark header ─────────────────────────────────────────────────── */}
      <div className="bg-[#0c1e3c] text-white">
        <div className="px-8 pt-6 pb-0">

          <Link
            href="/eventos"
            className="inline-flex items-center gap-1.5 text-xs text-blue-300/60 hover:text-blue-200 mb-5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Todos los eventos
          </Link>

          {/* Title */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold leading-tight">{evento.nombre}</h1>
              {subtitleParts.length > 0 && (
                <p className="text-sm text-blue-200/60 mt-1 capitalize">
                  {subtitleParts.join(' · ')}
                </p>
              )}
            </div>
            <span className={`flex-shrink-0 mt-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${ESTADO_BADGE[evento.estado]}`}>
              {evento.estado.replace('_', ' ')}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-blue-100/50">
            <MetaItem icon={<CalendarDays className="h-3.5 w-3.5" />}>
              {fmtDate(evento.fecha_inicio)} – {fmtDate(evento.fecha_fin)}
            </MetaItem>
            {evento.ubicacion && (
              <MetaItem icon={<MapPin className="h-3.5 w-3.5" />}>
                {evento.ubicacion}{locationParts ? `, ${locationParts}` : ''}
              </MetaItem>
            )}
            {evento.num_participantes != null && (
              <MetaItem icon={<Users className="h-3.5 w-3.5" />}>
                {evento.num_participantes} participantes
              </MetaItem>
            )}
            {evento.costo_estimado != null && (
              <MetaItem icon={<DollarSign className="h-3.5 w-3.5" />}>
                {evento.moneda} {evento.costo_estimado.toLocaleString('es-MX')} estimado
              </MetaItem>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex mt-6 -mb-px">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? 'border-blue-400 text-white'
                    : 'border-transparent text-blue-200/40 hover:text-blue-100 hover:border-blue-200/30'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="flex-1 p-8">
        {tab === 'info'         && <InfoGeneralTab  evento={evento} onUpdate={setEvento} />}
        {tab === 'logistica'    && <LogisticaTab    evento={evento} onUpdate={setEvento} />}
        {tab === 'gastos'       && <GastosTab       eventoId={id} moneda={evento.moneda} />}
        {tab === 'conocimiento' && <ConocimientoTab evento={evento} onUpdate={setEvento} />}
      </div>
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function MetaItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">{icon}{children}</span>
  )
}
