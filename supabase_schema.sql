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
