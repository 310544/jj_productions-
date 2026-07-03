-- ============================================
-- RentaTraje - Recordatorio automático al SASTRE (Trajes a la medida)
-- Ejecutar en: Supabase SQL Editor
-- ============================================
-- Cada traje a la medida (tabla `encargos`) tiene fecha de entrega. Este módulo
-- avisa por WhatsApp a la persona que hace los trajes (el sastre) DOS veces:
--   • Aviso 1: cuando faltan `dias_aviso_1` días (por defecto 5).
--   • Aviso 2: cuando falta `dias_aviso_2` días  (por defecto 1 = "se entrega mañana").
-- Cada aviso se manda UNA sola vez (se marca la fecha de envío y no se repite).
-- El número del sastre y los días son editables desde el tab "A la medida".
-- ============================================

-- 1. Ajustes del sastre (una sola fila: singleton id = 1)
CREATE TABLE IF NOT EXISTS config_encargos (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),   -- forzamos una única fila
  sastre_nombre    TEXT,                          -- nombre de quien hace los trajes
  sastre_telefono  TEXT,                          -- WhatsApp del sastre: indicativo + número, solo dígitos (ej. 57300...)
  callmebot_apikey TEXT,                          -- clave que CallMeBot le da a ESE número
  dias_aviso_1     INT NOT NULL DEFAULT 5,        -- primer aviso: N días antes de la entrega
  dias_aviso_2     INT NOT NULL DEFAULT 1,        -- segundo aviso: N días antes ("mañana")
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fila única inicial (si no existe)
INSERT INTO config_encargos (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. Marcas de aviso en cada encargo (para no mandar dos veces el mismo aviso)
ALTER TABLE encargos ADD COLUMN IF NOT EXISTS aviso_5dias_enviado_at TIMESTAMPTZ;
ALTER TABLE encargos ADD COLUMN IF NOT EXISTS aviso_1dia_enviado_at  TIMESTAMPTZ;

-- 2b. Solicitud de PRUEBA (el botón "Prueba" del ⚙️ la marca; el bot la recoge y envía)
ALTER TABLE config_encargos ADD COLUMN IF NOT EXISTS test_solicitado_at TIMESTAMPTZ;

-- 3. Seguridad (igual que el resto de la app: anon puede leer/escribir)
ALTER TABLE config_encargos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cfg_enc_all ON config_encargos;
CREATE POLICY cfg_enc_all ON config_encargos FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================
-- LISTO. Con esto la app ya puede guardar el número del sastre y los días.
-- El ENVÍO automático (pg_cron + Edge Function) se configura en el paso 3,
-- en el archivo aparte: recordatorio_sastre_cron.sql
-- ============================================
