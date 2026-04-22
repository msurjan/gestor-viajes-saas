'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Gasto, GastoInsert, CategoriaGasto, EstadoGasto } from '@/types/database'
import {
  Plus, Pencil, Trash2, Loader2, X, AlertTriangle,
  DollarSign, TrendingUp, Clock, Ban,
} from 'lucide-react'

// ── Constants ───────────────────────────────────────────────────────────

const CATEGORIAS: CategoriaGasto[] = [
  'alojamiento', 'transporte', 'catering', 'audio_visual',
  'honorarios', 'marketing', 'imprevistos', 'otro',
]
const ESTADOS_GASTO: EstadoGasto[] = ['pendiente', 'pagado', 'reembolsado', 'anulado']
const MONEDAS = ['USD', 'EUR', 'MXN', 'COP', 'ARS']

const ESTADO_BADGE: Record<EstadoGasto, string> = {
  pendiente:   'bg-amber-50 text-amber-700',
  pagado:      'bg-emerald-50 text-emerald-700',
  reembolsado: 'bg-blue-50 text-blue-700',
  anulado:     'bg-slate-100 text-slate-400 line-through',
}

const CAT_COLOR: Record<CategoriaGasto, string> = {
  alojamiento: 'bg-amber-50 text-amber-700',
  transporte:  'bg-sky-50 text-sky-700',
  catering:    'bg-orange-50 text-orange-600',
  audio_visual:'bg-violet-50 text-violet-700',
  honorarios:  'bg-indigo-50 text-indigo-700',
  marketing:   'bg-pink-50 text-pink-700',
  imprevistos: 'bg-red-50 text-red-600',
  otro:        'bg-slate-100 text-slate-600',
}

function emptyForm(moneda: string): Omit<GastoInsert, 'evento_id'> {
  return {
    proveedor_id:   null,
    logistica_id:   null,
    categoria:      'otro',
    descripcion:    '',
    monto:          0,
    moneda,
    fecha:          new Date().toISOString().split('T')[0],
    estado:         'pendiente',
    comprobante_url: null,
    notas:          null,
  }
}

function inp() {
  return 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition'
}

// ── Component ────────────────────────────────────────────────────────────

export default function GastosTab({
  eventoId,
  moneda: defaultMoneda,
}: {
  eventoId: string
  moneda: string
}) {
  const [gastos, setGastos]     = useState<Gasto[]>([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState(() => emptyForm(defaultMoneda))
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('gastos')
      .select('*')
      .eq('evento_id', eventoId)
      .order('fecha', { ascending: false })
    setGastos(data ?? [])
    setLoading(false)
  }, [eventoId])

  useEffect(() => { fetch() }, [fetch])

  // Financial summary
  const activos   = gastos.filter(g => g.estado !== 'anulado')
  const pagados   = gastos.filter(g => g.estado === 'pagado')
  const pendientes = gastos.filter(g => g.estado === 'pendiente')
  const total     = activos.reduce((s, g) => s + g.monto, 0)
  const totPagado = pagados.reduce((s, g) => s + g.monto, 0)
  const totPendiente = pendientes.reduce((s, g) => s + g.monto, 0)

  function fmt(n: number) {
    return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function openCrear() {
    setForm(emptyForm(defaultMoneda))
    setEditId(null)
    setFormError(null)
    setModalOpen(true)
  }

  function openEditar(g: Gasto) {
    const { id, evento_id, created_at, updated_at, ...rest } = g
    setForm(rest)
    setEditId(id)
    setFormError(null)
    setModalOpen(true)
  }

  function close() { setModalOpen(false); setFormError(null) }

  function field(key: keyof typeof form, value: string) {
    setForm(p => ({ ...p, [key]: value === '' ? null : value }))
  }

  async function handleSave() {
    if (!form.descripcion?.trim()) { setFormError('La descripción es requerida.'); return }
    if (!form.monto || Number(form.monto) <= 0) { setFormError('El monto debe ser mayor a 0.'); return }
    setSaving(true)
    setFormError(null)
    const payload: GastoInsert = {
      ...form,
      evento_id: eventoId,
      monto: Number(form.monto),
    }
    const { error } = editId
      ? await supabase.from('gastos').update(payload).eq('id', editId)
      : await supabase.from('gastos').insert(payload)
    setSaving(false)
    if (error) { setFormError(error.message); return }
    close()
    fetch()
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('gastos').delete().eq('id', deleteId)
    setDeleting(false)
    setDeleteId(null)
    fetch()
  }

  return (
    <div className="space-y-6">
      {/* Financial summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Gasto total"
          value={`${defaultMoneda} ${fmt(total)}`}
          icon={<DollarSign className="h-4 w-4 text-indigo-600" />}
          bg="bg-indigo-50"
          count={activos.length}
        />
        <SummaryCard
          label="Pagado"
          value={`${defaultMoneda} ${fmt(totPagado)}`}
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          bg="bg-emerald-50"
          count={pagados.length}
        />
        <SummaryCard
          label="Pendiente de pago"
          value={`${defaultMoneda} ${fmt(totPendiente)}`}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          bg="bg-amber-50"
          count={pendientes.length}
        />
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{gastos.length} gasto{gastos.length !== 1 && 's'} registrado{gastos.length !== 1 && 's'}</p>
        <button
          onClick={openCrear}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Registrar gasto
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Cargando…</span>
          </div>
        ) : gastos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Ban className="h-8 w-8 text-slate-200" />
            <p className="text-sm text-slate-400">Sin gastos registrados para este evento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-400 uppercase tracking-wide text-left">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Categoría</th>
                  <th className="px-5 py-3 font-medium">Descripción</th>
                  <th className="px-5 py-3 font-medium text-right">Monto</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {gastos.map(g => (
                  <tr key={g.id} className={`hover:bg-slate-50/60 transition-colors ${g.estado === 'anulado' ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(g.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT_COLOR[g.categoria]}`}>
                        {g.categoria.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#0c1e3c] max-w-[220px]">
                      <p className="truncate">{g.descripcion}</p>
                      {g.notas && <p className="text-xs text-slate-400 truncate mt-0.5">{g.notas}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[#0c1e3c] whitespace-nowrap">
                      {g.moneda} {fmt(g.monto)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[g.estado]}`}>
                        {g.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEditar(g)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(g.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals footer */}
              {gastos.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold text-sm">
                    <td colSpan={3} className="px-5 py-3 text-slate-500">Total activo</td>
                    <td className="px-5 py-3 text-right text-[#0c1e3c]">{defaultMoneda} {fmt(total)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-over ──────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 z-10">
              <h2 className="text-sm font-semibold text-[#0c1e3c]">
                {editId ? 'Editar gasto' : 'Registrar gasto'}
              </h2>
              <button onClick={close} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <Sec title="Detalle del gasto">
                <Fld label="Descripción *">
                  <input
                    type="text"
                    value={form.descripcion ?? ''}
                    onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="ej. Hotel Camino Real — 3 noches"
                    className={inp()}
                  />
                </Fld>
                <div className="grid grid-cols-2 gap-4">
                  <Fld label="Categoría">
                    <select value={form.categoria ?? 'otro'} onChange={e => field('categoria', e.target.value)} className={inp()}>
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                    </select>
                  </Fld>
                  <Fld label="Estado">
                    <select value={form.estado ?? 'pendiente'} onChange={e => field('estado', e.target.value)} className={inp()}>
                      {ESTADOS_GASTO.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Fld>
                </div>
                <Fld label="Fecha">
                  <input
                    type="date"
                    value={form.fecha ?? ''}
                    onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                    className={inp()}
                  />
                </Fld>
              </Sec>

              <Sec title="Monto">
                <div className="grid grid-cols-3 gap-4">
                  <Fld label="Moneda">
                    <select value={form.moneda ?? 'USD'} onChange={e => setForm(p => ({ ...p, moneda: e.target.value }))} className={inp()}>
                      {MONEDAS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </Fld>
                  <Fld label="Monto *" className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.monto ?? ''}
                      onChange={e => setForm(p => ({ ...p, monto: Number(e.target.value) }))}
                      placeholder="0.00"
                      className={inp()}
                    />
                  </Fld>
                </div>
              </Sec>

              <Sec title="Comprobante y notas">
                <Fld label="URL comprobante / factura">
                  <input
                    type="url"
                    value={form.comprobante_url ?? ''}
                    onChange={e => field('comprobante_url', e.target.value)}
                    placeholder="https://…"
                    className={inp()}
                  />
                </Fld>
                <Fld label="Notas">
                  <textarea
                    value={form.notas ?? ''}
                    onChange={e => field('notas', e.target.value)}
                    rows={3}
                    placeholder="Observaciones adicionales…"
                    className={inp() + ' resize-none'}
                  />
                </Fld>
              </Sec>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button onClick={close} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 shadow-sm">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editId ? 'Guardar cambios' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ──────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-2"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              <div>
                <h3 className="text-sm font-semibold text-[#0c1e3c]">Eliminar gasto</h3>
                <p className="text-sm text-slate-500 mt-1">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
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

function SummaryCard({
  label, value, icon, bg, count,
}: {
  label: string; value: string; icon: React.ReactNode; bg: string; count: number
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`rounded-lg p-2.5 ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-base font-semibold text-[#0c1e3c]">{value}</p>
        <p className="text-xs text-slate-400">{count} ítem{count !== 1 && 's'}</p>
      </div>
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">{title}</h3>
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
