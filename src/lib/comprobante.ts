// Generación y envío del comprobante de factura (imagen PNG + WhatsApp)
// Usado tanto al crear la factura (Alquiler) como al reenviarla desde el Historial.

export interface ComprobanteItem {
  codigo: string
  nombre: string
  tipo: string // 'alquiler' | 'venta'
  precio: number
}

export interface ComprobantePago {
  fecha: string
  monto: number
}

export interface ComprobanteData {
  codigo: string
  cliente: string
  cedula: string
  telefono: string
  vendedor: string
  direccion?: string
  quienEntrega?: string
  prendas: ComprobanteItem[]
  pagos: ComprobantePago[]
  total: number
  abonado: number
  fechaInicio: string
  fechaFin: string
  footer?: string // si se pasa, reemplaza la línea "Entrega · Devolución" del pie
  subtitulo?: string // texto bajo la marca (default: "Alquiler & Venta de Trajes")
}

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif'
const money = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

// Recorta el texto con "…" si excede el ancho disponible (evita que el nombre
// largo del traje se monte sobre el precio).
function truncar(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

export async function generarComprobanteBlob(d: ComprobanteData): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const scale = 3
  const w = 380               // más angosto = formato vertical tipo recibo (se ve más grande en mobile)
  const pad = 30
  const headerH = 120

  // Espaciados (letra más grande → más alto en cada fila)
  const TITLE_H = 28
  const ROW_H = 32
  const ITEM_H = 36
  const PAGO_H = 32
  const DIV_H = 28            // divisor: 10 antes + 18 después

  const itemsCount = d.prendas.length
  const validPagos = d.pagos.filter((p) => (p.monto || 0) > 0)
  const pagosCount = validPagos.length
  const deuda = d.total - d.abonado
  const direccion = (d.direccion || '').trim()
  const quienEntrega = (d.quienEntrega || '').trim()
  const clientRows = 1 + 1 + (direccion ? 1 : 0) + 1 + (quienEntrega ? 1 : 0)
  const totalsBoxH = 165

  // Altura dinamica (debe coincidir con los incrementos de dibujo)
  let H = headerH + 44
  H += TITLE_H + clientRows * ROW_H + DIV_H
  H += TITLE_H + itemsCount * ITEM_H + DIV_H
  if (pagosCount > 0) H += TITLE_H + pagosCount * PAGO_H + DIV_H
  H += totalsBoxH + 24
  H += 36

  canvas.width = w * scale
  canvas.height = H * scale
  ctx.scale(scale, scale)

  // Fondo
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(0, 0, w, H, 20)
  ctx.fill()

  // ===== Header smoking =====
  const hg = ctx.createLinearGradient(0, 0, w, headerH)
  hg.addColorStop(0, '#231D15')
  hg.addColorStop(1, '#14110B')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.roundRect(0, 0, w, headerH, [20, 20, 0, 0])
  ctx.fill()

  // Marca
  ctx.textAlign = 'left'
  ctx.fillStyle = '#E8C766'
  ctx.font = `800 30px ${FONT}`
  ctx.fillText('JJ PRODUCTION', pad, 54)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `500 14px ${FONT}`
  ctx.fillText(d.subtitulo || 'Alquiler & Venta de Trajes', pad, 80)

  // Factura # (derecha)
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = `600 13px ${FONT}`
  ctx.fillText('FACTURA', w - pad, 46)
  ctx.fillStyle = '#F2E4BC'
  ctx.font = `800 23px ${FONT}`
  ctx.fillText(d.codigo, w - pad, 76)
  ctx.textAlign = 'left'

  // Barra de acento dorada
  const gb = ctx.createLinearGradient(0, 0, w, 0)
  gb.addColorStop(0, '#D4AF37')
  gb.addColorStop(1, '#A8823A')
  ctx.fillStyle = gb
  ctx.fillRect(0, headerH, w, 5)

  let y = headerH + 44

  const sectionTitle = (t: string) => {
    ctx.fillStyle = '#A8823A'
    ctx.font = `700 14px ${FONT}`
    ctx.fillText(t.toUpperCase(), pad, y)
    y += 23
  }
  const divider = () => {
    y += 10
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, y)
    ctx.lineTo(w - pad, y)
    ctx.stroke()
    y += 18
  }
  const row = (label: string, value: string) => {
    ctx.fillStyle = '#9A9488'
    ctx.font = `500 15px ${FONT}`
    ctx.fillText(label, pad, y)
    const lw = ctx.measureText(label).width
    ctx.fillStyle = '#1C1A14'
    ctx.font = `600 15px ${FONT}`
    ctx.fillText(value, pad + lw + 10, y)
    y += 30
  }

  // ===== Datos del cliente =====
  sectionTitle('Datos del cliente')
  row('Cliente', d.cliente.trim() || '-')
  row('Cédula / Tel', `${d.cedula.trim() || '-'}  ·  ${d.telefono.trim() || '-'}`)
  if (direccion) row('Dirección', direccion)
  row('Vendedor', d.vendedor)
  if (quienEntrega) row('Entrega', quienEntrega)
  divider()

  // ===== Prendas =====
  sectionTitle(`Prendas (${itemsCount})`)
  for (const item of d.prendas) {
    const isAlq = item.tipo === 'alquiler'
    const pillW = 46
    ctx.fillStyle = isAlq ? 'rgba(201,168,76,0.16)' : 'rgba(0,0,0,0.06)'
    ctx.beginPath()
    ctx.roundRect(pad, y - 14, pillW, 20, 6)
    ctx.fill()
    ctx.fillStyle = isAlq ? '#A8823A' : '#7A746A'
    ctx.font = `700 11px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(isAlq ? 'ALQ' : 'VTA', pad + pillW / 2, y)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#1C1A14'
    ctx.font = `600 15px ${FONT}`
    ctx.fillText(item.codigo, pad + pillW + 12, y)
    const cw = ctx.measureText(item.codigo).width
    // Precio (medir primero para saber cuánto espacio queda para el nombre)
    const priceStr = money(item.precio || 0)
    ctx.font = `600 15px ${FONT}`
    const priceW = ctx.measureText(priceStr).width
    // Nombre, recortado para no chocar con el precio
    const nameX = pad + pillW + 12 + cw
    const maxNameW = (w - pad - priceW - 14) - nameX
    ctx.fillStyle = '#9A9488'
    ctx.font = `400 15px ${FONT}`
    ctx.fillText(truncar(ctx, `  ${item.nombre}`, Math.max(20, maxNameW)), nameX, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#1C1A14'
    ctx.font = `600 15px ${FONT}`
    ctx.fillText(priceStr, w - pad, y)
    ctx.textAlign = 'left'
    y += 33
  }
  divider()

  // ===== Abonos =====
  if (pagosCount > 0) {
    sectionTitle(`Abonos (${pagosCount})`)
    for (const p of validPagos) {
      ctx.fillStyle = '#9A9488'
      ctx.font = `400 15px ${FONT}`
      ctx.fillText(p.fecha, pad, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#16a34a'
      ctx.font = `600 15px ${FONT}`
      ctx.fillText(money(p.monto || 0), w - pad, y)
      ctx.textAlign = 'left'
      y += 30
    }
    divider()
  }

  // ===== Caja de totales =====
  const pagado = deuda <= 0
  const boxTop = y
  ctx.fillStyle = '#FBF6E7'
  ctx.strokeStyle = 'rgba(201,168,76,0.40)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(pad, boxTop, w - pad * 2, totalsBoxH, 16)
  ctx.fill()
  ctx.stroke()

  const bx = pad + 20
  const bxr = w - pad - 20
  let by = boxTop + 34

  const totalRow = (label: string, value: string, color: string, bold = false) => {
    ctx.textAlign = 'left'
    ctx.fillStyle = '#7A746A'
    ctx.font = `500 15px ${FONT}`
    ctx.fillText(label, bx, by)
    ctx.textAlign = 'right'
    ctx.fillStyle = color
    ctx.font = `${bold ? 800 : 700} ${bold ? 19 : 16}px ${FONT}`
    ctx.fillText(value, bxr, by)
    ctx.textAlign = 'left'
  }

  totalRow('Total', money(d.total || 0), '#1C1A14')
  by += 32
  totalRow('Abonado', money(d.abonado || 0), '#16a34a')
  by += 18
  ctx.strokeStyle = 'rgba(201,168,76,0.30)'
  ctx.beginPath()
  ctx.moveTo(bx, by)
  ctx.lineTo(bxr, by)
  ctx.stroke()
  by += 30

  if (pagado) {
    ctx.textAlign = 'left'
    ctx.fillStyle = '#7A746A'
    ctx.font = `500 15px ${FONT}`
    ctx.fillText('Estado', bx, by)
    ctx.textAlign = 'right'
    ctx.font = `800 15px ${FONT}`
    const txt = 'PAGADO'
    const tw = ctx.measureText(txt).width
    ctx.fillStyle = 'rgba(22,163,74,0.14)'
    ctx.beginPath()
    ctx.roundRect(bxr - tw - 24, by - 17, tw + 24, 25, 12)
    ctx.fill()
    ctx.fillStyle = '#16a34a'
    ctx.fillText(txt, bxr - 12, by)
    ctx.textAlign = 'left'
  } else {
    totalRow('Saldo pendiente', money(deuda), '#dc2626', true)
  }

  y = boxTop + totalsBoxH + 28

  // ===== Footer =====
  ctx.textAlign = 'center'
  ctx.fillStyle = '#9A9488'
  ctx.font = `500 14px ${FONT}`
  ctx.fillText(d.footer || `Entrega ${d.fechaInicio}   ·   Devolución ${d.fechaFin}`, w / 2, y)
  ctx.textAlign = 'left'

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

function construirMensaje(d: ComprobanteData): string {
  const deuda = d.total - d.abonado
  const pagado = deuda <= 0
  const itemsText = d.prendas
    .map((item) => `• ${item.tipo === 'alquiler' ? 'ALQ' : 'VTA'} ${item.codigo} - ${item.nombre}`)
    .join('%0A')
  return (
    `*JJ PRODUCTION*%0A_${d.subtitulo || 'Alquiler & Venta de Trajes'}_%0A%0A` +
    `*Factura ${d.codigo}*%0A` +
    `━━━━━━━━━━━━━%0A` +
    `*Cliente:* ${d.cliente.trim()}%0A` +
    (d.cedula.trim() ? `*Cédula:* ${d.cedula.trim()}%0A` : '') +
    (d.vendedor ? `*Vendedor:* ${d.vendedor}%0A` : '') +
    `%0A*Prendas:*%0A${itemsText}%0A%0A` +
    `━━━━━━━━━━━━━%0A` +
    `Total:  *${money(d.total || 0)}*%0A` +
    `Abonado:  ${money(d.abonado || 0)}%0A` +
    (pagado ? `*✅ PAGADO*` : `*Saldo pendiente:  ${money(deuda > 0 ? deuda : 0)}*`) +
    `%0A%0A_${d.footer || `Entrega ${d.fechaInicio}  ·  Devolución ${d.fechaFin}`}_`
  )
}

// Genera la imagen y la comparte. En móvil usa el menú nativo de compartir
// (permite enviar la IMAGEN directo a WhatsApp). En escritorio descarga la
// imagen y abre WhatsApp Web con el texto, para adjuntar la imagen manualmente.
export async function compartirComprobante(d: ComprobanteData) {
  const blob = await generarComprobanteBlob(d)
  const phone = (d.telefono || '').replace(/\D/g, '')

  if (blob) {
    const file = new File([blob], `factura-${d.codigo}.png`, { type: 'image/png' })
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Factura ${d.codigo}` })
        return
      } catch {
        // el usuario canceló o falló: caer al fallback
      }
    }
    // Fallback escritorio: descargar la imagen
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `factura-${d.codigo}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Abrir WhatsApp con el texto (en escritorio el usuario adjunta la imagen descargada)
  window.open(`https://wa.me/${phone}?text=${construirMensaje(d)}`, '_blank')
}

// Cuerpo del correo en texto plano (sin formato de WhatsApp)
function construirCorreoBody(d: ComprobanteData): string {
  const deuda = d.total - d.abonado
  const pagado = deuda <= 0
  const items = d.prendas.map((it) => `  - ${it.nombre}  (${money(it.precio || 0)})`).join('\n')
  return (
    `JJ PRODUCTION — ${d.subtitulo || 'Alquiler & Venta de Trajes'}\n\n` +
    `Factura ${d.codigo}\n` +
    `Cliente: ${d.cliente.trim()}\n\n` +
    `Detalle:\n${items}\n\n` +
    `Total: ${money(d.total || 0)}\n` +
    `Abonado: ${money(d.abonado || 0)}\n` +
    (pagado ? `Estado: PAGADO\n` : `Saldo pendiente: ${money(deuda > 0 ? deuda : 0)}\n`) +
    `\n${d.footer || `Entrega ${d.fechaInicio}  ·  Devolución ${d.fechaFin}`}\n\n` +
    `(Adjunto la imagen de la factura)`
  )
}

// Envía el comprobante por CORREO. En móvil intenta el menú nativo de compartir
// (permite elegir Gmail con la imagen ya adjunta). En escritorio descarga la
// imagen y abre Gmail listo para escribir; solo hay que adjuntar la imagen.
export async function enviarComprobanteCorreo(d: ComprobanteData, email?: string) {
  const blob = await generarComprobanteBlob(d)

  if (blob) {
    const file = new File([blob], `factura-${d.codigo}.png`, { type: 'image/png' })
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Factura ${d.codigo}`, text: `Factura ${d.codigo} - JJ Production` })
        return
      } catch {
        // canceló o falló: seguir al fallback de Gmail
      }
    }
    // Escritorio: descargar la imagen para adjuntarla
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `factura-${d.codigo}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Abrir Gmail (compose) con asunto y cuerpo listos; el usuario adjunta la imagen
  const subject = `Factura ${d.codigo} - JJ Production`
  const to = email ? encodeURIComponent(email.trim()) : ''
  window.open(
    `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(construirCorreoBody(d))}`,
    '_blank'
  )
}
