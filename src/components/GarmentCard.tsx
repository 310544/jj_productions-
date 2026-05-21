import { Link } from 'react-router-dom'
import type { Prenda } from '../types'
import { IconX } from '@tabler/icons-react'

interface Props {
  prenda: Prenda
}

export default function GarmentCard({ prenda }: Props) {
  const ocupado = prenda.estado === 'ocupado'

  return (
    <Link
      to={`/prenda/${prenda.codigo}`}
      className="rounded-[16px] overflow-hidden relative group"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)',
      }}
    >
      <div
        className="aspect-square flex items-center justify-center relative"
        style={{
          background: ocupado
            ? 'var(--danger-bg)'
            : 'var(--success-bg)',
        }}
      >
        {prenda.imagen_url ? (
          <img
            src={prenda.imagen_url}
            alt={prenda.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl opacity-30">👔</span>
        )}

        {ocupado && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-[16px]"
            style={{ background: 'var(--overlay)' }}
          >
            <IconX className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.85)' }} aria-hidden="true" />
          </div>
        )}

        <span
          className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{
            background: ocupado
              ? 'var(--danger-bg)'
              : 'var(--success-bg)',
            border: ocupado
              ? '1px solid var(--danger-border)'
              : '1px solid var(--success-border)',
            color: ocupado ? 'var(--danger)' : 'var(--success)',
          }}
        >
          {prenda.estado}
        </span>
      </div>

      <div className="p-3">
        <p className="text-xs font-medium text-text-tertiary tracking-wide">
          {prenda.codigo}
        </p>
        <p className="text-sm font-semibold text-text-primary truncate mt-0.5">
          {prenda.nombre}
        </p>
      </div>
    </Link>
  )
}
