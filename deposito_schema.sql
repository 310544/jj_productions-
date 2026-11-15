-- Deposito de la factura: dinero que deja el cliente como garantia y que se
-- le devuelve cuando trae el traje. NO suma al total ni a la deuda.
-- Ejecutar una sola vez en Supabase > SQL Editor.
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS deposito NUMERIC NOT NULL DEFAULT 0;
