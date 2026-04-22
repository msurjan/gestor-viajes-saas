import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Esta ruta debe ser llamada por Vercel Cron o similar usando Authorization: Bearer CRON_SECRET
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado. Cron Secret inválido.' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Faltan credenciales de Supabase (Service Role).' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const geminiKey = process.env.GEMINI_API_KEY
  
  if (!geminiKey) {
    return NextResponse.json({ error: 'Falta GEMINI_API_KEY' }, { status: 500 })
  }

  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-flash-latest', 
    tools: [{ googleSearch: {} } as any] 
  })

  // 1. Obtener los próximos 5 eventos a realizarse
  const today = new Date().toISOString().split('T')[0]
  const { data: eventos, error } = await supabase
    .from('eventos_agenda')
    .select('id, nombre, ciudad, pais')
    .gte('fecha_inicio', today)
    .order('fecha_inicio', { ascending: true })
    .limit(5)

  if (error || !eventos) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }

  let noticiasAgregadas = 0

  // 2. Preguntar a la IA por noticias recientes de cada evento
  for (const ev of eventos) {
    const prompt = `Actúa como un analista de inteligencia B2B.
Busca las 2 noticias más relevantes y recientes de la prensa corporativa sobre el evento "${ev.nombre}" en ${ev.ciudad}, ${ev.pais}.
Retorna ÚNICAMENTE un array JSON válido, sin formato markdown. Si no encuentras nada relevante, retorna [].
Esquema estricto:
[
  {
    "titular": "Título de la noticia",
    "resumen": "Resumen ejecutivo de 2 líneas de la noticia.",
    "url_fuente": "https://url-oficial-de-la-noticia.com",
    "fecha_publicacion": "YYYY-MM-DD"
  }
]`
    
    try {
      const result = await model.generateContent(prompt)
      const raw = result.response.text()
      const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
      const parsed = JSON.parse(clean)

      for (const noticia of parsed) {
        // Evitar duplicados por URL
        const { count } = await supabase
          .from('noticias_eventos')
          .select('id', { count: 'exact' })
          .eq('url_fuente', noticia.url_fuente)
          
        if (count === 0) {
          await supabase.from('noticias_eventos').insert({
            evento_id: ev.id,
            titular: noticia.titular,
            resumen: noticia.resumen,
            url_fuente: noticia.url_fuente,
            fecha_publicacion: noticia.fecha_publicacion || today
          })
          noticiasAgregadas++
        }
      }
    } catch (e) {
      console.error(`Error procesando noticias para ${ev.nombre}:`, e)
    }
  }

  return NextResponse.json({ 
    success: true, 
    eventosRevisados: eventos.length, 
    noticiasNuevas: noticiasAgregadas 
  })
}
