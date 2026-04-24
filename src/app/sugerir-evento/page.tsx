'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Globe, Send } from 'lucide-react'

const TEMAS = [
  'Minería y Metales',
  'Energía y Renovables',
  'Tecnología e IA',
  'Finanzas e Inversión',
  'Infraestructura y Construcción',
  'Sostenibilidad y ESG',
  'Logística y Transporte',
  'Manufactura e Industria 4.0',
  'Petróleo y Gas',
  'Otros Temas Estratégicos'
]

type FormState = {
  nombre: string
  tema: string
  pais: string
  nombre_contacto: string
  email_contacto: string
}

const EMPTY: FormState = {
  nombre: '', tema: '', pais: '', nombre_contacto: '', email_contacto: '',
}

export default function SugerirEventoPage() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')
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
    'w-full rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-800 ' +
    'placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 shadow-sm transition-all'
  const labelCls = 'block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide'

  return (
    <div className="min-h-screen bg-[#f8fafc]">

      {/* Header */}
      <div className="bg-[#0c1e3c] px-6 py-12 text-center relative overflow-hidden">
        {/* Abstract background element */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Globe className="h-6 w-6 text-blue-400" />
            <span className="text-blue-400/80 text-xs font-bold uppercase tracking-widest">Vento Global</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Sugerir un Evento</h1>
          <p className="text-blue-200/60 text-sm mt-3 max-w-md mx-auto leading-relaxed">
            Ayúdanos a poblar el mapa estratégico mundial. Cuéntanos qué evento falta en nuestro catálogo.
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-10">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0c1e3c] font-semibold mb-8 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al Catálogo
        </Link>

        {/* Success */}
        {status === 'ok' && (
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¡Recibido con éxito!</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Tu sugerencia ha sido enviada al equipo editorial. La revisaremos pronto para integrarla al mapa global.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setStatus('idle')}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                Sugerir otro evento
              </button>
              <Link
                href="/"
                className="block w-full py-3 rounded-xl bg-[#0c1e3c] text-white text-sm font-bold hover:bg-blue-900 transition-colors shadow-lg"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 p-5 mb-8 text-sm text-red-700 shadow-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        {status !== 'ok' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-8 space-y-6">
              
              {/* Event Name */}
              <div>
                <label className={labelCls}>Nombre del evento *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={set('nombre')}
                  required
                  placeholder="Ej: Mining Intelligence Forum 2026"
                  className={inputCls}
                />
              </div>

              {/* Theme */}
              <div>
                <label className={labelCls}>Temática / Industria *</label>
                <select 
                  value={form.tema} 
                  onChange={set('tema')} 
                  required
                  className={`${inputCls} appearance-none bg-no-repeat bg-[right_1rem_center]`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='C19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em' }}
                >
                  <option value="">Seleccionar temática...</option>
                  {TEMAS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Country */}
              <div>
                <label className={labelCls}>País o Región *</label>
                <input
                  type="text"
                  value={form.pais}
                  onChange={set('pais')}
                  required
                  placeholder="Ej: Chile, Canadá, Global Online..."
                  className={inputCls}
                />
              </div>

              <div className="h-px bg-slate-100 my-2" />

              <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">Tus Datos de Contacto</h3>

              {/* Contact Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tu nombre *</label>
                  <input
                    type="text"
                    value={form.nombre_contacto}
                    onChange={set('nombre_contacto')}
                    required
                    placeholder="Nombre completo"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tu email *</label>
                  <input
                    type="email"
                    value={form.email_contacto}
                    onChange={set('email_contacto')}
                    required
                    placeholder="email@empresa.com"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#0c1e3c] px-6 py-4 text-sm font-extrabold text-white hover:bg-blue-900 active:scale-[0.98] disabled:opacity-60 transition-all shadow-lg shadow-blue-900/20"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                  {loading ? 'Procesando...' : 'Enviar Sugerencia'}
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-4">
                  Al enviar, aceptas que nuestro equipo valide la información antes de publicarla.
                </p>
              </div>

            </div>
          </form>
        )}

      </div>
    </div>
  )
}
