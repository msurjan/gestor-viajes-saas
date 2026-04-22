// ── Eventos ────────────────────────────────────────────────────────────

export type TipoEvento =
  | 'corporativo' | 'incentivo' | 'conferencia'
  | 'team_building' | 'lanzamiento' | 'otro'

export type EstadoEvento =
  | 'borrador' | 'confirmado' | 'en_curso' | 'finalizado' | 'cancelado'

export interface Evento {
  id: string
  nombre: string
  descripcion: string | null
  cliente: string | null
  ubicacion: string
  pais: string | null
  ciudad: string | null
  fecha_inicio: string
  fecha_fin: string
  tipo: TipoEvento
  estado: EstadoEvento
  num_participantes: number | null
  costo_estimado: number | null
  costo_real: number | null
  moneda: string
  notas: string | null
  link_vuelo_scl: string | null
  link_hotel: string | null
  created_at: string
  updated_at: string
}

export type EventoInsert = Omit<Evento, 'id' | 'created_at' | 'updated_at'>
export type EventoUpdate = Partial<EventoInsert>

// ── Proveedores ────────────────────────────────────────────────────────

export type TipoProveedor =
  | 'hotel' | 'aerolinea' | 'transporte_terrestre' | 'catering'
  | 'audio_visual' | 'agencia' | 'actividad' | 'otro'

export interface Proveedor {
  id: string
  nombre: string
  tipo: TipoProveedor
  contacto_nombre: string | null
  contacto_email: string | null
  contacto_telefono: string | null
  pais: string | null
  ciudad: string | null
  sitio_web: string | null
  condiciones_pago: string | null
  calificacion: number | null
  activo: boolean
  notas: string | null
  created_at: string
  updated_at: string
}

export type ProveedorInsert = Omit<Proveedor, 'id' | 'created_at' | 'updated_at'>

// ── Logística ──────────────────────────────────────────────────────────

export type TipoLogistica =
  | 'vuelo' | 'traslado' | 'alojamiento' | 'actividad'
  | 'catering' | 'equipamiento' | 'otro'

export type EstadoLogistica = 'pendiente' | 'confirmado' | 'cancelado'

export interface Logistica {
  id: string
  evento_id: string
  proveedor_id: string | null
  tipo: TipoLogistica
  descripcion: string
  fecha_inicio: string | null
  fecha_fin: string | null
  origen: string | null
  destino: string | null
  num_personas: number | null
  confirmacion_ref: string | null
  estado: EstadoLogistica
  notas: string | null
  created_at: string
  updated_at: string
}

export type LogisticaInsert = Omit<Logistica, 'id' | 'created_at' | 'updated_at'>

// ── Gastos ─────────────────────────────────────────────────────────────

export type CategoriaGasto =
  | 'alojamiento' | 'transporte' | 'catering' | 'audio_visual'
  | 'honorarios' | 'marketing' | 'imprevistos' | 'otro'

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

// ── Radar estratégico ──────────────────────────────────────────────────

export type EstadoRadar = 'buscando_precios' | 'ventana_optima' | 'expirado'
export type TipoTracking = 'vuelo' | 'hotel'

export interface RadarEvento {
  id: string
  nombre_clave: string
  fecha_estimada: string
  ciudad: string | null
  pais: string | null
  fuente_url: string | null
  estado_radar: EstadoRadar
  presupuesto_max_noche: number | null
  presupuesto_max_vuelo: number | null
  moneda: string
  tema: string | null
  created_at: string
  updated_at: string
}

export type RadarEventoInsert = Omit<RadarEvento, 'id' | 'created_at' | 'updated_at'>

export interface TrackingCosto {
  id: string
  radar_id: string
  tipo: TipoTracking
  precio_obtenido: number
  moneda: string
  fecha_consulta: string
  link_compra: string | null
  created_at: string
}
