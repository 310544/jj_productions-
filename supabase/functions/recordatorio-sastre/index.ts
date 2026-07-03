// ============================================================================
// Edge Function: recordatorio-sastre
// ----------------------------------------------------------------------------
// Corre en el servidor de Supabase (la dispara pg_cron una vez al día).
// Busca los trajes a la medida (encargos) próximos a entregar y le manda un
// WhatsApp al SASTRE por CallMeBot:
//   • Aviso 1: cuando faltan `dias_aviso_1` días (por defecto 5).
//   • Aviso 2: cuando falta  `dias_aviso_2` días (por defecto 1 = "mañana").
// Cada aviso se manda UNA sola vez (se marca la fecha en el encargo).
//
// No depende del navegador: funciona aunque nadie tenga la app abierta.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Fecha de hoy en Colombia (YYYY-MM-DD), sin importar la zona del servidor.
function hoyBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

// Días que faltan para la entrega: >0 futuro, 0 hoy, <0 atrasado.
function diasRestantes(fechaEntrega: string): number {
  const hoy = Date.parse(hoyBogota() + 'T00:00:00Z')
  const ent = Date.parse(fechaEntrega + 'T00:00:00Z')
  return Math.round((ent - hoy) / 86400000)
}

function fechaLarga(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}

// Mensaje que le llega al sastre (mismo formato que el de prueba en la app).
function mensajeSastre(dias: number, e: {
  codigo: string; descripcion: string; fecha_entrega: string
  cliente_nombre?: string | null; notas?: string | null
}): string {
  const entrega = fechaLarga(e.fecha_entrega)
  let cab: string
  if (dias < 0) cab = `⚠️ *JJ Production* — ¡Entrega ATRASADA!`
  else if (dias === 0) cab = `⚠️ *JJ Production* — ¡HOY se entrega!`
  else if (dias === 1) cab = `⚠️ *JJ Production* — ¡MAÑANA se entrega!`
  else cab = `👔 *JJ Production* — Faltan *${dias} días*`
  return (
    `${cab}\n` +
    `Traje *${e.codigo}* — ${e.descripcion}\n` +
    `📅 Entrega: ${entrega}` +
    (e.cliente_nombre ? `\n👤 Cliente: ${e.cliente_nombre}` : '') +
    (e.notas ? `\n📏 Medidas: ${e.notas}` : '')
  )
}

async function enviarCallMeBot(telefono: string, apikey: string, texto: string): Promise<boolean> {
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(telefono)}` +
    `&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`
  try {
    const r = await fetch(url)
    return r.ok
  } catch {
    return false
  }
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1) Ajustes del sastre
  const { data: cfg } = await supabase.from('config_encargos').select('*').eq('id', 1).single()
  if (!cfg?.sastre_telefono || !cfg?.callmebot_apikey) {
    return Response.json({ ok: false, motivo: 'Falta configurar el número o la clave del sastre' })
  }
  const dias1 = Number(cfg.dias_aviso_1 ?? 5)
  const dias2 = Number(cfg.dias_aviso_2 ?? 1)
  const tel = String(cfg.sastre_telefono)
  const key = String(cfg.callmebot_apikey)

  // 2) Encargos activos (pendiente / listo)
  const { data: encargos } = await supabase
    .from('encargos')
    .select('*')
    .in('estado', ['pendiente', 'listo'])

  const enviados: { codigo: string; aviso: number; dias: number; ok: boolean }[] = []

  for (const e of encargos ?? []) {
    const dias = diasRestantes(e.fecha_entrega)

    // Aviso 2 (urgente, "mañana"): manda si falta <= dias2 y aún no se avisó.
    if (dias <= dias2 && !e.aviso_1dia_enviado_at) {
      const ok = await enviarCallMeBot(tel, key, mensajeSastre(dias, e))
      if (ok) await supabase.from('encargos').update({ aviso_1dia_enviado_at: new Date().toISOString() }).eq('id', e.id)
      enviados.push({ codigo: e.codigo, aviso: 2, dias, ok })
      continue // no mandar los dos avisos el mismo día
    }

    // Aviso 1 ("faltan N días"): manda si falta <= dias1 (pero aún fuera de la
    // ventana urgente) y no se ha avisado.
    if (dias <= dias1 && dias > dias2 && !e.aviso_5dias_enviado_at) {
      const ok = await enviarCallMeBot(tel, key, mensajeSastre(dias, e))
      if (ok) await supabase.from('encargos').update({ aviso_5dias_enviado_at: new Date().toISOString() }).eq('id', e.id)
      enviados.push({ codigo: e.codigo, aviso: 1, dias, ok })
    }
  }

  return Response.json({ ok: true, hoy: hoyBogota(), enviados })
})
