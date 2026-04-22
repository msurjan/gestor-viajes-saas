'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Evento, EventoInsert, TipoEvento, EstadoEvento } from '@/types/database'
import Link from 'next/link'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  CalendarDays,
  Loader2,
  AlertTriangle,
  Eye,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────

const TIPOS: TipoEvento[] = [
  'corporativo', 'incentivo', 'conferencia', 'team_building', 'lanzamiento', 'otro',
]
const ESTADOS: EstadoEvento[] = [
  'borrador', 'confirmado', 'en_curso', 'finalizado', 'cancelado',
]
const MONEDAS = ['USD', 'EUR', 'MXN', 'COP', 'ARS']

const ESTADO_BADGE: Record<EstadoEvento, string> = {
  borrador:   'bg-slate-100 text-slate-600',
  confirmado: 'bg-blue-50 text-blue-700',
  en_curso:   'bg-amber-50 text-amber-700',
  finalizado: 'bg-emerald-50 text-emerald-700',
  cancelado:  'bg-red-50 text-red-600',
}

const EMPTY_FORM: EventoInsert = {
  nombre: '',
  descripcion: null,
  cliente: null,
  ubicacion: '',
  pais: null,
  ciudad: null,
  fecha_inicio: '',
  fecha_fin: '',
  tipo: 'otro',
  estado: 'borrador',
  num_participantes: null,
  costo_estimado: null,
  costo_real: null,
  moneda: 'USD',
  notas: null,
  link_vuelo_scl: null,
  link_hotel: null,
}

// ── Types ──────────────────────────────────────────────────────────────

type ModalMode = 'crear' | 'editar' | null

// ── Main Component ─────────────────────────────────────────────────────

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [modal, setModal] = useState<ModalMode>(null)
  const [form, setForm] = useState<EventoInsert>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────

  const fetchEventos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('fecha_inicio', { ascending: false })
    if (!error) setEventos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEventos() }, [fetchEventos])

  // ── Modal helpers ────────────────────────────────────────────────────

  function openCrear() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setFormError(null)
    setModal('crear')
  }

  function openEditar(evento: Evento) {
    const { id, created_at, updated_at, ...rest } = evento
    setForm(rest)
    setEditId(id)
    setFormError(null)
    setModal('editar')
  }

  function closeModal() {
    setModal(null)
    setFormError(null)
  }

  // ── Form field helper ────────────────────────────────────────────────

  function field(key: keyof EventoInsert, value: string) {
    setForm(prev => ({
      ...prev,
      [key]: value === '' ? null : value,
    }))
  }

  // ── Save ─────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido.'); return }
    if (!form.ubicacion.trim()) { setFormError('La ubicación es requerida.'); return }
    if (!form.fecha_inicio || !form.fecha_fin) { setFormError('Las fechas son requeridas.'); return }
    if (form.fecha_fin < form.fecha_inicio) { setFormError('La fecha de fin debe ser igual o posterior al inicio.'); return }

    setSaving(true)
    setFormError(null)

    const payload = {
      ...form,
      num_participantes: form.num_participantes ? Number(form.num_participantes) : null,
      costo_estimado:    form.costo_estimado    ? Number(form.costo_estimado)    : null,
      costo_real:        form.costo_real        ? Number(form.costo_real)        : null,
    }

    let error
    if (modal === 'crear') {
      ;({ error } = await supabase.from('eventos').insert(payload))
    } else {
      ;({ error } = await supabase.from('eventos').update(payload).eq('id', editId!))
    }

    setSaving(false)
    if (error) { setFormError(error.message); return }
    closeModal()
    fetchEventos()
  }

  // ── Delete ───────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('eventos').delete().eq('id', deleteId)
    setDeleting(false)
    setDeleteId(null)
    fetchEventos()
  }

  // ── Filtered list ────────────────────────────────────────────────────

  const filtered = eventos.filter(e =>
    [e.nombre, e.cliente, e.ubicacion, e.ciudad]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0c1e3c]">Eventos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {eventos.length} evento{eventos.length !== 1 && 's'} registrado{eventos.length !== 1 && 's'}
          </p>
        </div>
        <button
          onClick={openCrear}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nuevo evento
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, cliente, ubicación…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Cargando eventos…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CalendarDays className="h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">
              {search ? 'Sin resultados para tu búsqueda.' : 'No hay eventos aún.'}
            </p>
            {!search && (
              <button
                onClick={openCrear}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Crear el primer evento
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wide bg-slate-50/60">
                  <th className="px-5 py-3 font-medium">Evento</th>
                  <th className="px-5 py-3 font-medium">Fechas</th>
                  <th className="px-5 py-3 font-medium">Ubicación</th>
                  <th className="px-5 py-3 font-medium">Participantes</th>
                  <th className="px-5 py-3 font-medium">Presupuesto</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(evento => (
                  <tr key={evento.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/eventos/${evento.id}`} className="font-medium text-[#0c1e3c] hover:text-blue-700 transition-colors">
                        {evento.nombre}
                      </Link>
                      <p className="text-xs text-slate-400 capitalize mt-0.5">
                        {evento.tipo.replace('_', ' ')}
                        {evento.cliente && ` · ${evento.cliente}`}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(evento.fecha_inicio).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short',
                      })}
                      {' – '}
                      {new Date(evento.fecha_fin).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {evento.ciudad ? `${evento.ciudad}, ` : ''}{evento.ubicacion}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-center">
                      {evento.num_participantes ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                      {evento.costo_estimado != null
                        ? `${evento.moneda} ${evento.costo_estimado.toLocaleString('es-MX')}`
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ESTADO_BADGE[evento.estado]}`}>
                        {evento.estado.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/eventos/${evento.id}`}
                          title="Ver detalle"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => openEditar(evento)}
                          title="Editar"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(evento.id)}
                          title="Eliminar"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Crear / Editar ───────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-[#0c1e3c]">
                {modal === 'crear' ? 'Nuevo evento' : 'Editar evento'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 px-6 py-5 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <Section title="Información general">
                <Field label="Nombre del evento *">
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="ej. Congreso Anual 2026"
                    className={input()}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tipo">
                    <select
                      value={form.tipo}
                      onChange={e => field('tipo', e.target.value)}
                      className={input()}
                    >
                      {TIPOS.map(t => (
                        <option key={t} value={t} className="capitalize">
                          {t.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Estado">
                    <select
                      value={form.estado}
                      onChange={e => field('estado', e.target.value)}
                      className={input()}
                    >
                      {ESTADOS.map(s => (
                        <option key={s} value={s} className="capitalize">
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Cliente / Empresa">
                  <input
                    type="text"
                    value={form.cliente ?? ''}
                    onChange={e => field('cliente', e.target.value)}
                    placeholder="ej. Acme Corp"
                    className={input()}
                  />
                </Field>
                <Field label="Descripción">
                  <textarea
                    value={form.descripcion ?? ''}
                    onChange={e => field('descripcion', e.target.value)}
                    rows={3}
                    placeholder="Descripción breve del evento…"
                    className={input() + ' resize-none'}
                  />
                </Field>
              </Section>

              <Section title="Fechas">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Fecha inicio *">
                    <input
                      type="date"
                      value={form.fecha_inicio}
                      onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))}
                      className={input()}
                    />
                  </Field>
                  <Field label="Fecha fin *">
                    <input
                      type="date"
                      value={form.fecha_fin}
                      onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))}
                      className={input()}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Ubicación">
                <Field label="Lugar / Venue *">
                  <input
                    type="text"
                    value={form.ubicacion}
                    onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))}
                    placeholder="ej. Hotel Camino Real"
                    className={input()}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ciudad">
                    <input
                      type="text"
                      value={form.ciudad ?? ''}
                      onChange={e => field('ciudad', e.target.value)}
                      placeholder="ej. Ciudad de México"
                      className={input()}
                    />
                  </Field>
                  <Field label="País">
                    <input
                      type="text"
                      value={form.pais ?? ''}
                      onChange={e => field('pais', e.target.value)}
                      placeholder="ej. México"
                      className={input()}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Presupuesto y asistentes">
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Moneda" className="col-span-1">
                    <select
                      value={form.moneda}
                      onChange={e => setForm(p => ({ ...p, moneda: e.target.value }))}
                      className={input()}
                    >
                      {MONEDAS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Costo estimado" className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      value={form.costo_estimado ?? ''}
                      onChange={e => field('costo_estimado', e.target.value)}
                      placeholder="0.00"
                      className={input()}
                    />
                  </Field>
                </div>
                <Field label="Participantes">
                  <input
                    type="number"
                    min="0"
                    value={form.num_participantes ?? ''}
                    onChange={e => field('num_participantes', e.target.value)}
                    placeholder="ej. 120"
                    className={input()}
                  />
                </Field>
              </Section>

              <Section title="Notas">
                <Field label="">
                  <textarea
                    value={form.notas ?? ''}
                    onChange={e => field('notas', e.target.value)}
                    rows={3}
                    placeholder="Observaciones internas…"
                    className={input() + ' resize-none'}
                  />
                </Field>
              </Section>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {modal === 'crear' ? 'Crear evento' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar eliminación ────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0c1e3c]">
                  Eliminar evento
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Esta acción eliminará también toda la logística y gastos asociados.
                  No se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────

function input() {
  return 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition'
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-slate-600">{label}</label>
      )}
      {children}
    </div>
  )
}
