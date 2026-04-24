// SQL para agregar columnas si ya existe la tabla:
// ALTER TABLE sugerencias_eventos ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'evento';
// ALTER TABLE sugerencias_eventos ADD COLUMN IF NOT EXISTS descripcion text;
//
// O para crear desde cero:
// CREATE TABLE IF NOT EXISTS sugerencias_eventos (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   tipo text NOT NULL DEFAULT 'evento',   -- 'evento' | 'tematica' | 'geografia' | 'otra'
//   nombre text NOT NULL,
//   descripcion text,
//   tema text,
//   fecha_inicio date,
//   fecha_fin date,
//   ciudad text,
//   pais text,
//   fuente_url text,
//   nombre_contacto text,
//   email_contacto text,
//   estado text DEFAULT 'pendiente',
//   created_at timestamptz DEFAULT now()
// );
// ALTER TABLE sugerencias_eventos ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "insert_public" ON sugerencias_eventos FOR INSERT WITH CHECK (true);
// CREATE POLICY "select_admin"  ON sugerencias_eventos FOR SELECT USING (true);

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Loader2, CheckCircle2, AlertCircle, ArrowLeft,
  CalendarDays, Tag, MapPin, Lightbulb,
} from 'lucide-react'

// ── Tipos de sugerencia ───────────────────────────────────────────────────────

type TipoSugerencia = 'evento' | 'tematica' | 'geografia' | 'otra'

const TIPOS: {
  id: TipoSugerencia
  label: string
  sublabel: string
  icon: React.ElementType
  color: string
  border: string
  bg: string
}[] = [
  {
    id: 'evento',
    label: 'Un evento específico',
    sublabel: 'Conocés un congreso, feria o cumbre que debería estar en el catálogo',
    icon: CalendarDays,
    color: 'text-blue-600',
    border: 'border-blue-300',
    bg: 'bg-blue-50',
  },
  {
    id: 'tematica',
    label: 'Una temática nueva',
    sublabel: 'Hay una industria o área que aún no cubrimos y tiene eventos relevantes',
    icon: Tag,
    color: 'text-indigo-600',
    border: 'border-indigo-300',
    bg: 'bg-indigo-50',
  },
  {
    id: 'geografia',
    label: 'Un país o región',
    sublabel: 'Querés que exploremos más eventos en una geografía específica',
    icon: MapPin,
    color: 'text-emerald-600',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
  },
  {
    id: 'otra',
    label: 'Otra sugerencia',
    sublabel: 'Feedback editorial, idea de funcionalidad, mejora del catálogo',
    icon: Lightbulb,
    color: 'text-amber-600',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
  },
]

const TEMAS = [
  'Minería y Metales', 'Energía y Renovables', 'Tecnología e IA',
  'Finanzas e Inversión', 'Infraestructura y Construcción', 'Sostenibilidad y ESG',
  'Logística y Transporte', 'Manufactura e Industria 4.0', 'Petróleo y Gas',
  'Otros Temas Estratégicos',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 ' +
  'placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white'
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5'

// ── Component ─────────────────────────────────────────────────────────────────

export default function SugerirEventoPage() {
  const [tipo, setTipo] = useState<TipoSugerencia | null>(null)

  // Campos comunes
  const [nombre, setNombre]       = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tema, setTema]           = useState('')
  const [pais, setPais]           = useState('')
  const [ciudad, setCiudad]       = useState('')
  const [fuente_url, setFuenteUrl] = useState('')

  // Contacto
  const [nombreContacto, setNombreContacto] = useState('')
  const [emailContacto, setEmailContacto]   = useState('')

  const [loading, setLoading]   = useState(false)
  const [status, setStatus]     = useState<'idle' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function resetForm() {
    setTipo(null)
    setNombre(''); setDescripcion(''); setTema(''); setPais(''); setCiudad('')
    setFuenteUrl(''); setNombreContacto(''); setEmailContacto('')
    setStatus('idle')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tipo) return
    setLoading(true)

    const { error } = await supabase.from('sugerencias_eventos').insert({
      tipo,
      nombre:          nombre.trim(),
      descripcion:     descripcion.trim() || null,
      tema:            tema || null,
      pais:            pais.trim() || null,
      ciudad:          ciudad.trim() || null,
      fuente_url:      fuente_url.trim() || null,
      nombre_contacto: nombreContacto.trim() || null,
      email_contacto:  emailContacto.trim() || null,
      estado:          'pendiente',
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
      return
    }
    setStatus('ok')
  }

  const tipoActivo = TIPOS.find(t => t.id === tipo)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-[#0c1e3c] px-6 py-10 text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">Enviar una señal al equipo editorial</h1>
        <p className="text-blue-300/70 text-sm mt-2 max-w-lg mx-auto leading-relaxed">
          Contanos qué falta en el catálogo. Puede ser un evento puntual, una temática entera, una región geográfica o cualquier otra idea.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0c1e3c] font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>

        {/* ── Éxito ── */}
        {status === 'ok' && (
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">¡Señal recibida!</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                El equipo editorial la va a revisar y usará la IA para explorar ese ángulo en el catálogo.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Enviar otra señal
              </button>
              <Link
                href="/"
                className="flex-1 py-2.5 rounded-xl bg-[#0c1e3c] text-white text-sm font-semibold hover:bg-blue-900 transition-colors text-center"
              >
                Volver al catálogo
              </Link>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            {errorMsg}
          </div>
        )}

        {/* ── Formulario ── */}
        {status !== 'ok' && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* PASO 1 — elegir tipo */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">¿Qué querés sugerir?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TIPOS.map(t => {
                  const Icon = t.icon
                  const active = tipo === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipo(t.id)}
                      className={`text-left rounded-xl border-2 p-4 transition-all ${
                        active
                          ? `${t.border} ${t.bg}`
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 shrink-0 ${active ? t.color : 'text-slate-400'}`} />
                        <p className={`text-sm font-bold ${active ? t.color : 'text-slate-700'}`}>{t.label}</p>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed pl-6">{t.sublabel}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* PASO 2 — campos contextuales */}
            {tipo && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  {tipoActivo && <tipoActivo.icon className={`h-3.5 w-3.5 ${tipoActivo.color}`} />}
                  {tipoActivo?.label}
                </p>

                {/* ── Evento específico ── */}
                {tipo === 'evento' && (
                  <>
                    <div>
                      <label className={labelCls}>Nombre del evento *</label>
                      <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                        placeholder="Ej: PDAC 2027, Mining Intelligence Forum..." className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Temática</label>
                        <select value={tema} onChange={e => setTema(e.target.value)} className={inputCls}>
                          <option value="">Seleccionar...</option>
                          {TEMAS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>País</label>
                        <input type="text" value={pais} onChange={e => setPais(e.target.value)}
                          placeholder="Ej: Canadá" className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Sitio web oficial</label>
                      <input type="url" value={fuente_url} onChange={e => setFuenteUrl(e.target.value)}
                        placeholder="https://..." className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Contexto adicional</label>
                      <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
                        placeholder="¿Por qué es relevante? ¿A qué audiencia va dirigido?"
                        className={`${inputCls} resize-none`} />
                    </div>
                  </>
                )}

                {/* ── Temática nueva ── */}
                {tipo === 'tematica' && (
                  <>
                    <div>
                      <label className={labelCls}>Nombre de la temática *</label>
                      <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                        placeholder="Ej: Hidrógeno Verde, Economía Circular, AgriTech..." className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>¿Por qué debería estar en el catálogo? *</label>
                      <textarea required value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3}
                        placeholder="Describí el tipo de eventos que existen en esta temática, el perfil de asistentes, la relevancia para empresas B2B..."
                        className={`${inputCls} resize-none`} />
                    </div>
                    <div>
                      <label className={labelCls}>Región principal de los eventos</label>
                      <input type="text" value={pais} onChange={e => setPais(e.target.value)}
                        placeholder="Ej: Europa, América Latina, Global..." className={inputCls} />
                    </div>
                  </>
                )}

                {/* ── País o región ── */}
                {tipo === 'geografia' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>País o región *</label>
                        <input type="text" required value={pais} onChange={e => setPais(e.target.value)}
                          placeholder="Ej: Colombia, Sudeste Asiático..." className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Ciudad (opcional)</label>
                        <input type="text" value={ciudad} onChange={e => setCiudad(e.target.value)}
                          placeholder="Ej: Bogotá, Singapur..." className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Temática de interés en esa región</label>
                      <select value={tema} onChange={e => setTema(e.target.value)} className={inputCls}>
                        <option value="">Seleccionar...</option>
                        {TEMAS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>¿Qué tipo de eventos buscás ahí? *</label>
                      <textarea required value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3}
                        placeholder="Ej: Buscamos ferias de minería en Colombia porque tenemos operaciones allí y queremos conectar con proveedores locales..."
                        className={`${inputCls} resize-none`} />
                    </div>
                    <div>
                      <label className={labelCls}>Nombre del título o referencia</label>
                      <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                        placeholder="Ej: Eventos de minería en Colombia" className={inputCls} />
                    </div>
                  </>
                )}

                {/* ── Otra sugerencia ── */}
                {tipo === 'otra' && (
                  <>
                    <div>
                      <label className={labelCls}>Título de tu sugerencia *</label>
                      <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                        placeholder="Ej: Agregar filtro por costo, incluir eventos online..." className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Describila con detalle *</label>
                      <textarea required value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4}
                        placeholder="Cuéntanos lo que necesitás, qué te falta, qué mejorarías..."
                        className={`${inputCls} resize-none`} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PASO 3 — contacto + envío */}
            {tipo && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tus datos de contacto <span className="font-normal normal-case">(opcional)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Tu nombre</label>
                    <input type="text" value={nombreContacto} onChange={e => setNombreContacto(e.target.value)}
                      placeholder="Nombre y apellido" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tu email</label>
                    <input type="email" value={emailContacto} onChange={e => setEmailContacto(e.target.value)}
                      placeholder="contacto@empresa.com" className={inputCls} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-slate-400">* campos obligatorios</p>
                  <button
                    type="submit"
                    disabled={loading || !tipo}
                    className="flex items-center gap-2 rounded-xl bg-[#0c1e3c] px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enviar señal
                  </button>
                </div>
              </div>
            )}

          </form>
        )}

      </div>
    </div>
  )
}
