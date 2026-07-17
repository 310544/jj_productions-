-- ============================================
-- RentaTraje - Módulo de Asistencia / Nómina diaria
-- Ejecutar en: Supabase SQL Editor
-- ============================================
--
-- IDEA GENERAL
--   Cada empleada marca 4 veces al día con su PIN:
--     1) entrada  2) salgo a almorzar  3) vuelvo  4) salida
--   La HORA SIEMPRE la pone el servidor (now()), nunca el celular.
--   La única forma de registrar/cerrar una marca es la función
--   registrar_marca(): nadie puede insertar ni editar horarios a mano.
--   Eso es lo que hace que NO se pueda hacer trampa.
--
-- PAGO
--   80.000 por 8 horas (480 min)  ->  valor_minuto = 80.000 / 480 ≈ 166,67
--   pago = (minutos entre entrada y salida − minutos de almuerzo) × valor_minuto
--   Las horas extra SÍ se pagan (no hay tope). El almuerzo NO se paga.
--   👉 Si algún día cambia el pago diario o la jornada, solo cambia los dos
--      números en la función registrar_marca() (ver V_PAGO_DIA y V_MIN_JORNADA).
-- ============================================

-- 1. Empleadas
CREATE TABLE IF NOT EXISTS empleadas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  pin TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cada empleada activa debe tener un PIN único (para poder identificarla al marcar)
CREATE UNIQUE INDEX IF NOT EXISTS empleadas_pin_activo_unq
  ON empleadas (pin) WHERE activo;

-- 2. Jornadas (una fila por empleada por día)
CREATE TABLE IF NOT EXISTS jornadas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  empleada_id BIGINT NOT NULL REFERENCES empleadas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada TIMESTAMPTZ,
  inicio_almuerzo TIMESTAMPTZ,
  fin_almuerzo TIMESTAMPTZ,
  hora_salida TIMESTAMPTZ,
  estado TEXT NOT NULL DEFAULT 'trabajando_am'
    CHECK (estado IN ('trabajando_am', 'almuerzo', 'trabajando_pm', 'cerrado')),
  minutos_trabajados INTEGER,
  pago NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empleada_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_jornadas_fecha ON jornadas(fecha);

-- ============================================
-- 3. Función segura para marcar (el corazón del anti-trampa)
-- ============================================
-- SECURITY DEFINER = corre con permisos del dueño, así puede escribir en
-- jornadas aunque el usuario anónimo NO tenga permiso de escritura directa.
-- Recibe el PIN (la hora la decide el servidor) y, cuando hay que elegir,
-- la acción: p_accion = 'almuerzo' (salir a almorzar) o 'salida' (terminar día).
DROP FUNCTION IF EXISTS registrar_marca(TEXT);
DROP FUNCTION IF EXISTS registrar_marca(TEXT, TEXT);
CREATE OR REPLACE FUNCTION registrar_marca(p_pin TEXT, p_accion TEXT DEFAULT NULL, p_empleada_id BIGINT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  V_PAGO_DIA    NUMERIC := 80000;          -- 👈 pago de un día completo
  V_MIN_JORNADA NUMERIC := 480;            -- 👈 minutos de la jornada (8h = 480)
  v_valor_min   NUMERIC := V_PAGO_DIA / V_MIN_JORNADA;  -- ≈ 166,67 por minuto
  v_emp         empleadas%ROWTYPE;
  v_j           jornadas%ROWTYPE;
  v_now         TIMESTAMPTZ := now();
  v_today       DATE := (now() AT TIME ZONE 'America/Bogota')::date; -- 👈 "hoy" en Colombia, NO en UTC
  v_almuerzo    INTEGER;
  v_min         INTEGER;
  v_pago        NUMERIC;
BEGIN
  -- Identificar a la empleada.
  -- La app manda p_empleada_id = la persona de la TARJETA que se tocó. El PIN
  -- debe ser el de ESA persona: si tocas a Julián y pones el PIN de Sara, se
  -- rechaza. (Antes se buscaba solo por PIN, así que la marca caía sobre el
  -- dueño del PIN sin importar la tarjeta.) Si no llega id, se usa el modo viejo.
  IF p_empleada_id IS NOT NULL THEN
    SELECT * INTO v_emp FROM empleadas WHERE id = p_empleada_id AND activo = true;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'Empleada no encontrada');
    END IF;
    IF v_emp.pin <> p_pin THEN
      RETURN json_build_object('ok', false, 'error', 'Ese PIN no es de ' || v_emp.nombre);
    END IF;
  ELSE
    SELECT * INTO v_emp FROM empleadas WHERE pin = p_pin AND activo = true;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'PIN incorrecto');
    END IF;
  END IF;

  -- Jornada de hoy (si existe). Usamos v_today (hora Colombia), NO CURRENT_DATE
  -- (que es UTC): de noche en Colombia UTC ya va un día adelante y no coincidiría.
  SELECT * INTO v_j FROM jornadas
    WHERE empleada_id = v_emp.id AND fecha = v_today;

  -- ── Paso 1: primera marca del día = ENTRADA ──
  IF NOT FOUND THEN
    INSERT INTO jornadas (empleada_id, fecha, hora_entrada, estado)
      VALUES (v_emp.id, v_today, v_now, 'trabajando_am');
    RETURN json_build_object('ok', true, 'accion', 'entrada',
      'empleada', v_emp.nombre, 'hora', v_now);
  END IF;

  -- ── Ya cerró ──
  IF v_j.estado = 'cerrado' THEN
    RETURN json_build_object('ok', false,
      'error', v_emp.nombre || ', ya cerraste tu día. ¡Hasta mañana!');
  END IF;

  -- ── VUELVO DEL ALMUERZO (una sola opción posible) ──
  IF v_j.estado = 'almuerzo' THEN
    UPDATE jornadas SET fin_almuerzo = v_now, estado = 'trabajando_pm'
      WHERE id = v_j.id;
    RETURN json_build_object('ok', true, 'accion', 'fin_almuerzo',
      'empleada', v_emp.nombre, 'hora', v_now);
  END IF;

  -- ── SALGO A ALMORZAR (solo si está en trabajando_am y NO pidió terminar) ──
  IF v_j.estado = 'trabajando_am' AND COALESCE(p_accion, '') <> 'salida' THEN
    UPDATE jornadas SET inicio_almuerzo = v_now, estado = 'almuerzo'
      WHERE id = v_j.id;
    RETURN json_build_object('ok', true, 'accion', 'inicio_almuerzo',
      'empleada', v_emp.nombre, 'hora', v_now);
  END IF;

  -- ── TERMINAR DÍA (cierra y calcula el pago) ──
  -- Llega aquí en dos casos:
  --   • trabajando_pm  -> almorzó y regresó (se descuenta el almuerzo)
  --   • trabajando_am + p_accion='salida' -> se va sin almorzar (almuerzo = 0)
  -- Si no hubo almuerzo, inicio/fin_almuerzo son NULL y el descuento da 0.
  v_almuerzo := COALESCE(
    ROUND(EXTRACT(EPOCH FROM (v_j.fin_almuerzo - v_j.inicio_almuerzo)) / 60), 0);
  v_min := ROUND(EXTRACT(EPOCH FROM (v_now - v_j.hora_entrada)) / 60) - v_almuerzo;
  IF v_min < 0 THEN v_min := 0; END IF;
  v_pago := ROUND(v_min * v_valor_min);
  UPDATE jornadas SET hora_salida = v_now, estado = 'cerrado',
    minutos_trabajados = v_min, pago = v_pago
    WHERE id = v_j.id;
  RETURN json_build_object('ok', true, 'accion', 'salida',
    'empleada', v_emp.nombre, 'hora', v_now,
    'minutos', v_min, 'almuerzo_min', v_almuerzo, 'pago', v_pago);
END;
$$;

-- ============================================
-- 4. Seguridad (RLS)
-- ============================================
ALTER TABLE empleadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornadas  ENABLE ROW LEVEL SECURITY;

-- empleadas: el dueño las gestiona desde el panel admin de la app
-- (protegido por PIN de administrador en la interfaz).
DROP POLICY IF EXISTS emp_all ON empleadas;
CREATE POLICY emp_all ON empleadas FOR ALL TO anon USING (true) WITH CHECK (true);

-- jornadas: cualquiera puede LEER (para mostrar el estado del día y los
-- reportes), pero NADIE puede insertar/editar/borrar directamente.
-- La única vía para registrar una marca es registrar_marca(), que pone la
-- hora del servidor. => imposible inventar o alterar horarios a mano.
DROP POLICY IF EXISTS jor_select ON jornadas;
CREATE POLICY jor_select ON jornadas FOR SELECT TO anon USING (true);
-- (No se crea política de INSERT/UPDATE/DELETE => queda denegado para anon)

-- Permitir que el usuario anónimo (la app) llame la función
GRANT EXECUTE ON FUNCTION registrar_marca(TEXT, TEXT, BIGINT) TO anon;
