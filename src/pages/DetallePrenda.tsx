import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Prenda } from '../types'
import {
  IconArrowLeft, IconUser, IconPhone, IconCalendar,
  IconCheck, IconAlertTriangle,
} from '@tabler/icons-react'

interface RentalInfo {
  customer_name: string
  customer_phone: string
  fecha_inicio: string
  fecha_fin: string
  rental_id: number
}

export default function DetallePrenda() {
  const { codigo } = useParams<{ codigo: string }>()
  const navigate = useNavigate()
  const [prenda, setPrenda] = useState<Prenda | null>(null)
  const [rentalInfo, setRentalInfo] = useState<RentalInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchPrenda()
  }, [codigo])

  async function fetchPrenda() {
    setLoading(true)
    setError(null)

    const { data: prendaData, error: prendaError } = await supabase
      .from('garments')
      .select('*')
      .eq('codigo', codigo)
      .single()

    if (prendaError || !prendaData) {
      setError('Prenda no encontrada')
      setLoading(false)
      return
    }

    setPrenda(prendaData)

    if (prendaData.estado === 'ocupado') {
      const { data: items, error: itemsError } = await supabase
        .from('rental_items')
        .select('rental_id')
        .eq('garment_id', prendaData.id)

      if (!itemsError && items && items.length > 0) {
        const rentalIds = items.map((i) => i.rental_id)

        const { data: rentals, error: rentalError } = await supabase
          .from('rentals')
          .select('id, fecha_inicio, fecha_fin, customer_id')
          .in('id', rentalIds)
          .eq('estado', 'activo')
          .limit(1)
          .single()

        if (!rentalError && rentals) {
          const { data: customer } = await supabase
            .from('customers')
            .select('nombre, telefono')
            .eq('id', rentals.customer_id)
            .single()

          setRentalInfo({
            customer_name: customer?.nombre || '—',
            customer_phone: customer?.telefono || '—',
            fecha_inicio: rentals.fecha_inicio,
            fecha_fin: rentals.fecha_fin,
            rental_id: rentals.id,
          })
        }
      }
    }

    setLoading(false)
  }

  async function handleMarcarDisponible() {
    if (!prenda || !rentalInfo) return
    setUpdating(true)

    await supabase
      .from('garments')
      .update({ estado: 'disponible' })
      .eq('id', prenda.id)

    await supabase
      .from('rentals')
      .update({ estado: 'finalizado' })
      .eq('id', rentalInfo.rental_id)

    setPrenda({ ...prenda, estado: 'disponible' })
    setRentalInfo(null)
    setUpdating(false)
  }

  const cardStyle = {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">Cargando...</p>
      </div>
    )
  }

  if (error || !prenda) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:brightness-125 transition-all"
          style={{
            background: 'var(--glass-strong)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
          }}
          aria-label="Volver"
        >
          <IconArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <p className="text-center py-10" style={{ color: 'var(--danger)' }}>{error}</p>
      </div>
    )
  }

  const fechaVencida =
    rentalInfo && new Date(rentalInfo.fecha_fin) < new Date()

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:brightness-125 transition-all"
        style={{
          background: 'var(--glass-strong)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-secondary)',
        }}
        aria-label="Volver"
      >
        <IconArrowLeft className="w-5 h-5" aria-hidden="true" />
      </button>

      <div
        className="aspect-square rounded-[16px] flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {prenda.imagen_url ? (
          <img
            src={prenda.imagen_url}
            alt={prenda.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-7xl opacity-30">👔</span>
        )}
        <span
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-semibold"
          style={{
            background:
              prenda.estado === 'disponible'
                ? 'var(--success-bg)'
                : 'var(--danger-bg)',
            border:
              prenda.estado === 'disponible'
                ? '1px solid var(--success-border)'
                : '1px solid var(--danger-border)',
            color:
              prenda.estado === 'disponible'
                ? 'var(--success)'
                : 'var(--danger)',
          }}
        >
          {prenda.estado}
        </span>
      </div>

      <div>
        <p className="text-sm font-medium text-text-tertiary tracking-wide">
          {prenda.codigo}
        </p>
        <h2 className="text-xl font-bold text-text-primary mt-1">
          {prenda.nombre}
        </h2>
        {prenda.precio > 0 && (
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--accent)' }}>
            ${prenda.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} / alquiler
          </p>
        )}
      </div>

      {prenda.estado === 'disponible' && (
        <div className="rounded-[16px] p-5 text-center" style={cardStyle}>
          <p className="text-4xl mb-2 opacity-30">✅</p>
          <p className="text-text-secondary font-medium">Prenda disponible</p>
          <p className="text-text-tertiary text-sm mt-1">Lista para alquilar</p>
        </div>
      )}

      {rentalInfo && (
        <div className="rounded-[16px] p-5 space-y-4" style={cardStyle}>
          <h3 className="font-semibold text-text-primary">Alquiler activo</h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <IconUser className="w-5 h-5 text-text-secondary shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium text-text-primary">
                {rentalInfo.customer_name}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <IconPhone className="w-5 h-5 text-text-secondary shrink-0" aria-hidden="true" />
              <p className="text-sm text-text-primary">
                {rentalInfo.customer_phone}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <IconCalendar className="w-5 h-5 text-text-secondary shrink-0" aria-hidden="true" />
              <div className="flex gap-2 text-sm">
                <span className="text-text-primary">
                  {new Date(rentalInfo.fecha_inicio).toLocaleDateString('es-AR')}
                </span>
                <span className="text-text-tertiary">→</span>
                <span
                  className="font-medium"
                  style={{ color: fechaVencida ? 'var(--danger)' : 'var(--text-primary)' }}
                >
                  {new Date(rentalInfo.fecha_fin).toLocaleDateString('es-AR')}
                </span>
              </div>
            </div>

            {fechaVencida && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}>
                <IconAlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">Fecha de devolucion vencida</span>
              </div>
            )}
          </div>

          <button
            onClick={handleMarcarDisponible}
            disabled={updating}
            className="w-full py-3 font-semibold rounded-[14px] transition-all hover:brightness-125 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              border: '1px solid var(--success-border)',
              color: 'var(--success)',
              background: 'var(--success-bg)',
            }}
          >
            <IconCheck className="w-5 h-5" aria-hidden="true" />
            {updating ? 'Actualizando...' : 'Marcar como disponible'}
          </button>
        </div>
      )}
    </div>
  )
}
