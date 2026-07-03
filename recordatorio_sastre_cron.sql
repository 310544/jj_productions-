-- ============================================================================
-- RentaTraje - Programar el recordatorio automático al sastre (pg_cron)
-- Ejecutar en: Supabase SQL Editor
-- ----------------------------------------------------------------------------
-- Esto hace que el servidor de Supabase llame TODOS LOS DÍAS a la Edge Function
-- `recordatorio-sastre`, sin depender de que nadie abra la app.
--
-- ANTES de correr esto necesitas:
--   1. Haber corrido `recordatorio_sastre_schema.sql` (tablas y columnas).
--   2. Haber desplegado la Edge Function `recordatorio-sastre`
--      (Dashboard → Edge Functions → Deploy, o `supabase functions deploy recordatorio-sastre`).
--
-- Luego REEMPLAZA abajo:
--   • TU_PROJECT_REF   → el ref de tu proyecto (está en la URL de Supabase:
--                         https://TU_PROJECT_REF.supabase.co).
--   • TU_ANON_KEY      → la clave anon (Settings → API → Project API keys → anon public).
-- ============================================================================

-- 1) Extensiones necesarias (una sola vez)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Programar la tarea diaria.
--    '0 13 * * *' = 13:00 UTC = 8:00 a.m. en Colombia (UTC-5). Cámbialo si quieres.
--    Si ya existe una tarea con este nombre, primero la quitamos (ver punto 4).
SELECT cron.schedule(
  'recordatorio-sastre-diario',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://TU_PROJECT_REF.supabase.co/functions/v1/recordatorio-sastre',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer TU_ANON_KEY'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- ÚTILES (opcional)
-- ============================================================================

-- Ver las tareas programadas:
--   SELECT jobid, jobname, schedule, active FROM cron.job;

-- Ver el historial de ejecuciones (para confirmar que corrió):
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Quitar la tarea (por si quieres reprogramarla):
--   SELECT cron.unschedule('recordatorio-sastre-diario');

-- Probar el envío YA MISMO sin esperar al otro día (dispara la función una vez):
--   SELECT net.http_post(
--     url     := 'https://TU_PROJECT_REF.supabase.co/functions/v1/recordatorio-sastre',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer TU_ANON_KEY'),
--     body    := '{}'::jsonb
--   );
