import { Link } from 'react-router-dom'
import type { Prenda } from '../types'

interface Props {
  prenda: Prenda
}

export default function GarmentCard({ prenda }: Props) {
  const ocupado = prenda.estado === 'ocupado'

  return (
    <Link
      to={`/prenda/${prenda.codigo}`}
      className="rounded-[16px] overflow-hidden flex flex-col p-2"
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
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-20">👔</span>
          </div>
        )}

        {/* Badge estado */}
        <span
          className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
          style={{
            background: ocupado ? 'var(--danger-bg)' : 'var(--success-bg)',
            border: ocupado
              ? '1px solid var(--danger-border)'
              : '1px solid var(--success-border)',
            color: ocupado ? 'var(--danger)' : 'var(--success)',
          }}
        >
          {prenda.estado}
        </span>
      </div>

      {/* Info abajo */}
      <div className="px-1 pt-2 pb-1 flex flex-col gap-0.5">
        {/* Código en dorado */}
        <p
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: 'var(--accent)' }}
        >
          {prenda.codigo}
        </p>

        {/* Nombre */}
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {prenda.nombre}
        </p>
      </div>
    </Link>
  )
}