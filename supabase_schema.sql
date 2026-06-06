-- ============================================
-- RentaTraje - Esquema de Base de Datos
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- 1. Tabla de prendas (garments)
CREATE TABLE garments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  imagen_url TEXT,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de clientes (customers)
CREATE TABLE customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla de alquileres (rentals)
CREATE TABLE rentals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE NOT NULL,
  monto_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  abono DECIMAL(10,2) NOT NULL DEFAULT 0,
  saldo_pendiente DECIMAL(10,2) GENERATED ALWAYS AS (monto_total - abono) STORED,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'finalizado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabla de items del alquiler (rental_items)
CREATE TABLE rental_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rental_id BIGINT NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  garment_id BIGINT NOT NULL REFERENCES garments(id) ON DELETE RESTRICT,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- ============================================
-- Políticas RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_items ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (anon puede leer/escribir por ahora)
-- En producción, restringir según auth.uid()

CREATE POLICY "Permitir todo en garments" ON garments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en customers" ON customers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en rentals" ON rentals FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en rental_items" ON rental_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================
-- Bucket de Storage para imágenes
-- ============================================
-- Ejecutar esto por separado en SQL Editor:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('prendas', 'prendas', true);

-- ============================================
-- MIGRACIONES - Mejora de Factura/Alquiler
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 5. Nuevas columnas en customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cedula TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS direccion TEXT;

-- 6. Nuevas columnas en rentals
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS vendedor TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS cedula TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS quien_entrega TEXT;

-- Rellenar códigos para registros existentes
UPDATE rentals SET codigo = 'Nº ' || LPAD(id::TEXT, 3, '0') WHERE codigo IS NULL;
ALTER TABLE rentals ALTER COLUMN codigo SET NOT NULL;
ALTER TABLE rentals ADD CONSTRAINT rentals_codigo_unique UNIQUE (codigo);

-- 7. Nueva columna tipo en rental_items
ALTER TABLE rental_items ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'alquiler'
  CHECK (tipo IN ('alquiler', 'venta'));

-- 8. Nuevo estado 'vendido' en garments
ALTER TABLE garments DROP CONSTRAINT IF EXISTS garments_estado_check;
ALTER TABLE garments ADD CONSTRAINT garments_estado_check
  CHECK (estado IN ('disponible', 'ocupado', 'vendido'));

-- 9. Nueva tabla pagos (abonos)
CREATE TABLE IF NOT EXISTS pagos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rental_id BIGINT NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en pagos" ON pagos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 10. Secuencia y trigger para código secuencial automático (Nº 001, Nº 002...)
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(codigo, '\D', '', 'g'), '')::INTEGER), 0)
    INTO max_num FROM rentals;
  EXECUTE 'CREATE SEQUENCE IF NOT EXISTS rental_codigo_seq START ' || (max_num + 1);
END $$;

CREATE OR REPLACE FUNCTION set_rental_codigo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'Nº ' || LPAD(nextval('rental_codigo_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rental_codigo ON rentals;
CREATE TRIGGER trg_rental_codigo
  BEFORE INSERT ON rentals
  FOR EACH ROW
  EXECUTE FUNCTION set_rental_codigo();

-- 11. Tabla de gastos (registro manual de egresos del negocio)
CREATE TABLE IF NOT EXISTS gastos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  concepto TEXT NOT NULL,
  categoria TEXT,
  monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo en gastos" ON gastos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
