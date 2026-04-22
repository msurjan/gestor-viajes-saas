'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

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
  confianza: number      // 0 – 1
}

export type CazarEventoResult = {
  borradores: EventoBorrador[]
  fuente: 'gemini' | 'mock'
  error?: string
}

// ── System prompt ───────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const SYSTEM = `You are a corporate intelligence assistant specialized in finding mining, energy, finance, and industry conferences worldwide.
Today's date is ${today()}.
When asked about an event, find its NEXT upcoming edition (after today) using your Google Search grounding tool to get current, real dates and official URLs.
Return ONLY valid JSON — no markdown, no explanations — matching EXACTLY this schema:
{
  "eventos": [
    {
      "nombre": "Full official event name",
      "descripcion": "Official and detailed thematic description of the event.",
      "tema": "One of: Innovación, Maquinaria, Finanzas, Geología, Energía, Minería, Otro",
      "fecha_inicio": "YYYY-MM-DD",
      "fecha_fin": "YYYY-MM-DD",
      "ciudad": "City",
      "pais": "Country",
      "lat": 0.0,
      "lng": 0.0,
      "fuente_url": "https://official-website.com",
      "costo_entrada": "Standard Ticket: $495 USD",
      "imagen_url": "https://official-website.com/banner.jpg",
      "confianza": 0.9
    }
  ]
}
If the event has multiple tracks or you find multiple editions, return each as a separate object.
If you cannot find reliable data, return an empty array.
IMPORTANT: Use the search results to provide accurate, up-to-date information. Do not guess dates.`

// ── Mock fallback (no API key) ──────────────────────────────────────────

const MOCK_DB: Record<string, EventoBorrador[]> = {
  pdac: [
    {
      id: '', nombre: 'PDAC 2027', descripcion: 'Premier mineral exploration and mining convention.',
      tema: 'Minería',
      fecha_inicio: '2027-03-07', fecha_fin: '2027-03-10',
      ciudad: 'Toronto', pais: 'Canada',
      lat: 43.6532, lng: -79.3832,
      fuente_url: 'https://www.pdac.ca',
      costo_entrada: 'Standard: ~$500 CAD', imagen_url: '',
      confianza: 0.9,
    },
  ],
  adipec: [
    {
      id: '', nombre: 'ADIPEC 2026', descripcion: 'International petroleum exhibition & conference.',
      tema: 'Energía',
      fecha_inicio: '2026-11-09', fecha_fin: '2026-11-12',
      ciudad: 'Abu Dhabi', pais: 'UAE',
      lat: 24.4539, lng: 54.3773,
      fuente_url: 'https://www.adipec.com',
      costo_entrada: 'Free for delegates', imagen_url: '',
      confianza: 0.88,
    },
  ],
  davos: [
    {
      id: '', nombre: 'World Economic Forum Annual Meeting 2027', descripcion: 'Annual Davos gathering of world leaders.',
      tema: 'Finanzas',
      fecha_inicio: '2027-01-19', fecha_fin: '2027-01-23',
      ciudad: 'Davos', pais: 'Switzerland',
      lat: 46.8027, lng: 9.8359,
      fuente_url: 'https://www.weforum.org',
      costo_entrada: 'By invitation only', imagen_url: '',
      confianza: 0.92,
    },
  ],
  coaltrans: [
    {
      id: '', nombre: 'Coaltrans World Coal Conference 2026', descripcion: 'Global coal industry conference.',
      tema: 'Minería',
      fecha_inicio: '2026-09-14', fecha_fin: '2026-09-16',
      ciudad: 'Athens', pais: 'Greece',
      lat: 37.9838, lng: 23.7275,
      fuente_url: 'https://www.coaltrans.com',
      costo_entrada: 'Standard: ~$2,500 USD', imagen_url: '',
      confianza: 0.82,
    },
  ],
}

function mockSearch(query: string): EventoBorrador[] {
  const q = query.toLowerCase().trim()
  for (const [key, events] of Object.entries(MOCK_DB)) {
    if (q.includes(key) || key.includes(q)) {
      return events.map((e, i) => ({ ...e, id: `draft-${Date.now()}-${i}` }))
    }
  }
  return [
    {
      id:           `draft-${Date.now()}-0`,
      nombre:       `${query.toUpperCase()} 2027`,
      descripcion:  `Industry conference related to "${query}". (Datos simulados — configura GEMINI_API_KEY para resultados reales con búsqueda en Google.)`,
      tema:         'Otro',
      fecha_inicio: '2027-04-15',
      fecha_fin:    '2027-04-18',
      ciudad:       'Ciudad de México',
      pais:         'Mexico',
      lat:          19.4326,
      lng:          -99.1332,
      fuente_url:   'https://example.com',
      costo_entrada: '',
      imagen_url:   '',
      confianza:    0.3,
    },
  ]
}

// ── Main action ─────────────────────────────────────────────────────────

export async function cazarEvento(query: string): Promise<CazarEventoResult> {
  if (!query.trim()) return { borradores: [], fuente: 'mock' }

  const geminiKey = process.env.GEMINI_API_KEY

  if (!geminiKey) {
    return { borradores: mockSearch(query), fuente: 'mock' }
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey)

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      tools: [{ googleSearch: {} } as any],
    })

    const prompt = `${SYSTEM}\n\nFind the next upcoming edition of: "${query}"`

    const result = await model.generateContent(prompt)
    const raw = result.response.text()

    // Strip possible markdown code fences
    const clean = raw
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim()

    const parsed = JSON.parse(clean)

    const borradores: EventoBorrador[] = (parsed.eventos ?? []).map(
      (e: Omit<EventoBorrador, 'id'>, i: number) => ({
        ...e,
        id: `draft-${Date.now()}-${i}`,
      }),
    )

    return { borradores, fuente: 'gemini' }
  } catch (err) {
    console.error('[cazarEvento]', err)
    return {
      borradores: mockSearch(query),
      fuente: 'mock',
      error: String(err),
    }
  }
}
