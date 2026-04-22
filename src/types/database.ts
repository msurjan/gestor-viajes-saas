export type EstadoAgenda = 'evaluacion' | 'confirmado_visita' | 'confirmado_auspiciador' | 'descartado'

export interface Empresa {
  id: string
  nombre: string
  sector_industrial: string | null
  pais: string | null
  created_at: string
}

export interface PerfilUsuario {
  user_id: string
  empresa_id: string | null
  cargo_estrategico: string | null
  linkedin_url: string | null
  created_at: string
}

export interface EventoAgenda {
  id: string
  nombre: string
  descripcion: string
  fecha_inicio: string
  fecha_fin: string
  ciudad: string | null
  pais: string | null
  fuente_url: string | null
  tema: string | null
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export interface AsistenciaEvento {
  user_id: string
  evento_id: string
  estado_asistencia: EstadoAgenda
  created_at: string
}

export interface NoticiaEvento {
  id: string
  evento_id: string
  titular: string
  resumen: string
  url_fuente: string
  fecha_publicacion: string
  created_at: string
}

// Para inserciones
export type EventoAgendaInsert = Omit<EventoAgenda, 'id' | 'created_at' | 'updated_at'>
export type EventoAgendaUpdate = Partial<EventoAgendaInsert>

// ─────────────────────────────────────────────────────────────────────────────
// Tipos legacy (usados por los componentes de pestaña de eventos anteriores)
// ─────────────────────────────────────────────────────────────────────────────

export type TipoEvento = 'corporativo' | 'incentivo' | 'conferencia' | 'team_building' | 'lanzamiento' | 'otro'
export type EstadoEvento = 'borrador' | 'confirmado' | 'en_curso' | 'finalizado' | 'cancelado'

export interface Evento {
  id: string
  nombre: string
  tipo: TipoEvento
  estado: EstadoEvento
  cliente: string | null
  descripcion: string | null
  ubicacion: string
  ciudad: string | null
  pais: string | null
  moneda: string
  fecha_inicio: string
  fecha_fin: string
  costo_estimado: number | null
  costo_real: number | null
  num_participantes: number | null
  notas: string | null
  link_vuelo_scl: string | null
  link_hotel: string | null
  created_at: string
  updated_at: string
}

export type EventoInsert = Omit<Evento, 'id' | 'created_at' | 'updated_at'>

export type CategoriaGasto = 'alojamiento' | 'transporte' | 'catering' | 'audio_visual' | 'honorarios' | 'marketing' | 'imprevistos' | 'otro'
export type EstadoGasto = 'pendiente' | 'pagado' | 'reembolsado' | 'anulado'

export interface Gasto {
  id: string
  evento_id: string
  proveedor_id: string | null
  logistica_id: string | null
  categoria: CategoriaGasto
  descripcion: string
  monto: number
  moneda: string
  fecha: string
  estado: EstadoGasto
  comprobante_url: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type GastoInsert = Omit<Gasto, 'id' | 'created_at' | 'updated_at'>

// ─────────────────────────────────────────────────────────────────────────────
// Tipos del módulo de radar de precios (cron job)
// ─────────────────────────────────────────────────────────────────────────────

export type TipoTracking = 'vuelo' | 'hotel'

export interface RadarEvento {
  id: string
  nombre_clave: string
  fecha_inicio: string
  presupuesto_max_vuelo: number | null
  presupuesto_max_noche: number | null
  moneda: string
  estado_radar: string
  created_at: string
}
