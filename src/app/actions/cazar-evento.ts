'use server'

import { ANGLES, type AngleIndex } from '@/lib/search-angles'
export type { AngleIndex } from '@/lib/search-angles'

// ── Shared types ────────────────────────────────────────────────────────

export type EventoBorrador = {
  id: string
  nombre: string
  descripcion: string
  tema: string
  fecha_inicio: string   // YYYY-MM-DD
  fecha_fin: string      // YYYY-MM-DD
  ciudad: string
  pais: string
  lat: number
  lng: number
  fuente_url: string
  costo_entrada: string
  imagen_url: string
  confianza: number
  yaExiste?: boolean
}

export type CazarEventoResult = {
  borradores: EventoBorrador[]
  fuente: 'perplexity' | 'mock'
  angleLabel?: string
  error?: string
}

// ── System prompt ───────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0]

const SYSTEM = `You are Vento Global's Corporate Intelligence Assistant, specialized in finding mining, energy, tech, finance, and industrial strategic conferences worldwide.
Today's date is ${todayStr()}.
CRITICAL: Return ONLY future events (fecha_inicio > today). Never return past events.
Return ONLY valid JSON — no markdown, no explanations — matching EXACTLY this schema:
{
  "eventos": [
    {
      "nombre": "Full official event name",
      "descripcion": "Official and detailed thematic description of the event.",
      "tema": "One of: Minería y Metales, Energía y Renovables, Tecnología e IA, Finanzas e Inversión, Infraestructura y Construcción, Sostenibilidad y ESG, Logística y Transporte, Manufactura e Industria 4.0, Petróleo y Gas, Otros Temas Estratégicos",
      "fecha_inicio": "YYYY-MM-DD",
      "fecha_fin": "YYYY-MM-DD",
      "ciudad": "City",
      "pais": "Country",
      "lat": 0.0,
      "lng": 0.0,
      "fuente_url": "https://official-website.com",
      "costo_entrada": "Standard Ticket: $495 USD",
      "imagen_url": "",
      "confianza": 0.9
    }
  ]
}
If you cannot find reliable data for a field, use null or an empty string. Never guess dates.`

// ── Mock fallback ───────────────────────────────────────────────────────

const MOCK_DB: Record<string, EventoBorrador[]> = {
  pdac: [{
    id: '', nombre: 'PDAC 2027', descripcion: 'Premier mineral exploration and mining convention.',
    tema: 'Minería y Metales', fecha_inicio: '2027-03-07', fecha_fin: '2027-03-10',
    ciudad: 'Toronto', pais: 'Canada', lat: 43.6532, lng: -79.3832,
    fuente_url: 'https://www.pdac.ca', costo_entrada: 'Standard: ~$500 CAD', imagen_url: '', confianza: 0.9,
  }],
  adipec: [{
    id: '', nombre: 'ADIPEC 2026', descripcion: 'International petroleum exhibition & conference.',
    tema: 'Petróleo y Gas', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-12',
    ciudad: 'Abu Dhabi', pais: 'UAE', lat: 24.4539, lng: 54.3773,
    fuente_url: 'https://www.adipec.com', costo_entrada: 'Free for delegates', imagen_url: '', confianza: 0.88,
  }],
}

function mockSearch(query: string): EventoBorrador[] {
  const q = query.toLowerCase().trim()
  for (const [key, events] of Object.entries(MOCK_DB)) {
    if (q.includes(key) || key.includes(q)) {
      return events.map((e, i) => ({ ...e, id: `draft-${Date.now()}-${i}` }))
    }
  }
  return [{
    id: `draft-${Date.now()}-0`,
    nombre: `${query.toUpperCase()} Conference 2027`,
    descripcion: `Industry conference related to "${query}". (Datos simulados — configura PERPLEXITY_API_KEY para resultados reales.)`,
    tema: 'Otros Temas Estratégicos', fecha_inicio: '2027-04-15', fecha_fin: '2027-04-18',
    ciudad: 'Ciudad de México', pais: 'Mexico', lat: 19.4326, lng: -99.1332,
    fuente_url: 'https://example.com', costo_entrada: '', imagen_url: '', confianza: 0.3,
  }]
}

// ── Main action ─────────────────────────────────────────────────────────

export async function cazarEvento(
  query: string,
  options?: {
    angleIndex?: AngleIndex   // which search angle to use (0–4)
    exclude?: string[]        // event names already found — tell Perplexity to skip them
  }
): Promise<CazarEventoResult> {
  if (!query.trim()) return { borradores: [], fuente: 'mock' }

  const angleIdx = options?.angleIndex ?? 0
  const angle    = ANGLES[angleIdx]
  const exclude  = options?.exclude?.length
    ? `\n\nALREADY IN OUR CATALOG — do NOT return these: ${options.exclude.slice(0, 20).join(' | ')}`
    : ''

  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) return { borradores: mockSearch(query), fuente: 'mock' }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        temperature: 0.8,   // más variedad en cada búsqueda
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: angle.prompt(query, exclude) },
        ],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`Perplexity ${response.status}`)

    const data = await response.json()
    const raw: string = data.choices[0].message.content
    const clean = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    const parsed = JSON.parse(clean)
    const hoy = todayStr()

    const borradores: EventoBorrador[] = (parsed.eventos ?? [])
      .filter((e: any) => e.fecha_inicio && e.fecha_inicio > hoy)
      .slice(0, 5)
      .map((e: Omit<EventoBorrador, 'id'>, i: number) => ({
        ...e,
        imagen_url: e.imagen_url || '',
        id: `draft-${Date.now()}-${angleIdx}-${i}`,
      }))

    return { borradores, fuente: 'perplexity', angleLabel: angle.label }
  } catch (err) {
    console.error('[cazarEvento]', err)
    const isTimeout = err instanceof Error && err.message.includes('abort')
    return {
      borradores: mockSearch(query),
      fuente: 'mock',
      angleLabel: angle.label,
      error: isTimeout ? 'Timeout (15s)' : String(err),
    }
  }
}
