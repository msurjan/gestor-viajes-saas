'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Evento, EventoInsert, TipoEvento, EstadoEvento } from '@/types/database'
import { Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

const TIPOS: TipoEvento[] = [
  'corporativo', 'incentivo', 'conferencia', 'team_building', 'lanzamiento', 'otro',
]
const ESTADOS: EstadoEvento[] = [
  'borrador', 'confirmado', 'en_curso', 'finalizado', 'cancelado',
]
const MONEDAS = ['USD', 'EUR', 'MXN', 'COP', 'ARS']

function inp() {
  return 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition'
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function InfoGeneralTab({
  evento,
  onUpdate,
}: {
  evento: Evento
  onUpdate: (e: Evento) => void
}) {
  const { id, created_at, updated_at, ...initial } = evento
  const [form, setForm]   = useState<EventoInsert>(initial)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function field(key: keyof EventoInsert, value: string | null) {
    setForm(p => ({ ...p, [key]: value === '' ? null : value }))
    if (status !== 'idle') setStatus('idle')
  }

  async function handleSave() {
    if (!form.nombre.trim())    { setStatus('error'); setErrorMsg('El nombre es requerido.'); return }
    if (!form.ubicacion.trim()) { setStatus('error'); setErrorMsg('La ubicación es requerida.'); return }
    if (!form.fecha_inicio || !form.fecha_fin) { setStatus('error'); setErrorMsg('Las fechas son requeridas.'); return }
    if (form.fecha_fin < form.fecha_inicio)    { setStatus('error'); setErrorMsg('La fecha de fin debe ser posterior al inicio.'); return }

    setStatus('saving')
    setErrorMsg(null)

    const payload: EventoInsert = {
      ...form,
      num_participantes: form.num_participantes ? Number(form.num_participantes) : null,
      costo_estimado:    form.costo_estimado    ? Number(form.costo_estimado)    : null,
      costo_real:        form.costo_real        ? Number(form.costo_real)        : null,
    }

    const { data, error } = await supabase
      .from('eventos')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    setStatus('saved')
    if (data) onUpdate(data as Evento)
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Status banner */}
      {status === 'error' && errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}
      {status === 'saved' && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Cambios guardados correctamente.
        </div>
      )}

      {/* ── Sección: Identificación ─────────────────────────────────── */}
      <Sec title="Identificación">
        <Fld label="Nombre del evento *">
          <input
            type="text"
            value={form.nombre}
            onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
            className={inp()}
          />
        </Fld>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="Tipo">
            <select value={form.tipo} onChange={e => field('tipo', e.target.value)} className={inp()}>
              {TIPOS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </Fld>
          <Fld label="Estado">
            <select value={form.estado} onChange={e => field('estado', e.target.value)} className={inp()}>
              {ESTADOS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Fld>
        </div>
        <Fld label="Cliente / Empresa">
          <input
            type="text"
            value={form.cliente ?? ''}
            onChange={e => field('cliente', e.target.value)}
            placeholder="ej. Acme Corp"
            className={inp()}
          />
        </Fld>
        <Fld label="Descripción">
          <textarea
            value={form.descripcion ?? ''}
            onChange={e => field('descripcion', e.target.value)}
            rows={3}
            placeholder="Descripción general del evento…"
            className={inp() + ' resize-none'}
          />
        </Fld>
      </Sec>

      {/* ── Sección: Fechas ──────────────────────────────────────────── */}
      <Sec title="Fechas">
        <div className="grid grid-cols-2 gap-4">
          <Fld label="Fecha inicio *">
            <input
              type="date"
              value={form.fecha_inicio}
              onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))}
              className={inp()}
            />
          </Fld>
          <Fld label="Fecha fin *">
            <input
              type="date"
              value={form.fecha_fin}
              onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))}
              className={inp()}
            />
          </Fld>
        </div>
      </Sec>

      {/* ── Sección: Ubicación ───────────────────────────────────────── */}
      <Sec title="Ubicación">
        <Fld label="Lugar / Venue *">
          <input
            type="text"
            value={form.ubicacion}
            onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))}
            placeholder="ej. Hotel Camino Real"
            className={inp()}
          />
        </Fld>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="Ciudad">
            <input type="text" value={form.ciudad ?? ''} onChange={e => field('ciudad', e.target.value)} placeholder="ej. Ciudad de México" className={inp()} />
          </Fld>
          <Fld label="País">
            <input type="text" value={form.pais ?? ''} onChange={e => field('pais', e.target.value)} placeholder="ej. México" className={inp()} />
          </Fld>
        </div>
      </Sec>

      {/* ── Sección: Presupuesto ─────────────────────────────────────── */}
      <Sec title="Presupuesto y asistentes">
        <div className="grid grid-cols-3 gap-4">
          <Fld label="Moneda">
            <select value={form.moneda} onChange={e => setForm(p => ({ ...p, moneda: e.target.value }))} className={inp()}>
              {MONEDAS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Fld>
          <Fld label="Costo estimado" className="col-span-2">
            <input
              type="number"
              min="0"
              value={form.costo_estimado ?? ''}
              onChange={e => field('costo_estimado', e.target.value)}
              placeholder="0.00"
              className={inp()}
            />
          </Fld>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Fld label="Costo real (actualizable)">
            <input
              type="number"
              min="0"
              value={form.costo_real ?? ''}
              onChange={e => field('costo_real', e.target.value)}
              placeholder="0.00"
              className={inp()}
            />
          </Fld>
          <Fld label="Participantes">
            <input
              type="number"
              min="0"
              value={form.num_participantes ?? ''}
              onChange={e => field('num_participantes', e.target.value)}
              placeholder="ej. 120"
              className={inp()}
            />
          </Fld>
        </div>
      </Sec>

      {/* ── Save button ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
        >
          {status === 'saving'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Save className="h-4 w-4" />}
          Guardar cambios
        </button>
        {status === 'saved' && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Guardado
          </span>
        )}
      </div>
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Fld({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      {children}
    </div>
  )
}
