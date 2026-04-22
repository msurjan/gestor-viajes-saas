import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { RadarEvento, TipoTracking } from '@/types/database'

// ── Mock Amadeus price engine ──────────────────────────────────────────
// Simulates price lookup with realistic variance:
// - Prices drift ±35% around the budget baseline
// - Slight upward pressure as event date approaches
// - Vuelos have higher volatility than hoteles

function mockAmadeusPrice(
  tipo: TipoTracking,
  presupuesto: number,
  diasAlEvento: number,
): number {
  const proximityPressure = diasAlEvento < 90
    ? ((90 - Math.max(0, diasAlEvento)) / 90) * 0.25
    : 0

  const volatility  = tipo === 'vuelo' ? 0.35 : 0.20
  const noiseBias   = tipo === 'vuelo' ? 0.05 : 0.02
  const noise       = (Math.random() - (0.5 - noiseBias)) * volatility * 2

  const raw = presupuesto * (1 + proximityPressure + noise)
  return Math.round(Math.max(20, raw) * 100) / 100
}

function calcEstado(
  precioVuelo: number | null,
  precioHotel: number | null,
  pptoVuelo: number | null,
  pptoHotel: number | null,
  fechaEstimada: string,
): 'ventana_optima' | 'buscando_precios' | 'expirado' {
  const hoy = new Date().toISOString().split('T')[0]
  if (fechaEstimada < hoy) return 'expirado'

  const vueloOk = pptoVuelo == null || (precioVuelo != null && precioVuelo <= pptoVuelo)
  const hotelOk = pptoHotel == null || (precioHotel != null && precioHotel <= pptoHotel)

  return vueloOk && hotelOk ? 'ventana_optima' : 'buscando_precios'
}

// ── GET /api/cron ──────────────────────────────────────────────────────
// Protected by Bearer token (CRON_SECRET env var).
// Called by Vercel Cron in production; testeable via curl in dev.

export async function GET(req: NextRequest) {
  // ── Auth ──
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Fetch active radares ──
  const { data: radares, error: fetchErr } = await supabase
    .from('radar_eventos')
    .select('*')
    .neq('estado_radar', 'expirado')

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!radares || radares.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No active radar events' })
  }

  const hoy = new Date().toISOString().split('T')[0]
  const processed: object[] = []
  const errors: string[]    = []

  for (const radar of radares as RadarEvento[]) {
    try {
      // Días hasta el evento
      const msDay = 1000 * 60 * 60 * 24
      const diasAlEvento = Math.max(
        0,
        (new Date(radar.fecha_estimada).getTime() - Date.now()) / msDay,
      )

      // Expirado por fecha
      if (radar.fecha_estimada < hoy) {
        await supabase
          .from('radar_eventos')
          .update({ estado_radar: 'expirado' })
          .eq('id', radar.id)
        processed.push({ id: radar.id, nombre: radar.nombre_clave, accion: 'expirado' })
        continue
      }

      // Generar precios simulados
      const precioVuelo = mockAmadeusPrice(
        'vuelo',
        radar.presupuesto_max_vuelo ?? 800,
        diasAlEvento,
      )
      const precioHotel = mockAmadeusPrice(
        'hotel',
        radar.presupuesto_max_noche ?? 180,
        diasAlEvento,
      )

      // Insertar en tracking_costos
      const { error: insErr } = await supabase.from('tracking_costos').insert([
        {
          radar_id:       radar.id,
          tipo:           'vuelo',
          precio_obtenido: precioVuelo,
          moneda:         radar.moneda,
          fecha_consulta: hoy,
        },
        {
          radar_id:       radar.id,
          tipo:           'hotel',
          precio_obtenido: precioHotel,
          moneda:         radar.moneda,
          fecha_consulta: hoy,
        },
      ])

      if (insErr) { errors.push(`${radar.id}: ${insErr.message}`); continue }

      // Recalcular estado semáforo
      const nuevoEstado = calcEstado(
        precioVuelo,
        precioHotel,
        radar.presupuesto_max_vuelo,
        radar.presupuesto_max_noche,
        radar.fecha_estimada,
      )

      await supabase
        .from('radar_eventos')
        .update({ estado_radar: nuevoEstado })
        .eq('id', radar.id)

      processed.push({
        id:     radar.id,
        nombre: radar.nombre_clave,
        vuelo:  precioVuelo,
        hotel:  precioHotel,
        estado: nuevoEstado,
        diasAlEvento: Math.round(diasAlEvento),
      })
    } catch (e) {
      errors.push(`${radar.id}: ${String(e)}`)
    }
  }

  return NextResponse.json({
    success:   true,
    timestamp: new Date().toISOString(),
    processed: processed.length,
    errors:    errors.length ? errors : undefined,
    results:   processed,
  })
}
