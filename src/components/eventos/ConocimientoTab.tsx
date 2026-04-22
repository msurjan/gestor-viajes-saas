'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Evento } from '@/types/database'
import { Save, CheckCircle2, Loader2, BookOpen } from 'lucide-react'

const PLACEHOLDER = `## Contactos clave
Nombre · Rol · Teléfono · Email


## Proveedores y acuerdos
Empresa · Contacto · Condiciones pactadas


## Aprendizajes y observaciones
¿Qué funcionó bien? ¿Qué mejorar?


## Ideas para próximas ediciones


## Inquietudes / pendientes post-evento
`

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function ConocimientoTab({
  evento,
  onUpdate,
}: {
  evento: Evento
  onUpdate: (e: Evento) => void
}) {
  const [text, setText]         = useState(evento.notas ?? '')
  const [status, setStatus]     = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save with 1.5 s debounce
  useEffect(() => {
    if (text === (evento.notas ?? '')) return
    setStatus('idle')

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setStatus('saving')
      const { error, data } = await supabase
        .from('eventos')
        .update({ notas: text })
        .eq('id', evento.id)
        .select()
        .single()

      if (error) {
        setStatus('error')
      } else {
        setStatus('saved')
        setLastSaved(new Date())
        if (data) onUpdate(data as Evento)
        setTimeout(() => setStatus('idle'), 3000)
      }
    }, 1500)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  function handleManualSave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('saving')
    supabase
      .from('eventos')
      .update({ notas: text })
      .eq('id', evento.id)
      .select()
      .single()
      .then(({ error, data }) => {
        if (error) {
          setStatus('error')
        } else {
          setStatus('saved')
          setLastSaved(new Date())
          if (data) onUpdate(data as Evento)
          setTimeout(() => setStatus('idle'), 3000)
        }
      })
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-slate-400" />
          <div>
            <h2 className="text-sm font-semibold text-[#0c1e3c]">Gestión de Conocimiento</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Contactos, aprendizajes, acuerdos e inquietudes del evento. Se guarda automáticamente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Save indicator */}
          <span className="flex items-center gap-1.5 text-xs">
            {status === 'saving' && (
              <><Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /><span className="text-slate-400">Guardando…</span></>
            )}
            {status === 'saved' && (
              <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-600">Guardado</span></>
            )}
            {status === 'error' && (
              <span className="text-red-500">Error al guardar</span>
            )}
            {status === 'idle' && lastSaved && (
              <span className="text-slate-400">
                Guardado {lastSaved.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </span>

          <button
            onClick={handleManualSave}
            disabled={status === 'saving'}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Toolbar hint */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
          <span className="text-[11px] text-slate-400 font-mono">
            Markdown soportado · ## Encabezado · **negrita** · - lista
          </span>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck
          className="w-full min-h-[520px] resize-y bg-white px-6 py-5 text-sm text-slate-700 leading-relaxed placeholder-slate-300 focus:outline-none font-mono"
        />
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
        <span>{text.length.toLocaleString()} caracteres</span>
        <span>·</span>
        <span>{text.split(/\s+/).filter(Boolean).length.toLocaleString()} palabras</span>
        <span>·</span>
        <span>{text.split('\n').length} líneas</span>
      </div>
    </div>
  )
}
