import type { Prenda } from '../types'

interface Props {
  prenda: Prenda
  onSelect: (prenda: Prenda) => void
}

export default function GarmentCard({ prenda, onSelect }: Props) {
  const ocupado = prenda.estado === 'ocupado'

  return (
    <button
      onClick={() => onSelect(prenda)}
      className="rounded-[16px] overflow-hidden flex flex-col p-2 text-left w-full cursor-pointer"
      style={{
        background: '#1a1a1f',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Recuadro interior con la foto */}
      <div
        className="relative w-full aspect-square overflow-hidden rounded-[12px]"
        style={{ background: '#111114' }}
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
          <div className="absolute inset-0 rounded-[12px] overflow-hidden" style={{ background: 'rgba(0,0,0,0.55)' }}>
            {/* Línea diagonal \ de esquina superior-izq a inferior-der */}
            <span
              className="absolute h-[4px] w-[141%] rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.8)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(45deg)',
              }}
            />
            {/* Línea diagonal / de esquina superior-der a inferior-izq */}
            <span
              className="absolute h-[4px] w-[141%] rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.8)',
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
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {prenda.estado}
        </span>
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