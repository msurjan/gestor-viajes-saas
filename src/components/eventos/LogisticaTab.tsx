'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Evento } from '@/types/database'
import { Plane, BedDouble, ExternalLink, Save, Loader2, CheckCircle2 } from 'lucide-react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function inp() {
  return 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition font-mono'
}

export default function LogisticaTab({
  evento,
  onUpdate,
}: {
  evento: Evento
  onUpdate: (e: Evento) => void
}) {
  const [vuelo, setVuelo]     = useState(evento.link_vuelo_scl ?? '')
  const [hotel, setHotel]     = useState(evento.link_hotel ?? '')
  const [status, setStatus]   = useState<SaveStatus>('idle')

  async function handleSave() {
    setStatus('saving')
    const { data, error } = await supabase
      .from('eventos')
      .update({ link_vuelo_scl: vuelo.trim() || null, link_hotel: hotel.trim() || null })
      .eq('id', evento.id)
      .select()
      .single()

    if (error) { setStatus('error'); return }
    onUpdate(data as Evento)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  const dirty =
    vuelo.trim() !== (evento.link_vuelo_scl ?? '') ||
    hotel.trim() !== (evento.link_hotel ?? '')

  return (
    <div className="max-w-2xl space-y-8">

      {/* Intro */}
      <div className="rounded-xl border border-sky-100 bg-sky-50/50 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Plane className="h-4 w-4 text-sky-500" />
          <p className="text-sm font-semibold text-sky-800">Ofertas de viaje corporativo</p>
        </div>
        <p className="text-xs text-sky-600/80">
          Registra los links de oferta activa para vuelo y hotel. El origen de vuelo siempre es
          <strong className="font-semibold"> SCL — Aeropuerto Internacional de Santiago de Chile</strong>.
        </p>
      </div>

      {/* Vuelo SCL */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
            <Plane className="h-4 w-4 text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0c1e3c]">Link de Oferta Vuelo</p>
            <p className="text-xs text-slate-400">Desde SCL · Santiago de Chile</p>
          </div>
        </div>

        <input
          type="url"
          value={vuelo}
          onChange={e => setVuelo(e.target.value)}
          placeholder="https://www.latam.com/…  o  https://www.avianca.com/…"
          className={inp()}
        />

        {vuelo.trim() && (
          <a
            href={vuelo.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir oferta de vuelo SCL
          </a>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Hotel */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
            <BedDouble className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0c1e3c]">Link de Oferta Hotel</p>
            <p className="text-xs text-slate-400">
              {[evento.ciudad, evento.pais].filter(Boolean).join(', ') || 'Destino del evento'}
            </p>
          </div>
        </div>

        <input
          type="url"
          value={hotel}
          onChange={e => setHotel(e.target.value)}
          placeholder="https://www.booking.com/…  o  https://hotels.com/…"
          className={inp()}
        />

        {hotel.trim() && (
          <a
            href={hotel.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir oferta de hotel
          </a>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!dirty || status === 'saving'}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 shadow-sm transition-colors"
        >
          {status === 'saving'
            ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</>
            : <><Save className="h-4 w-4" />Guardar links</>
          }
        </button>

        {status === 'saved' && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Links guardados
          </span>
        )}
        {status === 'error' && (
          <span className="text-sm text-red-600">Error al guardar — intenta de nuevo.</span>
        )}
      </div>

      {/* Empty state */}
      {!vuelo.trim() && !hotel.trim() && (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <div className="flex justify-center gap-3 mb-3 text-slate-200">
            <Plane className="h-7 w-7" />
            <BedDouble className="h-7 w-7" />
          </div>
          <p className="text-sm text-slate-400">
            Aún no hay links registrados para este evento.
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Pega las URLs de las ofertas activas arriba y presiona Guardar.
          </p>
        </div>
      )}
    </div>
  )
}
