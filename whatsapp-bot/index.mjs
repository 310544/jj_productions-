// ============================================================================
// RentaTraje - Bot de recordatorios al SASTRE (WhatsApp del dueño)
// ----------------------------------------------------------------------------
// Corre en el computador del local. Manda los recordatorios DESDE el número del
// dueño (JJ Production) al número del sastre, de forma automática:
//   • Aviso 1: faltan `dias_aviso_1` días (por defecto 5).
//   • Aviso 2: falta  `dias_aviso_2` días (por defecto 1 = "mañana").
// Cada aviso se manda UNA sola vez (se marca en la base).
//
// - Escanea el QR UNA vez con el WhatsApp del dueño. La sesión queda guardada.
// - Revisa al arrancar (por si el PC estuvo apagado) y todos los días a la hora fijada.
// - El número del SASTRE y los días se configuran en la app (⚙️ del tab "A la medida").
// ============================================================================

import 'dotenv/config'
import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import qrcode from 'qrcode-terminal'
import QRCode from 'qrcode'
import cron from 'node-cron'
import { exec } from 'node:child_process'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const TZ = 'America/Bogota'
const HORA_CRON = process.env.HORA_ENVIO || '0 10 * * *' // 10:00 a.m. por defecto

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en el archivo .env')
  process.exit(1)
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

// ---- Fechas (en horario de Colombia) --------------------------------------
const hoyBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ })

function diasRestantes(fecha) {
  const hoy = Date.parse(hoyBogota() + 'T00:00:00Z')
  const ent = Date.parse(fecha + 'T00:00:00Z')
  return Math.round((ent - hoy) / 86400000)
}

const fechaLarga = (iso) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })

// Mensaje que le llega al sastre (mismo formato que el de la app).
function mensajeSastre(dias, e) {
  const entrega = fechaLarga(e.fecha_entrega)
  let cab
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

// ---- Cliente de WhatsApp ---------------------------------------------------
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './sesion' }),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
})

client.on('qr', async (qr) => {
  console.log('\n📲 Escanea este QR con el WhatsApp del DUEÑO (solo la primera vez):')
  console.log('   WhatsApp → Dispositivos vinculados → Vincular un dispositivo\n')
  qrcode.generate(qr, { small: true }) // respaldo en la terminal
  // Además, abre una imagen grande y limpia del QR (más fácil de escanear).
  try {
    const file = path.resolve('./qr.png')
    await QRCode.toFile(file, qr, { width: 400, margin: 2 })
    console.log(`\n🖼️  Abrí una imagen fácil de escanear: ${file}`)
    exec(`start "" "${file}"`) // abre la imagen con el visor de Windows
  } catch {
    console.log('(No pude abrir la imagen; usa el QR de cuadritos de arriba.)')
  }
})
client.on('authenticated', () => console.log('✅ WhatsApp autenticado.'))
client.on('auth_failure', (m) => console.error('❌ Falló la autenticación:', m))
client.on('disconnected', (r) => console.log('⚠️ WhatsApp se desconectó:', r, '— reinicia el bot para volver a vincular.'))
let listo = false
client.on('ready', async () => {
  listo = true
  console.log('🤖 Bot listo. Enviará desde el número del dueño.')
  await revisarYEnviar() // chequeo al arrancar (por si el PC estuvo apagado)
})

// ---- Revisión y envío ------------------------------------------------------
async function revisarYEnviar() {
  try {
    const { data: cfg } = await supabase.from('config_encargos').select('*').eq('id', 1).single()
    if (!cfg?.sastre_telefono) {
      console.log('… Falta poner el número del sastre en la app (⚙️). No hay a quién enviar.')
      return
    }
    const dias1 = Number(cfg.dias_aviso_1 ?? 5)
    const dias2 = Number(cfg.dias_aviso_2 ?? 1)
    const chatId = `${String(cfg.sastre_telefono).replace(/\D/g, '')}@c.us`

    const { data: encargos } = await supabase
      .from('encargos')
      .select('*')
      .in('estado', ['pendiente', 'listo'])

    let enviados = 0
    for (const e of encargos ?? []) {
      const dias = diasRestantes(e.fecha_entrega)

      // Aviso 2 (urgente, "mañana")
      if (dias <= dias2 && !e.aviso_1dia_enviado_at) {
        await client.sendMessage(chatId, mensajeSastre(dias, e))
        await supabase.from('encargos').update({ aviso_1dia_enviado_at: new Date().toISOString() }).eq('id', e.id)
        console.log(`📤 Aviso urgente enviado (${e.codigo}, faltan ${dias})`)
        enviados++
        continue // no mandar los dos avisos el mismo día
      }

      // Aviso 1 ("faltan N días")
      if (dias <= dias1 && dias > dias2 && !e.aviso_5dias_enviado_at) {
        await client.sendMessage(chatId, mensajeSastre(dias, e))
        await supabase.from('encargos').update({ aviso_5dias_enviado_at: new Date().toISOString() }).eq('id', e.id)
        console.log(`📤 Aviso "faltan ${dias} días" enviado (${e.codigo})`)
        enviados++
      }
    }
    console.log(`✔️ Revisión ${hoyBogota()}: ${enviados} recordatorio(s) enviado(s).`)
  } catch (err) {
    console.error('Error en la revisión:', err?.message || err)
  }
}

// Revisión diaria a la hora fijada (además de la del arranque).
cron.schedule(HORA_CRON, revisarYEnviar, { timezone: TZ })
console.log(`⏰ Revisión diaria programada (${HORA_CRON}, ${TZ}).`)

// ---- Botón "Prueba" de la app ---------------------------------------------
// Cada 8s revisa si desde la app pidieron una prueba (config_encargos.test_solicitado_at).
// Si sí, manda un WhatsApp de prueba al número del sastre y limpia la solicitud.
let ultimaPrueba = null
async function revisarPrueba() {
  if (!listo) return
  try {
    const { data: cfg } = await supabase
      .from('config_encargos')
      .select('sastre_telefono, test_solicitado_at')
      .eq('id', 1)
      .single()
    if (!cfg?.test_solicitado_at || cfg.test_solicitado_at === ultimaPrueba) return
    if (!cfg.sastre_telefono) return
    const chatId = `${String(cfg.sastre_telefono).replace(/\D/g, '')}@c.us`
    await client.sendMessage(chatId, '🔔 *JJ Production* — Prueba del recordatorio automático. ¡Está funcionando! ✅')
    ultimaPrueba = cfg.test_solicitado_at
    await supabase.from('config_encargos').update({ test_solicitado_at: null }).eq('id', 1)
    console.log('📤 Mensaje de PRUEBA enviado.')
  } catch (err) {
    console.error('Error en la prueba:', err?.message || err)
  }
}
setInterval(revisarPrueba, 8000)

client.initialize()
