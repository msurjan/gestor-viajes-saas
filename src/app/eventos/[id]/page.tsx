'use client'

import { use } from 'react'
import Link from 'next/link'

export default function EventoDetallePage({ params: paramsPromise }: { params: any }) {
  // Manejamos params como promesa o como objeto directo para ser compatibles con cualquier versión de Next.js
  let id = 'cargando...'
  
  try {
    // Intentamos resolver params (si es promesa en Next.js 15+)
    const resolvedParams = paramsPromise && typeof paramsPromise.then === 'function' 
      ? use(paramsPromise) 
      : paramsPromise
    
    id = resolvedParams?.id || 'no-id'
  } catch (e) {
    id = 'error-resolving-id'
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md w-full bg-slate-50 rounded-3xl p-10 border border-slate-200 shadow-xl">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Modo Depuración</h1>
        <p className="text-slate-500 mb-8">Si estás viendo esta pantalla, la ruta dinámica está funcionando correctamente.</p>
        
        <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">ID Detectado</p>
          <code className="text-indigo-600 font-mono font-bold break-all">{id}</code>
        </div>

        <Link 
          href="/" 
          className="inline-block bg-[#0c1e3c] text-white px-8 py-3 rounded-2xl font-semibold hover:bg-blue-900 transition-all shadow-lg"
        >
          ← Volver al Dashboard
        </Link>
      </div>
      
      <p className="mt-8 text-xs text-slate-400">
        Esta es una versión simplificada para encontrar por qué se cae la ficha completa.
      </p>
    </div>
  )
}
