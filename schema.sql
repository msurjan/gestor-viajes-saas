-- =============================================================
-- GESTOR VIAJES — Schema MVP
-- Motor: PostgreSQL (Supabase)
-- =============================================================

-- ─────────────────────────────────────────────
-- LIMPIEZA PREVIA (Opcional, cuidado si tienes datos)
-- ─────────────────────────────────────────────
DROP VIEW IF EXISTS resumen_financiero_por_evento CASCADE;
DROP TABLE IF EXISTS tracking_costos CASCADE;
DROP TABLE IF EXISTS radar_eventos CASCADE;
DROP TABLE IF EXISTS gastos CASCADE;
DROP TABLE IF EXISTS logistica CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;

DROP TYPE IF EXISTS tipo_evento CASCADE;
DROP TYPE IF EXISTS estado_evento CASCADE;
DROP TYPE IF EXISTS tipo_proveedor CASCADE;
DROP TYPE IF EXISTS tipo_logistica CASCADE;
DROP TYPE IF EXISTS estado_logistica CASCADE;
DROP TYPE IF EXISTS categoria_gasto CASCADE;
DROP TYPE IF EXISTS estado_gasto CASCADE;
DROP TYPE IF EXISTS estado_radar CASCADE;
DROP TYPE IF EXISTS tipo_tracking CASCADE;

-- ─────────────────────────────────────────────
-- TIPOS ENUMERADOS
-- ─────────────────────────────────────────────

CREATE TYPE estado_radar AS ENUM (
  'buscando_precios',
  'ventana_optima',
  'expirado'
);

CREATE TYPE tipo_tracking AS ENUM (
  'vuelo',
  'hotel'
);

CREATE TYPE tipo_evento AS ENUM (
  'corporativo',
  'incentivo',
  'conferencia',
  'team_building',
  'lanzamiento',
  'otro'
);

CREATE TYPE estado_evento AS ENUM (
  'borrador',
  'confirmado',
  'en_curso',
  'finalizado',
  'cancelado'
);

CREATE TYPE tipo_proveedor AS ENUM (
  'hotel',
  'aerolinea',
  'transporte_terrestre',
  'catering',
  'audio_visual',
  'agencia',
  'actividad',
  'otro'
);

CREATE TYPE tipo_logistica AS ENUM (
  'vuelo',
  'traslado',
  'alojamiento',
  'actividad',
  'catering',
  'equipamiento',
  'otro'
);

CREATE TYPE estado_logistica AS ENUM (
  'pendiente',
  'confirmado',
  'cancelado'
);

CREATE TYPE categoria_gasto AS ENUM (
  'alojamiento',
  'transporte',
  'catering',
  'audio_visual',
  'honorarios',
  'marketing',
  'imprevistos',
  'otro'
);

CREATE TYPE estado_gasto AS ENUM (
  'pendiente',
  'pagado',
  'reembolsado',
  'anulado'
);


-- ─────────────────────────────────────────────
-- TABLA: eventos
-- Entidad central del sistema.
-- ─────────────────────────────────────────────

CREATE TABLE eventos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  nombre            TEXT          NOT NULL,
  descripcion       TEXT,
  cliente           TEXT,                         -- empresa o persona que contrata

  ubicacion         TEXT          NOT NULL,
  pais              TEXT,
  ciudad            TEXT,

  fecha_inicio      DATE          NOT NULL,
  fecha_fin         DATE          NOT NULL,

  tipo              tipo_evento   NOT NULL DEFAULT 'otro',
  estado            estado_evento NOT NULL DEFAULT 'borrador',

  num_participantes INT           CHECK (num_participantes >= 0),
  costo_estimado    NUMERIC(12,2) CHECK (costo_estimado >= 0),
  costo_real        NUMERIC(12,2) CHECK (costo_real >= 0),  -- calculado / actualizable
  moneda            CHAR(3)       NOT NULL DEFAULT 'USD',

  notas             TEXT,

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fechas_validas CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX idx_eventos_estado      ON eventos (estado);
CREATE INDEX idx_eventos_fecha_inicio ON eventos (fecha_inicio);


-- ─────────────────────────────────────────────
-- TABLA: proveedores
-- Catálogo reutilizable entre eventos.
-- ─────────────────────────────────────────────

CREATE TABLE proveedores (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

  nombre            TEXT            NOT NULL,
  tipo              tipo_proveedor  NOT NULL DEFAULT 'otro',

  contacto_nombre   TEXT,
  contacto_email    TEXT,
  contacto_telefono TEXT,

  pais              TEXT,
  ciudad            TEXT,
  sitio_web         TEXT,

  condiciones_pago  TEXT,           -- ej. "50% anticipo, 50% al finalizar"
  calificacion      SMALLINT        CHECK (calificacion BETWEEN 1 AND 5),
  activo            BOOLEAN         NOT NULL DEFAULT TRUE,

  notas             TEXT,

  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proveedores_tipo   ON proveedores (tipo);
CREATE INDEX idx_proveedores_activo ON proveedores (activo);


-- ─────────────────────────────────────────────
-- TABLA: logistica
-- Ítems operativos de cada evento.
-- Cada fila es un segmento concreto (vuelo, hotel, traslado…).
-- ─────────────────────────────────────────────

CREATE TABLE logistica (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),

  evento_id         UUID             NOT NULL REFERENCES eventos (id) ON DELETE CASCADE,
  proveedor_id      UUID             REFERENCES proveedores (id) ON DELETE SET NULL,

  tipo              tipo_logistica   NOT NULL DEFAULT 'otro',
  descripcion       TEXT             NOT NULL,

  fecha_inicio      TIMESTAMPTZ,
  fecha_fin         TIMESTAMPTZ,

  origen            TEXT,            -- para vuelos / traslados
  destino           TEXT,

  num_personas      INT              CHECK (num_personas >= 0),
  confirmacion_ref  TEXT,            -- número de reserva / localizador

  estado            estado_logistica NOT NULL DEFAULT 'pendiente',
  notas             TEXT,

  created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT logistica_fechas_validas CHECK (
    fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio
  )
);

CREATE INDEX idx_logistica_evento_id    ON logistica (evento_id);
CREATE INDEX idx_logistica_proveedor_id ON logistica (proveedor_id);
CREATE INDEX idx_logistica_estado       ON logistica (estado);


-- ─────────────────────────────────────────────
-- TABLA: gastos
-- Registro financiero de cada evento.
-- Puede ligarse a un ítem de logística específico.
-- ─────────────────────────────────────────────

CREATE TABLE gastos (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

  evento_id         UUID           NOT NULL REFERENCES eventos (id) ON DELETE CASCADE,
  proveedor_id      UUID           REFERENCES proveedores (id) ON DELETE SET NULL,
  logistica_id      UUID           REFERENCES logistica (id) ON DELETE SET NULL,

  categoria         categoria_gasto NOT NULL DEFAULT 'otro',
  descripcion       TEXT            NOT NULL,

  monto             NUMERIC(12,2)   NOT NULL CHECK (monto >= 0),
  moneda            CHAR(3)         NOT NULL DEFAULT 'USD',

  fecha             DATE            NOT NULL DEFAULT CURRENT_DATE,
  estado            estado_gasto    NOT NULL DEFAULT 'pendiente',

  comprobante_url   TEXT,           -- enlace a factura / recibo en Storage
  notas             TEXT,

  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gastos_evento_id    ON gastos (evento_id);
CREATE INDEX idx_gastos_proveedor_id ON gastos (proveedor_id);
CREATE INDEX idx_gastos_logistica_id ON gastos (logistica_id);
CREATE INDEX idx_gastos_estado       ON gastos (estado);
CREATE INDEX idx_gastos_fecha        ON gastos (fecha);


-- ─────────────────────────────────────────────
-- TABLA: radar_eventos (Detección temprana)
-- ─────────────────────────────────────────────
CREATE TABLE radar_eventos (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_clave      TEXT           NOT NULL, -- ej. "PDAC 2027"
  fecha_estimada    DATE           NOT NULL,
  ciudad            TEXT,
  pais              TEXT,
  fuente_url        TEXT,
  estado_radar      estado_radar   NOT NULL DEFAULT 'buscando_precios',
  presupuesto_max_noche NUMERIC(12,2),
  presupuesto_max_vuelo NUMERIC(12,2),
  moneda            CHAR(3)        NOT NULL DEFAULT 'USD',
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TABLA: tracking_costos (Historial de Precios para el Semáforo)
-- ─────────────────────────────────────────────
CREATE TABLE tracking_costos (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  radar_id          UUID           NOT NULL REFERENCES radar_eventos (id) ON DELETE CASCADE,
  tipo              tipo_tracking  NOT NULL, 
  precio_obtenido   NUMERIC(12,2)  NOT NULL,
  moneda            CHAR(3)        NOT NULL DEFAULT 'USD',
  fecha_consulta    DATE           NOT NULL DEFAULT CURRENT_DATE,
  link_compra       TEXT,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_radar_id ON tracking_costos (radar_id);


-- ─────────────────────────────────────────────
-- FUNCIÓN + TRIGGER: updated_at automático

-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_eventos_updated_at
  BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_logistica_updated_at
  BEFORE UPDATE ON logistica
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_gastos_updated_at
  BEFORE UPDATE ON gastos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────
-- VISTA: resumen_financiero_por_evento
-- Útil para dashboards sin calcular en el cliente.
-- ─────────────────────────────────────────────

CREATE VIEW resumen_financiero_por_evento AS
SELECT
  e.id                                          AS evento_id,
  e.nombre                                      AS evento,
  e.estado,
  e.moneda,
  e.costo_estimado,
  COALESCE(SUM(g.monto) FILTER (WHERE g.estado != 'anulado'), 0) AS gasto_total,
  COALESCE(SUM(g.monto) FILTER (WHERE g.estado = 'pagado'),   0) AS gasto_pagado,
  COALESCE(SUM(g.monto) FILTER (WHERE g.estado = 'pendiente'),0) AS gasto_pendiente,
  e.costo_estimado - COALESCE(SUM(g.monto) FILTER (WHERE g.estado != 'anulado'), 0)
                                                AS margen_estimado
FROM eventos e
LEFT JOIN gastos g ON g.evento_id = e.id
GROUP BY e.id;


-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (base — activar en Supabase)
-- ─────────────────────────────────────────────

ALTER TABLE eventos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos     ENABLE ROW LEVEL SECURITY;

-- Política de ejemplo: usuarios autenticados ven todo.
-- Reemplazar con lógica de roles cuando se implemente auth.

CREATE POLICY "acceso_autenticados" ON eventos
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON proveedores
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON logistica
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON gastos
  FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE radar_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_costos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_autenticados" ON radar_eventos
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON tracking_costos
  FOR ALL TO public USING (true) WITH CHECK (true);
