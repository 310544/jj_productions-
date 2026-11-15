// Quita el fondo de una foto y deja la prenda centrada sobre fondo blanco,
// estilo foto de catálogo. Todo corre en el navegador (gratis, sin API):
// la primera vez descarga el modelo de IA y luego queda en caché.

// Tamaño final de la imagen: vertical 3:4, igual que las tarjetas del inventario.
const OUT_W = 900
const OUT_H = 1200
// Margen alrededor de la prenda (0.88 = la prenda ocupa máx. el 88% del alto/ancho).
const OCUPACION = 0.88
// Lado máximo con el que se procesa la foto (fotos de celular de 12 MP son muy pesadas).
const MAX_LADO_PROCESO = 1280
// Opacidad mínima para considerar que un píxel es parte de la prenda.
const UMBRAL_ALFA = 24
// Manchas sueltas más pequeñas que este % de la pieza principal se borran.
const MIN_MANCHA = 0.15

/** Rectángulo normalizado (0 a 1) sobre la imagen recortada. */
export interface Zona { x: number; y: number; w: number; h: number }

export interface ResultadoFondo {
  /** Imagen final lista para guardar (JPG, fondo blanco). */
  archivo: File
  /** Recorte con fondo transparente, para poder ajustar la zona a mano. */
  recorte: Blob
  /** Zona donde quedó la prenda (para iniciar el ajuste manual). */
  zona: Zona
}

export type ProgresoFondo = (porcentaje: number, etapa: 'descargando' | 'procesando') => void

function cargarImagen(src: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(src)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')) }
    img.src = url
  })
}

function canvasABlob(canvas: HTMLCanvasElement, tipo: string, calidad?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), tipo, calidad)
  })
}

function aCanvas(img: HTMLImageElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  return { canvas, ctx }
}

/** Reduce la foto para que el modelo la procese rápido en el celular. */
async function reducir(file: Blob): Promise<Blob> {
  const img = await cargarImagen(file)
  const lado = Math.max(img.naturalWidth, img.naturalHeight)
  if (lado <= MAX_LADO_PROCESO) return file
  const escala = MAX_LADO_PROCESO / lado
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * escala)
  c.height = Math.round(img.naturalHeight * escala)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return canvasABlob(c, 'image/jpeg', 0.92)
}

/**
 * Borra las manchas sueltas que el modelo dejó por error (pedazos de tela,
 * objetos del fondo). Conserva la pieza más grande y cualquier otra que sea
 * de tamaño parecido (por ejemplo, un par de zapatos).
 */
function limpiarManchas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h)
  const d = imgData.data
  const total = w * h
  const etiqueta = new Int32Array(total) // 0 = sin visitar / fondo
  const tamanos: number[] = [0]
  const pila = new Int32Array(total)

  for (let i = 0; i < total; i++) {
    if (etiqueta[i] !== 0 || d[i * 4 + 3] <= UMBRAL_ALFA) continue
    const id = tamanos.length
    let tam = 0
    let top = 0
    pila[top++] = i
    etiqueta[i] = id
    while (top > 0) {
      const p = pila[--top]
      tam++
      const x = p % w
      const izq = x > 0 ? p - 1 : -1
      const der = x < w - 1 ? p + 1 : -1
      const arr = p - w
      const aba = p + w
      for (const n of [izq, der, arr, aba]) {
        if (n < 0 || n >= total || etiqueta[n] !== 0) continue
        if (d[n * 4 + 3] <= UMBRAL_ALFA) continue
        etiqueta[n] = id
        pila[top++] = n
      }
    }
    tamanos.push(tam)
  }

  if (tamanos.length <= 2) return // una sola pieza: nada que limpiar
  let mayor = 0
  for (const t of tamanos) if (t > mayor) mayor = t
  const minimo = mayor * MIN_MANCHA
  for (let i = 0; i < total; i++) {
    const id = etiqueta[i]
    if (id !== 0 && tamanos[id] < minimo) d[i * 4 + 3] = 0
  }
  ctx.putImageData(imgData, 0, 0)
}

/** Rectángulo (en píxeles) que ocupa la prenda dentro de una zona. */
function medirPrenda(ctx: CanvasRenderingContext2D, w: number, h: number, zona: Zona) {
  const x0 = Math.max(0, Math.floor(zona.x * w))
  const y0 = Math.max(0, Math.floor(zona.y * h))
  const x1 = Math.min(w, Math.ceil((zona.x + zona.w) * w))
  const y1 = Math.min(h, Math.ceil((zona.y + zona.h) * h))
  if (x1 <= x0 || y1 <= y0) return null
  const zw = x1 - x0
  const { data } = ctx.getImageData(x0, y0, zw, y1 - y0)
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1
  for (let y = 0; y < y1 - y0; y++) {
    for (let x = 0; x < zw; x++) {
      if (data[(y * zw + x) * 4 + 3] > UMBRAL_ALFA) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  return { x: x0 + minX, y: y0 + minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

/** Pone la prenda (solo lo que está dentro de la zona) centrada sobre un lienzo blanco. */
async function componer(fuente: HTMLCanvasElement, zona: Zona, nombreBase: string): Promise<File> {
  const ctxFuente = fuente.getContext('2d', { willReadFrequently: true })!
  const caja = medirPrenda(ctxFuente, fuente.width, fuente.height, zona)
  if (!caja) throw new Error('No se detectó ninguna prenda en esa zona')

  const out = document.createElement('canvas')
  out.width = OUT_W
  out.height = OUT_H
  const ctx = out.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, OUT_W, OUT_H)
  ctx.imageSmoothingQuality = 'high'

  const escala = Math.min((OUT_W * OCUPACION) / caja.w, (OUT_H * OCUPACION) / caja.h)
  const dw = caja.w * escala
  const dh = caja.h * escala
  ctx.drawImage(fuente, caja.x, caja.y, caja.w, caja.h, (OUT_W - dw) / 2, (OUT_H - dh) / 2, dw, dh)

  const blob = await canvasABlob(out, 'image/jpeg', 0.9)
  return new File([blob], `${nombreBase}-fondo-blanco.jpg`, { type: 'image/jpeg' })
}

function nombreSinExtension(nombre?: string) {
  return (nombre || '').replace(/\.[^.]+$/, '') || 'prenda'
}

export async function quitarFondo(file: File, onProgreso?: ProgresoFondo): Promise<ResultadoFondo> {
  // Import dinámico: la librería (pesada) solo se descarga cuando se usa.
  const { removeBackground } = await import('@imgly/background-removal')

  const entrada = await reducir(file)

  const resultado = await removeBackground(entrada, {
    // 'isnet_fp16' es más preciso en los bordes que 'isnet_quint8' (más liviano).
    model: 'isnet_fp16',
    output: { format: 'image/png' },
    progress: (clave, actual, total) => {
      if (!onProgreso || !total) return
      const pct = Math.round((actual / total) * 100)
      onProgreso(pct, clave.startsWith('fetch') ? 'descargando' : 'procesando')
    },
  })

  // Limpia manchas sueltas y guarda el recorte transparente ya limpio
  const { canvas, ctx } = aCanvas(await cargarImagen(resultado))
  limpiarManchas(ctx, canvas.width, canvas.height)
  const recorte = await canvasABlob(canvas, 'image/png')

  const todo: Zona = { x: 0, y: 0, w: 1, h: 1 }
  const caja = medirPrenda(ctx, canvas.width, canvas.height, todo)
  if (!caja) throw new Error('No se detectó ninguna prenda en la foto')

  const archivo = await componer(canvas, todo, nombreSinExtension(file.name))
  const zona: Zona = {
    x: caja.x / canvas.width,
    y: caja.y / canvas.height,
    w: caja.w / canvas.width,
    h: caja.h / canvas.height,
  }
  return { archivo, recorte, zona }
}

/** Ajuste manual: deja solo lo que está dentro de la zona marcada por el usuario. */
export async function aplicarZona(recorte: Blob, zona: Zona, nombre?: string): Promise<File> {
  const { canvas } = aCanvas(await cargarImagen(recorte))
  return componer(canvas, zona, nombreSinExtension(nombre))
}
