-- ============================================
-- RentaTraje - Módulo "Trajes a la medida" (Encargos)
-- Ejecutar en: Supabase SQL Editor
-- ============================================
-- Trajes que el cliente manda a hacer (para vender). Se registran aparte del
-- inventario de alquiler, tienen su propia factura, abonos y fecha de entrega.
-- ============================================

-- 1. Encargos (un traje a la medida por fila)
CREATE TABLE IF NOT EXISTS encargos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo TEXT UNIQUE,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT,
  cliente_cedula TEXT,
  descripcion TEXT NOT NULL,                 -- el traje (ej. "Smoking negro a la medida")
  notas TEXT,                                -- medidas / detalles
  precio NUMERIC(10,2) NOT NULL DEFAULT 0,
  fecha_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'listo', 'entregado', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_encargos_entrega ON encargos(fecha_entrega);

-- 2. Abonos de cada encargo (igual idea que la tabla pagos de los alquileres)
CREATE TABLE IF NOT EXISTS encargo_pagos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  encargo_id BIGINT NOT NULL REFERENCES encargos(id) ON DELETE CASCADE,
  monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_encargo_pagos_fecha ON encargo_pagos(fecha);

-- 3. Código secuencial automático: TM 001, TM 002, ...  (TM = Traje a la Medida)
DO $$
DECLARE max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(codigo, '\D', '', 'g'), '')::INTEGER), 0)
    INTO max_num FROM encargos;
  EXECUTE 'CREATE SEQUENCE IF NOT EXISTS encargo_codigo_seq START ' || (max_num + 1);
END $$;

CREATE OR REPLACE FUNCTION set_encargo_codigo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'TM ' || LPAD(nextval('encargo_codigo_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_encargo_codigo ON encargos;
CREATE TRIGGER trg_encargo_codigo
  BEFORE INSERT ON encargos
  FOR EACH ROW EXECUTE FUNCTION set_encargo_codigo();

-- 4. Seguridad (igual que el resto de la app: anon puede leer/escribir)
ALTER TABLE encargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE encargo_pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enc_all ON encargos;
CREATE POLICY enc_all ON encargos FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS enc_pagos_all ON encargo_pagos;
CREATE POLICY enc_pagos_all ON encargo_pagos FOR ALL TO anon USING (true) WITH CHECK (true);
