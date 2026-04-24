-- =============================================================
-- VENTO GLOBAL — Schema V3.0 (B2B SaaS)
-- Motor: PostgreSQL (Supabase)
-- =============================================================

-- ─────────────────────────────────────────────
-- NUEVO MODELO DE DATOS V3
-- ─────────────────────────────────────────────

DROP TABLE IF EXISTS noticias_eventos CASCADE;
DROP TABLE IF EXISTS asistencias_eventos CASCADE;
DROP TABLE IF EXISTS perfiles_usuarios CASCADE;
DROP TABLE IF EXISTS empresas CASCADE;
-- Mantenemos eventos_agenda si ya existe, pero la modificamos abajo si es necesario, 
-- o simplemente la recreamos si estamos en ambiente de desarrollo.
-- Para desarrollo, borraremos todo para recrear limpio:
DROP TABLE IF EXISTS eventos_agenda CASCADE;
DROP TYPE IF EXISTS estado_agenda CASCADE;

CREATE TYPE estado_agenda AS ENUM (
  'evaluacion',
  'confirmado_visita',
  'confirmado_auspiciador',
  'descartado'
);

CREATE TABLE empresas (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            TEXT           NOT NULL,
  sector_industrial TEXT,
  pais              TEXT,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE perfiles_usuarios (
  user_id           UUID           PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id        UUID           REFERENCES empresas(id) ON DELETE SET NULL,
  cargo_estrategico TEXT,
  linkedin_url      TEXT,
  es_demo           BOOLEAN        DEFAULT FALSE,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE eventos_agenda (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            TEXT           NOT NULL,
  descripcion       TEXT,
  fecha_inicio      DATE           NOT NULL,
  fecha_fin         DATE           NOT NULL,
  ciudad            TEXT,
  pais              TEXT,
  lat               FLOAT,
  lng               FLOAT,
  fuente_url        TEXT,
  tema              TEXT,
  costo_entrada     TEXT,
  imagen_url        TEXT,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT fechas_validas CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE asistencias_eventos (
  user_id           UUID           REFERENCES auth.users(id) ON DELETE CASCADE,
  evento_id         UUID           REFERENCES eventos_agenda(id) ON DELETE CASCADE,
  estado_asistencia estado_agenda  NOT NULL DEFAULT 'evaluacion',
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, evento_id)
);

CREATE TABLE noticias_eventos (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id         UUID           REFERENCES eventos_agenda(id) ON DELETE CASCADE,
  titular           TEXT           NOT NULL,
  resumen           TEXT           NOT NULL,
  url_fuente        TEXT           NOT NULL,
  fecha_publicacion DATE,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE reportes_precios_comunidad (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id       UUID         NOT NULL REFERENCES eventos_agenda(id) ON DELETE CASCADE,
  user_id         UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  categoria       TEXT         NOT NULL CHECK (categoria IN ('Visitante', 'Expositor (Stand)', 'Patrocinador', 'Membresía')),
  detalle         TEXT         NOT NULL,
  monto           NUMERIC      NOT NULL CHECK (monto > 0),
  moneda          TEXT         NOT NULL DEFAULT 'USD',
  unidad          TEXT         NOT NULL CHECK (unidad IN ('persona', 'm2', 'total')),
  fecha_reporte   DATE         NOT NULL DEFAULT CURRENT_DATE,
  fuente_url      TEXT,
  comentario      TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SEGURIDAD (RLS)
-- ─────────────────────────────────────────────

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE noticias_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_autenticados_empresas" ON empresas FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "acceso_autenticados_perfiles" ON perfiles_usuarios FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "acceso_autenticados_eventos" ON eventos_agenda FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "acceso_autenticados_asist" ON asistencias_eventos FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "acceso_autenticados_noticias" ON noticias_eventos FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE reportes_precios_comunidad ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_autenticados_precios" ON reportes_precios_comunidad FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS sugerencias_eventos (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo             TEXT         NOT NULL DEFAULT 'evento', -- 'evento' | 'tematica' | 'geografia' | 'otra'
  nombre           TEXT         NOT NULL,
  descripcion      TEXT,
  tema             TEXT,
  fecha_inicio     DATE,
  fecha_fin        DATE,
  ciudad           TEXT,
  pais             TEXT,
  fuente_url       TEXT,
  nombre_contacto  TEXT,
  email_contacto   TEXT,
  estado           TEXT         DEFAULT 'pendiente',
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);
-- Si la tabla ya existe, agregar la columna tipo:
-- ALTER TABLE sugerencias_eventos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'evento';
ALTER TABLE sugerencias_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_public" ON sugerencias_eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "select_admin"  ON sugerencias_eventos FOR SELECT USING (true);

-- ACTUALIZACI�N DE TEM�TICAS VENTO GLOBAL
UPDATE eventos_agenda SET tema = CASE WHEN tema = 'Innovaci�n' THEN 'Tecnolog�a e IA' WHEN tema = 'Maquinaria' THEN 'Manufactura e Industria 4.0' WHEN tema = 'Finanzas' THEN 'Finanzas e Inversi�n' WHEN tema = 'Geolog�a' THEN 'Miner�a y Metales' WHEN tema = 'Energ�a' THEN 'Energ�a y Renovables' WHEN tema = 'Miner�a' THEN 'Miner�a y Metales' WHEN tema = 'Otro' THEN 'Otros Temas Estrat�gicos' ELSE tema END;
