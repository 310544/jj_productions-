import type { Prenda } from '../types'
import { formatDateShort } from '../lib/formatDate'

interface Props {
  prenda: Prenda
  onSelect: (prenda: Prenda) => void
}

export default function GarmentCard({ prenda, onSelect }: Props) {
  const ocupado = prenda.estado === 'ocupado'
  const vendido = prenda.estado === 'vendido'
  const fechas = prenda.fechas_ocupado || []

  return (
    <div
      onClick={() => onSelect(prenda)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onSelect(prenda) } }}
      role="button"
      tabIndex={0}
      className="rounded-[16px] overflow-hidden flex flex-col p-2 text-left w-full cursor-pointer"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Recuadro interior con la foto */}
      <div
        className="relative w-full aspect-square overflow-hidden rounded-[18px]"
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
          <div className="absolute inset-0 rounded-[18px] overflow-hidden flex flex-col items-center justify-center gap-1.5" style={{ background: 'rgba(0,0,0,0.55)' }}>
            {fechas.map((f, i) => (
              <p key={i} className="text-[11px] font-semibold px-2 py-0.5 rounded-full relative z-10" style={{
                background: 'rgba(255,60,60,0.2)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: '#ff3b3b',
              }}>
                {formatDateShort(f.fecha_inicio)} - {formatDateShort(f.fecha_fin)}
              </p>
            ))}
            <span
              className="absolute h-[4px] w-[141%] rounded-sm"
              style={{
                background: 'rgba(255,255,255,0.35)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(45deg)',
              }}
            />
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

        {vendido && (
          <div className="absolute inset-0 rounded-[18px] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <span className="text-white text-sm font-bold tracking-widest uppercase opacity-80">Vendido</span>
          </div>
        )}

        {/* Indicador de estado */}
        <div
          className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.15)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: vendido ? 'var(--text-tertiary)' : ocupado ? 'var(--danger)' : 'var(--success)',
              animation: vendido ? 'none' : 'pulse-dot 2s ease-in-out infinite',
            }}
          />
        </div>
        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
          }
        `}</style>

        {/* Etiqueta codigo */}
        <span
          className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide"
          style={{
            background: 'rgba(255,255,255,0.9)',
            color: '#1a1a1e',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          {prenda.codigo}
        </span>
      </div>

      {/* Info abajo */}
      <div className="px-1 pt-2 pb-1 flex flex-col gap-0.5">
        {/* Nombre */}
        <p className="text-sm font-medium truncate text-text-primary">
          {prenda.nombre}
        </p>
      </div>
    </div>
  )
}