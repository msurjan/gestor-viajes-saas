// -- CREATE TABLE IF NOT EXISTS sugerencias_eventos (
// --   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
// --   nombre text NOT NULL,
// --   descripcion text,
// --   tema text,
// --   fecha_inicio date,
// --   fecha_fin date,
// --   ciudad text,
// --   pais text,
// --   fuente_url text,
// --   nombre_contacto text,
// --   email_contacto text,
// --   estado text DEFAULT 'pendiente',
// --   created_at timestamptz DEFAULT now()
// -- );
// -- ALTER TABLE sugerencias_eventos ENABLE ROW LEVEL SECURITY;
// -- CREATE POLICY "insert_public" ON sugerencias_eventos FOR INSERT WITH CHECK (true);
// -- CREATE POLICY "select_admin" ON sugerencias_eventos FOR SELECT USING (true);

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'

const TEMAS = ['Innovación', 'Maquinaria', 'Finanzas', 'Geología', 'Energía', 'Minería', 'Otro']

type FormState = {
  nombre: string
  descripcion: string
  tema: string
  fecha_inicio: string
  fecha_fin: string
  ciudad: string
  pais: string
  fuente_url: string
  nombre_contacto: string
  email_contacto: string
}

const EMPTY: FormState = {
  nombre: '', descripcion: '', tema: '', fecha_inicio: '', fecha_fin: '',
  ciudad: '', pais: '', fuente_url: '', nombre_contacto: '', email_contacto: '',
}

export default function SugerirEventoPage() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')

    if (form.fecha_fin && form.fecha_inicio && form.fecha_fin < form.fecha_inicio) {
      setErrorMsg('La fecha de fin no puede ser anterior a la fecha de inicio.')
      setStatus('error')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('sugerencias_eventos').insert({
      ...form,
      estado: 'pendiente',
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
      return
    }

    setStatus('ok')
    setForm(EMPTY)
  }

  const inputCls =
    'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 ' +
    'placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5'

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-[#0c1e3c] px-6 py-10 text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">Proponer un Evento</h1>
        <p className="text-blue-300/80 text-sm mt-2 max-w-md mx-auto">
          Completá el formulario y el equipo editorial evaluará si el evento cumple los criterios
          del catálogo corporativo.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0c1e3c] font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>

        {/* Success */}
        {status === 'ok' && (
          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-5 mb-6">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                ¡Gracias! Tu evento fue enviado para revisión.
              </p>
              <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                Lo publicaremos si cumple con los criterios editoriales del catálogo.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="text-xs text-emerald-700 underline mt-3 hover:text-emerald-900"
              >
                Proponer otro evento
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-6 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        {status !== 'ok' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

            {/* Sección evento */}
            <div className="px-6 py-6 space-y-5">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Datos del evento
              </h2>

              {/* Nombre */}
              <div>
                <label className={labelCls}>Nombre del evento *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={set('nombre')}
                  required
                  placeholder="Ej: Mining Summit Latinoamérica 2026"
                  className={inputCls}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className={labelCls}>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={set('descripcion')}
                  rows={3}
                  placeholder="¿De qué trata? ¿A qué audiencia está dirigido?"
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Tema */}
              <div>
                <label className={labelCls}>Tema / Industria</label>
                <select value={form.tema} onChange={set('tema')} className={inputCls}>
                  <option value="">Seleccionar tema...</option>
                  {TEMAS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Fecha de inicio *</label>
                  <input
                    type="date"
                    value={form.fecha_inicio}
                    onChange={set('fecha_inicio')}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Fecha de fin *</label>
                  <input
                    type="date"
                    value={form.fecha_fin}
                    onChange={set('fecha_fin')}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Ciudad / País */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Ciudad</label>
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={set('ciudad')}
                    placeholder="Ej: Lima"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>País</label>
                  <input
                    type="text"
                    value={form.pais}
                    onChange={set('pais')}
                    placeholder="Ej: Perú"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* URL */}
              <div>
                <label className={labelCls}>Sitio web oficial</label>
                <input
                  type="url"
                  value={form.fuente_url}
                  onChange={set('fuente_url')}
                  placeholder="https://..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-slate-100" />

            {/* Sección contacto */}
            <div className="px-6 py-6 space-y-5">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Contacto <span className="text-slate-400 font-normal normal-case">(opcional)</span>
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tu nombre</label>
                  <input
                    type="text"
                    value={form.nombre_contacto}
                    onChange={set('nombre_contacto')}
                    placeholder="Nombre y apellido"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tu email</label>
                  <input
                    type="email"
                    value={form.email_contacto}
                    onChange={set('email_contacto')}
                    placeholder="contacto@empresa.com"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Footer del form */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <p className="text-xs text-slate-400">* campos obligatorios</p>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-[#0c1e3c] px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-60 transition-colors shadow-sm"
              >
                {loading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : null}
                {loading ? 'Enviando...' : 'Enviar propuesta'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  )
}
