'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ReportePrecioComunidad } from '@/types/database'
import { Loader2, Users, LayoutGrid, Star, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

type Categoria = ReportePrecioComunidad['categoria']
type Moneda = 'USD' | 'CLP' | 'EUR'

const CATEGORIAS = [
  {
    key: 'Visitante' as const,
    label: 'Visitante',
    icon: Users,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    header: 'bg-blue-600',
    unidad: 'persona' as const,
  },
  {
    key: 'Expositor (Stand)' as const,
    label: 'Expositor (Stand)',
    icon: LayoutGrid,
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    header: 'bg-amber-500',
    unidad: 'm2' as const,
  },
  {
    key: 'Patrocinador' as const,
    label: 'Patrocinador',
    icon: Star,
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    header: 'bg-emerald-600',
    unidad: 'total' as const,
  },
]

const MONEDAS: Moneda[] = ['USD', 'CLP', 'EUR']

const UNIDAD_LABEL: Record<ReportePrecioComunidad['unidad'], string> = {
  persona: '/ persona',
  m2:      '/ m²',
  total:   'total',
}

function unidadParaCategoria(cat: Categoria): ReportePrecioComunidad['unidad'] {
  if (cat === 'Visitante') return 'persona'
  if (cat === 'Expositor (Stand)') return 'm2'
  return 'total'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMonto(monto: number, moneda: string, unidad: ReportePrecioComunidad['unidad']) {
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(monto)
  return { formatted, unidadLabel: UNIDAD_LABEL[unidad] }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PrecioCard({ reporte }: { reporte: ReportePrecioComunidad }) {
  const { formatted, unidadLabel } = fmtMonto(reporte.monto, reporte.moneda, reporte.unidad)
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{reporte.detalle}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-slate-800">{formatted}</span>
        <span className="text-xs text-slate-400 font-medium">{unidadLabel}</span>
      </div>
      {reporte.comentario && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{reporte.comentario}</p>
      )}
      {reporte.fuente_url && (
        <a
          href={reporte.fuente_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium truncate"
        >
          Ver fuente →
        </a>
      )}
      <span className="text-[10px] text-slate-300 mt-0.5">
        {new Date(reporte.fecha_reporte).toLocaleDateString('es-MX', {
          day: '2-digit', month: 'short', year: 'numeric',
        })}
      </span>
    </div>
  )
}

// ── Form state type ───────────────────────────────────────────────────────────

type FormState = {
  categoria: Categoria
  detalle: string
  monto: string
  moneda: Moneda
  comentario: string
  fuente_url: string
}

const FORM_DEFAULTS: FormState = {
  categoria: 'Visitante',
  detalle:   '',
  monto:     '',
  moneda:    'USD',
  comentario: '',
  fuente_url: '',
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function ReporteModal({
  eventoId,
  onClose,
  onSuccess,
}: {
  eventoId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState<FormState>(FORM_DEFAULTS)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const montoNum = parseFloat(form.monto)
    if (!form.detalle.trim() || isNaN(montoNum) || montoNum <= 0) {
      setFeedback({ type: 'error', msg: 'Completa todos los campos obligatorios.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    const { data: { session } } = await supabase.auth.getSession()

    const payload: Omit<ReportePrecioComunidad, 'id' | 'created_at'> = {
      evento_id:     eventoId,
      ...(session?.user?.id ? { user_id: session.user.id } : {}),
      categoria:     form.categoria,
      detalle:       form.detalle.trim(),
      monto:         montoNum,
      moneda:        form.moneda,
      unidad:        unidadParaCategoria(form.categoria),
      fecha_reporte: new Date().toISOString().split('T')[0],
      ...(form.comentario.trim() ? { comentario: form.comentario.trim() } : {}),
      ...(form.fuente_url.trim() ? { fuente_url: form.fuente_url.trim() } : {}),
    }

    const { error } = await supabase.from('reportes_precios_comunidad').insert(payload)

    if (error) {
      setFeedback({ type: 'error', msg: `Error al guardar: ${error.message}` })
      setSubmitting(false)
      return
    }

    setFeedback({ type: 'success', msg: '¡Precio reportado con éxito!' })
    setTimeout(() => {
      onSuccess()
      onClose()
    }, 900)
    setSubmitting(false)
  }

  const unidadActual = unidadParaCategoria(form.categoria)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between bg-[#0c1e3c] text-white px-6 py-5">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-300" />
            <h2 className="text-base font-semibold">Reportar Precio</h2>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200/60 hover:text-white rounded-md p-1.5 hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Categoría <span className="text-red-400">*</span>
            </label>
            <select
              value={form.categoria}
              onChange={e => setField('categoria', e.target.value as Categoria)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
            >
              {CATEGORIAS.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Detalle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Detalle <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.detalle}
              onChange={e => setField('detalle', e.target.value)}
              placeholder={
                form.categoria === 'Visitante'        ? 'ej. Early Bird, Entrada General' :
                form.categoria === 'Expositor (Stand)' ? 'ej. Stand 3×3, Stand 6×3' :
                'ej. Auspicio Gold, Auspicio Platinum'
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
            />
          </div>

          {/* Monto + Moneda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Monto <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.monto}
                onChange={e => setField('monto', e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Moneda <span className="text-red-400">*</span>
              </label>
              <select
                value={form.moneda}
                onChange={e => setField('moneda', e.target.value as Moneda)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
              >
                {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Unidad (read-only, derived from category) */}
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Unidad de precio</span>
            <span className="text-xs font-bold text-slate-600">{UNIDAD_LABEL[unidadActual]}</span>
          </div>

          {/* Comentario (optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Comentario <span className="text-slate-400 font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              value={form.comentario}
              onChange={e => setField('comentario', e.target.value)}
              rows={2}
              placeholder="Contexto adicional sobre este precio..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition resize-none"
            />
          </div>

          {/* Fuente URL (optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              URL de fuente <span className="text-slate-400 font-normal normal-case">(opcional)</span>
            </label>
            <input
              type="url"
              value={form.fuente_url}
              onChange={e => setField('fuente_url', e.target.value)}
              placeholder="https://evento.com/precios"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition"
            />
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {feedback.type === 'success'
                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
              {feedback.msg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#0c1e3c] py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                : <><Plus className="h-4 w-4" /> Publicar precio</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PreciosTab({ eventoId }: { eventoId: string }) {
  const [reportes, setReportes] = useState<ReportePrecioComunidad[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  async function fetchReportes() {
    const { data } = await supabase
      .from('reportes_precios_comunidad')
      .select('*')
      .eq('evento_id', eventoId)
      .order('categoria')
      .order('monto')
    setReportes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchReportes() }, [eventoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header row with report button */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium">
            {reportes.length} reporte{reportes.length !== 1 ? 's' : ''} de la comunidad
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#0c1e3c] hover:bg-blue-900 px-3 py-2 text-xs font-semibold text-white transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Reportar Precio
          </button>
        </div>

        {reportes.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-10 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">💰</span>
            <p className="text-sm font-medium text-slate-400">
              Aún no hay precios reportados. Sé el primero en contribuir.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CATEGORIAS.map(cat => {
              const items = reportes.filter(r => r.categoria === cat.key)
              const Icon = cat.icon
              return (
                <div key={cat.key} className={`rounded-2xl border ${cat.border} overflow-hidden shadow-sm`}>
                  <div className={`${cat.header} px-5 py-3 flex items-center gap-2`}>
                    <Icon className="h-4 w-4 text-white opacity-80" />
                    <h3 className="text-sm font-bold text-white">{cat.label}</h3>
                    <span className="ml-auto text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>
                  <div className={`${cat.bg} p-3 space-y-2.5 min-h-[100px]`}>
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-5">Sin reportes.</p>
                    ) : (
                      items.map(r => <PrecioCard key={r.id} reporte={r} />)
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center">
          Precios reportados por la comunidad B2B. Pueden variar según paquete y fecha de compra.
        </p>
      </div>

      {modalOpen && (
        <ReporteModal
          eventoId={eventoId}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setLoading(true); fetchReportes() }}
        />
      )}
    </>
  )
}
