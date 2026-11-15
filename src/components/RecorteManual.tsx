import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Zona } from '../lib/quitarFondo'

type Modo = 'mover' | 'nw' | 'ne' | 'sw' | 'se'
interface Arrastre { modo: Modo; px: number; py: number; inicio: Zona }

interface Props {
  /** Imagen recortada (fondo transparente) */
  src: string
  /** Rectángulo inicial (normalizado 0 a 1) */
  zonaInicial: Zona
  onCancelar: () => void
  onAplicar: (zona: Zona) => void
}

const MIN = 0.08 // tamaño mínimo del recuadro (8% de la imagen)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Pantalla para marcar con un recuadro qué parte de la foto conservar. */
export default function RecorteManual({ src, zonaInicial, onCancelar, onAplicar }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const arrastre = useRef<Arrastre | null>(null)
  // Arranca con un pequeño margen alrededor de lo que detectó la IA
  const [zona, setZona] = useState<Zona>(() => {
    const m = 0.02
    const x = clamp(zonaInicial.x - m, 0, 1)
    const y = clamp(zonaInicial.y - m, 0, 1)
    return {
      x, y,
      w: clamp(zonaInicial.w + m * 2, MIN, 1 - x),
      h: clamp(zonaInicial.h + m * 2, MIN, 1 - y),
    }
  })

  // El modo (mover o una esquina) viene en el atributo data-modo del elemento tocado
  function empezar(e: React.PointerEvent<HTMLElement>) {
    e.preventDefault()
    e.stopPropagation()
    const modo = e.currentTarget.dataset.modo as Modo
    e.currentTarget.setPointerCapture(e.pointerId)
    arrastre.current = { modo, px: e.clientX, py: e.clientY, inicio: zona }
  }

  function mover(e: React.PointerEvent) {
    const a = arrastre.current
    const img = imgRef.current
    if (!a || !img) return
    const r = img.getBoundingClientRect()
    const dx = (e.clientX - a.px) / r.width
    const dy = (e.clientY - a.py) / r.height
    let { x, y, w, h } = a.inicio

    if (a.modo === 'mover') {
      x = clamp(x + dx, 0, 1 - w)
      y = clamp(y + dy, 0, 1 - h)
    } else {
      let x2 = x + w
      let y2 = y + h
      if (a.modo.includes('w')) x = clamp(x + dx, 0, x2 - MIN)
      if (a.modo.includes('e')) x2 = clamp(x2 + dx, x + MIN, 1)
      if (a.modo.includes('n')) y = clamp(y + dy, 0, y2 - MIN)
      if (a.modo.includes('s')) y2 = clamp(y2 + dy, y + MIN, 1)
      w = x2 - x
      h = y2 - y
    }
    setZona({ x, y, w, h })
  }

  function soltar() {
    arrastre.current = null
  }

  const caja = {
    left: `${zona.x * 100}%`,
    top: `${zona.y * 100}%`,
    width: `${zona.w * 100}%`,
    height: `${zona.h * 100}%`,
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex flex-col select-none"
      style={{ background: 'rgba(0,0,0,0.88)', touchAction: 'none' }}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      <p className="text-white text-sm text-center pt-8 px-6">
        Mueve las esquinas para dejar solo la prenda dentro del recuadro
      </p>

      <div className="flex-1 flex items-center justify-center p-8 min-h-0">
        <div className="relative">
          <img
            ref={imgRef}
            src={src}
            alt="Recorte"
            draggable={false}
            className="block max-w-full max-h-[65vh] rounded-[8px]"
            style={{ background: '#FFFFFF' }}
          />

          {/* Oscurece lo que queda por fuera del recuadro */}
          <div className="absolute inset-0 overflow-hidden rounded-[8px] pointer-events-none">
            <div className="absolute" style={{ ...caja, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }} />
          </div>

          {/* Recuadro: se arrastra desde el centro o desde las esquinas */}
          <div
            className="absolute border-2 border-white"
            style={{ ...caja, cursor: 'move' }}
            data-modo="mover"
            onPointerDown={empezar}
          >
            {(['nw', 'ne', 'sw', 'se'] as const).map((c) => (
              <span
                key={c}
                data-modo={c}
                onPointerDown={empezar}
                className="absolute w-8 h-8 rounded-full bg-white shadow-lg"
                style={{
                  [c.includes('n') ? 'top' : 'bottom']: -16,
                  [c.includes('w') ? 'left' : 'right']: -16,
                  border: '3px solid var(--accent, #C9A35A)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-6 pb-10">
        <button
          type="button"
          onClick={onCancelar}
          className="py-3.5 rounded-[14px] font-semibold text-white"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onAplicar(zona)}
          className="py-3.5 rounded-[14px] font-semibold text-white"
          style={{ background: 'var(--accent, #C9A35A)' }}
        >
          Aplicar
        </button>
      </div>
    </div>,
    document.body,
  )
}
