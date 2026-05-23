import type { Prenda } from '../types'
import { IconHeart, IconHeartFilled } from '@tabler/icons-react'

interface Props {
  prenda: Prenda
  onSelect: (prenda: Prenda) => void
  isFavorite: boolean
  onToggleFavorite: (id: number) => void
}

function formatFecha(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export default function GarmentCard({ prenda, onSelect, isFavorite, onToggleFavorite }: Props) {
  const ocupado = prenda.estado === 'ocupado'
  const fechas = prenda.fechas_ocupado || []

  return (
    <button
      onClick={() => onSelect(prenda)}
      className="rounded-[16px] overflow-hidden flex flex-col p-2 text-left w-full cursor-pointer"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
      }}
    >
      {/* Recuadro interior con la foto */}
      <div
        className="relative w-full aspect-square overflow-hidden rounded-[12px]"
        style={{ background: '#f1f1f3' }}
      >
        {prenda.imagen_url ? (
          <img
            src={prenda.imagen_url}
            alt={prenda.nombre}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-20">👔</span>
          </div>
        )}

        {ocupado && (
          <div className="absolute inset-0 rounded-[12px] overflow-hidden flex flex-col items-center justify-center gap-1.5" style={{ background: 'rgba(0,0,0,0.55)' }}>
            {/* Todas las fechas de alquiler */}
            {fechas.map((f, i) => (
              <p key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full relative z-10" style={{
                background: 'rgba(255,60,60,0.2)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#ff3b3b',
              }}>
                {formatFecha(f.fecha_inicio)} - {formatFecha(f.fecha_fin)}
              </p>
            ))}
            {/* Línea diagonal \ de esquina superior-izq a inferior-der */}
            <span
              className="absolute h-[4px] w-[141%] rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.35)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(45deg)',
              }}
            />
            {/* Línea diagonal / de esquina superior-der a inferior-izq */}
            <span
              className="absolute h-[4px] w-[141%] rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.35)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
              }}
            />
          </div>
        )}

        {/* Badge estado — gris glass */}
        <span
          className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
          style={{
            background: 'rgba(0,0,0,0.04)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,0,0,0.08)',
            color: 'rgba(0,0,0,0.55)',
          }}
        >
          {prenda.estado}
        </span>

        {/* Boton favorito */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(prenda.id)
          }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-110"
          style={{
            background: 'rgba(0,0,0,0.04)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          {isFavorite ? (
            <IconHeartFilled className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
          ) : (
            <IconHeart className="w-3.5 h-3.5" style={{ color: 'rgba(0,0,0,0.45)' }} />
          )}
        </button>
      </div>

      {/* Info abajo */}
      <div className="px-1 pt-2 pb-1 flex flex-col gap-0.5">
        {/* Código */}
        <p
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: ocupado ? 'var(--text-secondary)' : 'var(--accent)' }}
        >
          {prenda.codigo}
        </p>

        {/* Nombre */}
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {prenda.nombre}
        </p>
      </div>
    </button>
  )
}