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

  const status = vendido
    ? { bg: 'linear-gradient(135deg, #9CA3AF, #6B7280)', label: 'Vendido' }
    : ocupado
      ? { bg: 'linear-gradient(135deg, #F87171, #DC2626)', label: 'Ocupado' }
      : { bg: 'linear-gradient(135deg, #34D399, #16A34A)', label: 'Disponible' }

  return (
    <div
      onClick={() => onSelect(prenda)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(prenda) }}
      role="button"
      tabIndex={0}
      className="group relative rounded-[20px] overflow-hidden flex flex-col text-left w-full cursor-pointer
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/50"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 12px 30px rgba(28,20,8,0.12)',
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease, border-color 0.3s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-6px)'
        el.style.boxShadow = '0 18px 40px rgba(168,130,58,0.18), 0 6px 14px rgba(0,0,0,0.08)'
        el.style.borderColor = 'rgba(201,168,76,0.35)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)'
        el.style.borderColor = 'var(--surface-border)'
      }}
    >
      {/* Image — full bleed */}
      <div className="relative w-full aspect-[3/4] overflow-hidden" style={{ background: '#ECEAE4' }}>
        {prenda.imagen_url ? (
          <img
            src={prenda.imagen_url}
            alt={prenda.nombre}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-5xl opacity-10">👔</span>
          </div>
        )}

        {/* Gradient bottom overlay */}
        <div
          className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)' }}
        />

        {/* Status pill — top left */}
        <span
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold tracking-wide text-white"
          style={{
            background: status.bg,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {status.label}
        </span>

        {/* Code chip — top right */}
        <span
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-extrabold tracking-wider"
          style={{
            background: 'rgba(17,17,17,0.78)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: '#F8E9BE',
            border: '1px solid rgba(201,168,76,0.55)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {prenda.codigo}
        </span>

        {/* Ocupado dates at bottom of image */}
        {ocupado && fechas.length > 0 && (
          <div className="absolute bottom-2.5 inset-x-2.5 flex flex-col gap-1 items-start">
            {fechas.map((f, i) => (
              <span
                key={i}
                className="text-[10px] font-semibold px-2.5 py-[3px] rounded-full"
                style={{
                  background: 'rgba(0,0,0,0.40)',
                  color: '#FCD34D',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                }}
              >
                {formatDateShort(f.fecha_inicio)} – {formatDateShort(f.fecha_fin)}
              </span>
            ))}
          </div>
        )}

        {/* Vendido overlay */}
        {vendido && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.42)' }}>
            <span
              className="text-[11px] font-bold tracking-[0.20em] uppercase px-4 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.90)',
                border: '1px solid rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
              }}
            >
              Vendido
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pt-3.5 pb-4 flex flex-col gap-1">
        {prenda.categoria && (
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] truncate" style={{ color: 'var(--text-tertiary)' }}>
            {prenda.categoria}
          </p>
        )}
        <p className="text-base font-bold truncate text-text-primary leading-snug">
          {prenda.nombre}
        </p>
        {prenda.precio > 0 && (
          <p className="text-lg font-extrabold mt-0.5" style={{ color: 'var(--accent-dark)' }}>
            ${prenda.precio.toLocaleString('es-CO')}
          </p>
        )}
      </div>
    </div>
  )
}
