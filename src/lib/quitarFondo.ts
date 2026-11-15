// Quita el fondo de una foto y deja la prenda centrada sobre fondo blanco,
// estilo foto de catálogo. Todo corre en el navegador (gratis, sin API):
// la primera vez descarga el modelo de IA (~40 MB) y luego queda en caché.

// Tamaño final de la imagen: vertical 3:4, igual que las tarjetas del inventario.
const OUT_W = 900
const OUT_H = 1200
// Margen alrededor de la prenda (0.88 = la prenda ocupa máx. el 88% del alto/ancho).
const OCUPACION = 0.88
// Lado máximo con el que se procesa la foto (fotos de celular de 12 MP son muy pesadas).
const MAX_LADO_PROCESO = 1280

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

/** Busca el rectángulo que ocupa la prenda (píxeles no transparentes). */
function recorteDelSujeto(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h)
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

export async function quitarFondo(file: File, onProgreso?: ProgresoFondo): Promise<File> {
  // Import dinámico: la librería (pesada) solo se descarga cuando se usa.
  const { removeBackground } = await import('@imgly/background-removal')

  const entrada = await reducir(file)

  const recortada = await removeBackground(entrada, {
    model: 'isnet_quint8', // el más liviano; cambiar a 'isnet_fp16' para más precisión
    output: { format: 'image/png' },
    progress: (clave, actual, total) => {
      if (!onProgreso || !total) return
      const pct = Math.round((actual / total) * 100)
      onProgreso(pct, clave.startsWith('fetch') ? 'descargando' : 'procesando')
    },
  })

  // Dibuja la prenda recortada y detecta su contorno
  const img = await cargarImagen(recortada)
  const tmp = document.createElement('canvas')
  tmp.width = img.naturalWidth
  tmp.height = img.naturalHeight
  const tctx = tmp.getContext('2d', { willReadFrequently: true })!
  tctx.drawImage(img, 0, 0)
  const caja = recorteDelSujeto(tctx, tmp.width, tmp.height)
  if (!caja) throw new Error('No se detectó ninguna prenda en la foto')

  // Lienzo final blanco con la prenda centrada
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
  ctx.drawImage(img, caja.x, caja.y, caja.w, caja.h, (OUT_W - dw) / 2, (OUT_H - dh) / 2, dw, dh)

  const blob = await canvasABlob(out, 'image/jpeg', 0.9)
  const nombre = file.name.replace(/\.[^.]+$/, '') || 'prenda'
  return new File([blob], `${nombre}-fondo-blanco.jpg`, { type: 'image/jpeg' })
}
