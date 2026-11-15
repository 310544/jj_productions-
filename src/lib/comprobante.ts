// Generación y envío del comprobante de factura (imagen PNG + WhatsApp)
// Usado al crear la factura (Alquiler), al reenviarla desde el Historial y
// en los trajes a la medida (Encargos). Todos usan el mismo diseño.

export interface ComprobanteItem {
  codigo: string
  nombre: string
  tipo: string // 'alquiler' | 'venta'
  precio: number // precio de la línea (si hay cantidad > 1, es el total de esa línea)
  cantidad?: number // default 1
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
  deposito?: number // se devuelve al cliente cuando trae el traje
  fechaInicio: string
  fechaFin: string
  fecha?: string // fecha de la factura (default: hoy)
  etiquetaInicio?: string // default "Fecha de entrega"
  etiquetaFin?: string // default "Fecha de devolución"
  footer?: string // nota opcional que se muestra bajo los totales
  fechaRetiro?: string // día en que el cliente reclama el traje (default: fechaInicio)
  subtitulo?: string // texto bajo la marca (default: "Alquiler & Venta de Trajes")
  sinPoliticas?: boolean // true = no imprimir las políticas del alquiler (ej. trajes a la medida)
}

// ── Políticas del alquiler (se imprimen al final de la factura) ──
export const POLITICAS = {
  aviso: 'Pasados 6 meses perderá el depósito dejado por la prenda',
  clausulas: [
    'Las prendas serán entregadas bajo la responsabilidad del cliente en la fecha estipulada; cualquier daño o desperfecto que sufra la tela deberá ser pagado en su totalidad.',
    'No lavar las prendas, la empresa asume el costo.',
    'Las prendas deberán ser devueltas en la fecha estipulada en el presente contrato. Cada día de retraso tiene un recargo de $20.000.',
    'Por prendas apartadas o retiradas, por ningún motivo se devolverá el dinero; se hará cambio por otra prenda o mercancía existente en el almacén o por medio de otro alquiler.',
  ],
}

// ── Datos del negocio que salen en la franja de CONTACTO de la factura ──
// Llena los que quieras mostrar; los que queden vacíos no aparecen.
export const CONTACTO_NEGOCIO = {
  telefono: '',  // ej: '311 234 5678'
  direccion: '', // ej: 'Calle 10 # 20-30, Villavicencio'
  instagram: '', // ej: '@jjproduction'
  correo: '',    // ej: 'jjproduction@gmail.com'
}

// ── Estilo ──
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif'
const SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif'
// Serif para textos largos (políticas): números normales y buena lectura en pequeño
const SERIF_TXT = 'Lora, Georgia, "Times New Roman", serif'
const C = {
  tinta: '#1F1B16',     // texto principal
  gris: '#5C564C',      // etiquetas
  grisSuave: '#9A9387', // textos secundarios
  linea: '#A8A196',     // bordes de la tabla y líneas
  oro: '#A8823A',       // dorado de la marca
  oroSuave: '#C9A35A',
  beige: '#EADCC2',     // franja de contacto
  beigeClaro: '#F7F1E6',// caja de total
  cafe: '#4A3423',      // texto sobre beige
  rojo: '#B42318',
  verde: '#1E7F45',
}
const LOGO_URL = '/logo-factura.png' // logo de la empresa (JJ Production)

const money = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Separa una fecha 'AAAA-MM-DD' (o Date / ISO) sin correrla por zona horaria. */
function partesFecha(f?: string): { d: string; m: string; a: string; mes: string } {
  let y: number, mo: number, da: number
  const m = (f || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    y = +m[1]; mo = +m[2]; da = +m[3]
  } else {
    const t = f ? new Date(f) : new Date()
    const ok = !isNaN(t.getTime()) ? t : new Date()
    y = ok.getFullYear(); mo = ok.getMonth() + 1; da = ok.getDate()
  }
  return { d: String(da).padStart(2, '0'), m: String(mo).padStart(2, '0'), a: String(y), mes: MESES[mo - 1] || '' }
}

function fechaLarga(f?: string): string {
  if (!f) return ''
  const p = partesFecha(f)
  return `${+p.d} ${p.mes} ${p.a}`
}

// Recorta el texto con "…" si excede el ancho disponible
function truncar(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

/** Parte un texto en líneas: la primera con ancho anchoPrimera, las demás con anchoResto. */
function envolver(ctx: CanvasRenderingContext2D, text: string, anchoPrimera: number, anchoResto: number): string[] {
  const palabras = text.split(/\s+/)
  const lineas: string[] = []
  let actual = ''
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p
    const max = lineas.length === 0 ? anchoPrimera : anchoResto
    if (ctx.measureText(prueba).width > max && actual) {
      lineas.push(actual)
      actual = p
    } else {
      actual = prueba
    }
  }
  if (actual) lineas.push(actual)
  return lineas
}

/** Texto con espaciado entre letras (para títulos en mayúscula). */
function espaciado(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, sp: number,
  align: 'left' | 'center' | 'right' = 'left',
) {
  const chars = [...text]
  const ancho = chars.reduce((s, ch) => s + ctx.measureText(ch).width, 0) + sp * (chars.length - 1)
  let cx = align === 'left' ? x : align === 'center' ? x - ancho / 2 : x - ancho
  const prev = ctx.textAlign
  ctx.textAlign = 'left'
  for (const ch of chars) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + sp
  }
  ctx.textAlign = prev
}

function cargarLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = LOGO_URL
  })
}

async function cargarFuentes() {
  if (!document.fonts?.load) return
  try {
    await Promise.all([
      document.fonts.load(`600 30px ${SERIF}`),
      document.fonts.load(`700 30px ${SERIF}`),
      document.fonts.load(`italic 600 24px ${SERIF}`),
      document.fonts.load(`500 14px ${SERIF_TXT}`),
      document.fonts.load(`700 14px ${SERIF_TXT}`),
      document.fonts.load(`400 14px ${SANS}`),
      document.fonts.load(`600 14px ${SANS}`),
      document.fonts.load(`700 14px ${SANS}`),
    ])
  } catch {
    // si no cargan, se usan las de respaldo
  }
}

export async function generarComprobanteBlob(d: ComprobanteData): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const [logo] = await Promise.all([cargarLogo(), cargarFuentes()])

  // ── Medidas (proporción hoja carta / A4) ──
  const scale = 2
  const W = 800
  const M = 56                 // margen lateral
  const ROW_H = 40             // filas de la tabla
  const MIN_FILAS = 7          // filas mínimas (como en una factura impresa)

  const filasDatos: [string, string, string, string][] = [
    ['Cliente:', d.cliente.trim(), 'Teléfono:', d.telefono.trim()],
    ['Cédula:', d.cedula.trim(), 'Dirección:', (d.direccion || '').trim()],
  ]
  if (d.vendedor || d.quienEntrega) {
    filasDatos.push(['Vendedor:', d.vendedor || '', 'Entregó:', (d.quienEntrega || '').trim()])
  }
  filasDatos.push([
    `${d.etiquetaInicio || 'Fecha de entrega'}:`, fechaLarga(d.fechaInicio),
    `${d.etiquetaFin || 'Fecha de devolución'}:`, fechaLarga(d.fechaFin),
  ])

  const pagos = d.pagos.filter((p) => (p.monto || 0) > 0)
  const deuda = (d.total || 0) - (d.abonado || 0)
  const pagado = deuda <= 0
  const deposito = d.deposito || 0
  const filasTabla = Math.max(MIN_FILAS, d.prendas.length)

  const yDatos = 228
  const yTabla = yDatos + filasDatos.length * 44 + 22
  const altoTabla = 46 + filasTabla * ROW_H
  const yResumen = yTabla + altoTabla + 30
  const altoResumen = Math.max(
    130,
    (pagos.length ? 34 + pagos.length * 24 : 0) + (d.footer ? 36 : 0),
  )
  const DEP_H = 84 // caja del deposito (aparte, bien visible)
  const yDeposito = yResumen + altoResumen + 16
  const finContenido = deposito > 0 ? yDeposito + DEP_H : yResumen + altoResumen

  // Políticas: se miden antes de dar tamaño al lienzo
  const POL_TXT = `500 13.5px ${SERIF_TXT}`
  const POL_LBL = `700 13.5px ${SERIF_TXT}`
  const POL_LH = 21
  const anchoPol = W - M * 2
  const clausulas: { etiqueta: string; ancho: number; lineas: string[] }[] = []
  if (!d.sinPoliticas) {
    POLITICAS.clausulas.forEach((texto, i) => {
      const etiqueta = `Cláusula ${i + 1}:`
      ctx.font = POL_LBL
      const ancho = ctx.measureText(etiqueta).width + 6
      ctx.font = POL_TXT
      clausulas.push({ etiqueta, ancho, lineas: envolver(ctx, texto, anchoPol - ancho, anchoPol) })
    })
  }
  const yPoliticas = finContenido + 40
  const altoPoliticas = clausulas.length
    ? 34 + 30 + clausulas.reduce((s, c) => s + c.lineas.length * POL_LH + 8, 0)
    : 0
  const finTodo = clausulas.length ? yPoliticas + altoPoliticas : finContenido
  const contacto = [
    CONTACTO_NEGOCIO.telefono && `WhatsApp: ${CONTACTO_NEGOCIO.telefono}`,
    CONTACTO_NEGOCIO.instagram && `Instagram: ${CONTACTO_NEGOCIO.instagram}`,
    CONTACTO_NEGOCIO.direccion,
    CONTACTO_NEGOCIO.correo,
  ].filter(Boolean) as string[]
  // La factura termina con las políticas: línea dorada de cierre (+ contacto si hay)
  const yCierre = finTodo + 10
  const H = yCierre + (contacto.length ? 40 : 0) + 34

  canvas.width = W * scale
  canvas.height = H * scale
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'

  // Fondo
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  // ═════════ Encabezado ═════════
  // Logo de la empresa (si no carga, se escribe el nombre)
  if (logo) {
    const lw = 270
    const lh = (logo.naturalHeight / logo.naturalWidth) * lw
    ctx.drawImage(logo, M - 6, 40, lw, lh)
  } else {
    ctx.fillStyle = C.tinta
    ctx.font = `700 34px ${SERIF}`
    ctx.fillText('JJ Production', M, 100)
  }
  ctx.fillStyle = C.oro
  ctx.font = `600 10.5px ${SANS}`
  espaciado(ctx, (d.subtitulo || 'Alquiler & Venta de Trajes').toUpperCase(), M + 2, 168, 2.2)

  // Recuadro FECHA  |  DD | MM | AAAA
  const f = partesFecha(d.fecha)
  const celdas = [
    { t: 'FECHA', w: 84 },
    { t: f.d, w: 42 },
    { t: f.m, w: 42 },
    { t: f.a, w: 62 },
  ]
  const anchoFecha = celdas.reduce((s, c) => s + c.w, 0)
  let fx = W - M - anchoFecha
  const fy = 50
  const fh = 40
  ctx.strokeStyle = C.linea
  ctx.lineWidth = 1
  ctx.textAlign = 'center'
  celdas.forEach((c, i) => {
    ctx.strokeRect(fx + 0.5, fy + 0.5, c.w, fh)
    if (i === 0) {
      ctx.fillStyle = C.gris
      ctx.font = `500 13px ${SANS}`
      espaciado(ctx, c.t, fx + c.w / 2, fy + 25, 1.2, 'center')
    } else {
      ctx.fillStyle = C.tinta
      ctx.font = `600 14px ${SANS}`
      ctx.fillText(c.t, fx + c.w / 2, fy + 25)
    }
    fx += c.w
  })

  // Factura N°
  ctx.textAlign = 'right'
  ctx.fillStyle = C.tinta
  ctx.font = `500 14px ${SANS}`
  ctx.fillText('Factura', W - M, fy + fh + 34)
  ctx.fillStyle = C.oro
  ctx.font = `700 21px ${SANS}`
  ctx.fillText(`N° ${d.codigo || '—'}`, W - M, fy + fh + 62)
  ctx.textAlign = 'left'

  // Línea fina dorada bajo el encabezado
  ctx.strokeStyle = 'rgba(168,130,58,0.35)'
  ctx.beginPath()
  ctx.moveTo(M, 188.5)
  ctx.lineTo(W - M, 188.5)
  ctx.stroke()

  // ═════════ Datos del cliente (etiqueta + línea) ═════════
  const colW = (W - M * 2 - 40) / 2
  const campo = (label: string, valor: string, x: number, y: number) => {
    ctx.fillStyle = C.gris
    ctx.font = `500 13px ${SANS}`
    ctx.fillText(label, x, y)
    const lx = x + ctx.measureText(label).width + 10
    const lEnd = x + colW
    ctx.strokeStyle = C.tinta
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(lx, y + 6.5)
    ctx.lineTo(lEnd, y + 6.5)
    ctx.stroke()
    if (valor) {
      ctx.fillStyle = C.tinta
      ctx.font = `600 13.5px ${SANS}`
      ctx.fillText(truncar(ctx, valor, lEnd - lx - 6), lx + 4, y + 1)
    }
  }
  filasDatos.forEach(([l1, v1, l2, v2], i) => {
    const y = yDatos + i * 44
    campo(l1, v1, M, y)
    campo(l2, v2, M + colW + 40, y)
  })

  // ═════════ Tabla de prendas ═════════
  const cols = [
    { t: 'CÓDIGO', w: 118, align: 'center' as const },
    { t: 'PRODUCTO', w: 0, align: 'left' as const },
    { t: 'PRECIO', w: 150, align: 'right' as const },
  ]
  const anchoTabla = W - M * 2
  cols[1].w = anchoTabla - cols[0].w - cols[2].w
  const xs: number[] = []
  let acc = M
  for (const c of cols) { xs.push(acc); acc += c.w }

  ctx.strokeStyle = C.linea
  ctx.lineWidth = 1
  // borde exterior
  ctx.strokeRect(M + 0.5, yTabla + 0.5, anchoTabla, altoTabla)
  // encabezado
  ctx.fillStyle = C.beigeClaro
  ctx.fillRect(M + 1, yTabla + 1, anchoTabla - 1, 45)
  ctx.beginPath()
  ctx.moveTo(M, yTabla + 46.5)
  ctx.lineTo(M + anchoTabla, yTabla + 46.5)
  // filas
  for (let i = 1; i < filasTabla; i++) {
    const y = yTabla + 46 + i * ROW_H + 0.5
    ctx.moveTo(M, y)
    ctx.lineTo(M + anchoTabla, y)
  }
  // columnas
  for (let i = 1; i < cols.length; i++) {
    ctx.moveTo(xs[i] + 0.5, yTabla)
    ctx.lineTo(xs[i] + 0.5, yTabla + altoTabla)
  }
  ctx.stroke()

  ctx.fillStyle = C.gris
  ctx.font = `600 12px ${SANS}`
  cols.forEach((c, i) => espaciado(ctx, c.t, xs[i] + c.w / 2, yTabla + 28, 1.4, 'center'))

  d.prendas.forEach((it, i) => {
    const cy = yTabla + 46 + i * ROW_H + 26
    const cant = Math.max(1, it.cantidad || 1)
    const linea = it.precio || 0
    // código del producto
    ctx.textAlign = 'center'
    ctx.fillStyle = C.tinta
    ctx.font = `600 13px ${SANS}`
    ctx.fillText(truncar(ctx, it.codigo || '', cols[0].w - 16), xs[0] + cols[0].w / 2, cy)
    // producto: nombre (+ unidades si son varias) + tipo
    ctx.textAlign = 'left'
    const px = xs[1] + 14
    const pMax = cols[1].w - 28
    const tipo = it.tipo === 'venta' ? 'VENTA' : it.tipo === 'alquiler' ? 'ALQUILER' : ''
    ctx.font = `600 10px ${SANS}`
    const anchoTipo = tipo ? ctx.measureText(tipo).width + 14 : 0
    const nombre = (it.nombre || '') + (cant > 1 ? `  (x${cant})` : '')
    ctx.fillStyle = C.tinta
    ctx.font = `500 13.5px ${SANS}`
    ctx.fillText(truncar(ctx, nombre, pMax - anchoTipo), px, cy)
    if (tipo) {
      ctx.textAlign = 'right'
      ctx.fillStyle = C.oro
      ctx.font = `600 10px ${SANS}`
      ctx.fillText(tipo, px + pMax, cy - 1)
      ctx.textAlign = 'left'
    }
    // precio de la línea
    ctx.textAlign = 'right'
    ctx.fillStyle = C.tinta
    ctx.font = `600 13.5px ${SANS}`
    ctx.fillText(money(linea), xs[2] + cols[2].w - 18, cy)
    ctx.textAlign = 'left'
  })

  // ═════════ Resumen: abonos (izq.) y totales (der.) ═════════
  const boxW = 300
  const boxX = W - M - boxW
  let ry = yResumen

  // Caja "Total: $"
  ctx.fillStyle = C.beigeClaro
  ctx.fillRect(boxX, ry, boxW, 54)
  ctx.fillStyle = C.cafe
  ctx.font = `800 19px ${SANS}`
  ctx.fillText('Total:', boxX + 18, ry + 34)
  ctx.textAlign = 'right'
  ctx.fillText(money(d.total || 0), boxX + boxW - 18, ry + 34)
  ctx.textAlign = 'left'
  ry += 54 + 26

  const filaResumen = (label: string, valor: string, color: string, bold = false) => {
    ctx.fillStyle = C.gris
    ctx.font = `500 13px ${SANS}`
    ctx.fillText(label, boxX + 18, ry)
    ctx.textAlign = 'right'
    ctx.fillStyle = color
    ctx.font = `${bold ? 700 : 600} ${bold ? 14.5 : 13.5}px ${SANS}`
    ctx.fillText(valor, boxX + boxW - 18, ry)
    ctx.textAlign = 'left'
    ry += 26
  }
  filaResumen('Abonado', money(d.abonado || 0), C.verde)
  if (pagado) filaResumen('Saldo pendiente', 'PAGADO', C.verde, true)
  else filaResumen('Saldo pendiente', money(deuda), C.rojo, true)

  // Columna izquierda: detalle de abonos y notas
  const izqW = boxX - M - 40
  let ly = yResumen + 16
  if (pagos.length) {
    ctx.fillStyle = C.gris
    ctx.font = `600 11px ${SANS}`
    espaciado(ctx, 'ABONOS', M, ly, 1.6)
    ly += 24
    for (const p of pagos) {
      ctx.fillStyle = C.gris
      ctx.font = `500 12.5px ${SANS}`
      ctx.fillText(fechaLarga(p.fecha), M, ly)
      ctx.textAlign = 'right'
      ctx.fillStyle = C.tinta
      ctx.font = `600 12.5px ${SANS}`
      ctx.fillText(money(p.monto), M + Math.min(izqW, 240), ly)
      ctx.textAlign = 'left'
      ly += 24
    }
    ly += 10
  }
  const notas: string[] = []
  if (d.footer) notas.push(d.footer)
  ctx.fillStyle = C.grisSuave
  ctx.font = `italic 500 12px ${SANS}`
  for (const n of notas) {
    ctx.fillText(truncar(ctx, n, izqW), M, ly + 4)
    ly += 20
  }

  // ═════════ Depósito (aparte, bien visible) ═════════
  if (deposito > 0) {
    const dw = W - M * 2
    ctx.fillStyle = '#FFFBF2'
    ctx.strokeStyle = C.oroSuave
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(M, yDeposito, dw, DEP_H, 12)
    ctx.fill()
    ctx.stroke()
    // franja dorada a la izquierda
    ctx.fillStyle = C.oroSuave
    ctx.beginPath()
    ctx.roundRect(M, yDeposito, 8, DEP_H, [12, 0, 0, 12])
    ctx.fill()

    ctx.fillStyle = C.oro
    ctx.font = `800 13px ${SANS}`
    espaciado(ctx, 'DEPÓSITO', M + 30, yDeposito + 36, 2)
    ctx.fillStyle = C.gris
    ctx.font = `500 13px ${SANS}`
    ctx.fillText('Se le devuelve al cliente cuando trae el traje.', M + 30, yDeposito + 60)
    ctx.textAlign = 'right'
    ctx.fillStyle = C.tinta
    ctx.font = `800 26px ${SANS}`
    ctx.fillText(money(deposito), M + dw - 26, yDeposito + 52)
    ctx.textAlign = 'left'
  }

  // ═════════ Políticas del alquiler ═════════
  if (clausulas.length) {
    let py = yPoliticas
    // Título centrado con líneas doradas a los lados
    ctx.fillStyle = C.tinta
    ctx.font = `700 19px ${SERIF}`
    const titulo = 'POLÍTICAS DEL ALQUILER'
    espaciado(ctx, titulo, W / 2, py + 6, 2.4, 'center')
    const anchoTit = [...titulo].reduce((s2, ch) => s2 + ctx.measureText(ch).width, 0) + 2.4 * (titulo.length - 1)
    ctx.strokeStyle = 'rgba(168,130,58,0.55)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(M, py + 0.5)
    ctx.lineTo(W / 2 - anchoTit / 2 - 18, py + 0.5)
    ctx.moveTo(W / 2 + anchoTit / 2 + 18, py + 0.5)
    ctx.lineTo(W - M, py + 0.5)
    ctx.stroke()
    py += 34

    // Aviso del depósito
    ctx.fillStyle = C.tinta
    ctx.font = `700 11.5px ${SANS}`
    espaciado(ctx, POLITICAS.aviso.toUpperCase(), W / 2, py, 1.2, 'center')
    py += 30

    // Cláusulas
    for (const c of clausulas) {
      c.lineas.forEach((linea, i) => {
        if (i === 0) {
          ctx.fillStyle = C.tinta
          ctx.font = POL_LBL
          ctx.fillText(c.etiqueta, M, py)
          ctx.font = POL_TXT
          ctx.fillText(linea, M + c.ancho, py)
        } else {
          ctx.font = POL_TXT
          ctx.fillText(linea, M, py)
        }
        py += POL_LH
      })
      py += 8
    }
  }

  // ═════════ Cierre de la factura ═════════
  ctx.strokeStyle = 'rgba(168,130,58,0.55)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(M, yCierre + 0.5)
  ctx.lineTo(W - M, yCierre + 0.5)
  ctx.stroke()
  if (contacto.length) {
    ctx.textAlign = 'center'
    ctx.fillStyle = C.gris
    ctx.font = `500 12.5px ${SANS}`
    ctx.fillText(contacto.join('   ·   '), W / 2, yCierre + 28)
    ctx.textAlign = 'left'
  }
  // Barra dorada al pie: marca el final de la factura
  ctx.fillStyle = C.oroSuave
  ctx.fillRect(0, H - 8, W, 8)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

function lineaFechas(d: ComprobanteData): string {
  return `${d.etiquetaInicio || 'Entrega'} ${fechaLarga(d.fechaInicio)}  ·  ${d.etiquetaFin || 'Devolución'} ${fechaLarga(d.fechaFin)}`
}

// Mensaje de WhatsApp: saludo corto y cálido. El detalle va en la imagen de la factura.
function construirMensaje(d: ComprobanteData): string {
  const nombre = d.cliente.trim().split(/\s+/)[0] || ''
  const nombreBonito = nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase() : ''
  const retiro = d.fechaRetiro || d.fechaInicio
  return (
    `¡Hola${nombreBonito ? ` ${nombreBonito}` : ''}! 👋%0A%0A` +
    `Te damos la bienvenida a *JJ Production* y gracias por confiar en nosotros. ✨%0A%0A` +
    `Aquí te enviamos tu factura *N° ${d.codigo}*. ` +
    `Preséntala para reclamar tu traje${retiro ? ` el *${fechaLarga(retiro)}*` : ''}.%0A%0A` +
    `Cualquier duda, con gusto te atendemos por este medio. ¡Que disfrutes tu evento! 🎩`
  )
}

// ── WhatsApp directo al chat del cliente ──

/**
 * Deja el número listo para WhatsApp: solo dígitos y con indicativo de país.
 * Un celular colombiano de 10 dígitos (3xx xxx xxxx) recibe el 57 adelante.
 */
export function telefonoWhatsApp(raw: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 10 && d.startsWith('3')) d = '57' + d
  return d
}

/**
 * Abre el chat de WhatsApp con ese número, aunque no esté guardado en los
 * contactos, con el mensaje ya escrito. El texto puede traer saltos como %0A.
 */
export function abrirChatWhatsApp(telefono: string, mensaje: string) {
  const texto = encodeURIComponent(mensaje.split('%0A').join('\n'))
  window.open(`https://wa.me/${telefonoWhatsApp(telefono)}?text=${texto}`, '_blank')
}

/**
 * Copia la imagen del comprobante al portapapeles para pegarla en el chat
 * (mantener presionado → Pegar). Hay que llamarla en el mismo toque del botón,
 * sin await antes, o el navegador la bloquea. Si no se puede copiar, en
 * computador descarga la imagen para adjuntarla a mano.
 */
export async function copiarImagenComprobante(imagen: Promise<Blob | null>, nombre: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('sin portapapeles')
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': imagen.then((b) => {
          if (!b) throw new Error('sin imagen')
          return b
        }),
      }),
    ])
    return true
  } catch {
    const esComputador = window.matchMedia?.('(pointer: fine)').matches
    const blob = await imagen
    if (blob && esComputador) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombre
      a.click()
      URL.revokeObjectURL(url)
    }
    return false
  }
}

// Envía el comprobante por WhatsApp: abre DIRECTO el chat con el número del
// cliente (no hace falta tenerlo guardado) con el resumen escrito, y deja la
// imagen copiada para pegarla en el chat.
export async function compartirComprobante(d: ComprobanteData) {
  const copia = copiarImagenComprobante(generarComprobanteBlob(d), `factura-${d.codigo}.png`)
  abrirChatWhatsApp(d.telefono, construirMensaje(d))
  await copia
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
    ((d.deposito || 0) > 0 ? `Deposito: ${money(d.deposito || 0)} (se devuelve al traer el traje)\n` : '') +
    `\n${d.footer || lineaFechas(d)}\n\n` +
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
