import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/formatDate'
import type { Prenda } from '../types'
import {
  IconArrowLeft, IconUser, IconPhone, IconCalendar,
  IconCheck, IconAlertTriangle, IconTrash,
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
  const [rentals, setRentals] = useState<RentalInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

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

    // Traer TODOS los alquileres activos de esta prenda (cada uno con sus fechas)
    const { data: items } = await supabase
      .from('rental_items')
      .select('rental_id')
      .eq('garment_id', prendaData.id)

    if (items && items.length > 0) {
      const rentalIds = items.map((i) => i.rental_id)

      const { data: rentalsData } = await supabase
        .from('rentals')
        .select('id, fecha_inicio, fecha_fin, customers(nombre, telefono)')
        .in('id', rentalIds)
        .eq('estado', 'activo')
        .order('fecha_inicio', { ascending: true })

      if (rentalsData) {
        setRentals(
          rentalsData.map((r: any) => {
            const cust = Array.isArray(r.customers) ? r.customers[0] : r.customers
            return {
              rental_id: r.id,
              fecha_inicio: r.fecha_inicio,
              fecha_fin: r.fecha_fin,
              customer_name: cust?.nombre || '—',
              customer_phone: cust?.telefono || '—',
            }
          })
        )
      }
    } else {
      setRentals([])
    }

    setLoading(false)
  }

  async function handleFinalizarRental(rentalId: number) {
    if (!prenda) return
    setUpdatingId(rentalId)

    await supabase
      .from('rentals')
      .update({ estado: 'finalizado' })
      .eq('id', rentalId)

    const remaining = rentals.filter((r) => r.rental_id !== rentalId)

    // Si ya no quedan alquileres activos, la prenda vuelve a estar disponible
    if (remaining.length === 0 && prenda.estado === 'ocupado') {
      await supabase
        .from('garments')
        .update({ estado: 'disponible' })
        .eq('id', prenda.id)
      setPrenda({ ...prenda, estado: 'disponible' })
    }

    setRentals(remaining)
    setUpdatingId(null)
  }

  async function handleDelete() {
    if (!prenda) return
    if (!window.confirm(`Eliminar "${prenda.nombre}"? Esta accion no se puede deshacer.`)) return

    setDeleting(true)
    setError(null)

    // Eliminar imagen del storage si tiene
    if (prenda.imagen_url) {
      try {
        const url = new URL(prenda.imagen_url)
        const path = url.pathname.split('/').slice(2).join('/')
        await supabase.storage.from('prendas').remove([path])
      } catch {
        // Si falla el borrado de imagen, continuamos con eliminar el registro
      }
    }

    // Borrar referencias en rental_items primero
    await supabase
      .from('rental_items')
      .delete()
      .eq('garment_id', prenda.id)

    const { error: deleteError } = await supabase
      .from('garments')
      .delete()
      .eq('id', prenda.id)

    if (deleteError) {
      setError('Error al eliminar: ' + deleteError.message)
      setDeleting(false)
      return
    }

    navigate('/')
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

  const esVencida = (fechaFin: string) => new Date(fechaFin) < new Date()

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
            background: 'rgba(0,0,0,0.04)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,0,0,0.08)',
            color: 'rgba(0,0,0,0.55)',
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
            {prenda.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} / alquiler
          </p>
        )}
      </div>

      {rentals.length === 0 && prenda.estado === 'disponible' && (
        <div className="rounded-[16px] p-5 text-center" style={cardStyle}>
          <p className="text-4xl mb-2 opacity-30">✅</p>
          <p className="text-text-secondary font-medium">Prenda disponible</p>
          <p className="text-text-tertiary text-sm mt-1">Lista para alquilar</p>
        </div>
      )}

      {rentals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <IconCalendar className="w-4 h-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />
            Alquileres ({rentals.length})
          </h3>

          {rentals.map((r) => {
            const vencida = esVencida(r.fecha_fin)
            return (
              <div key={r.rental_id} className="rounded-[16px] p-5 space-y-4" style={cardStyle}>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <IconUser className="w-5 h-5 text-text-secondary shrink-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-text-primary">{r.customer_name}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <IconPhone className="w-5 h-5 text-text-secondary shrink-0" aria-hidden="true" />
                    <p className="text-sm text-text-primary">{r.customer_phone}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <IconCalendar className="w-5 h-5 text-text-secondary shrink-0" aria-hidden="true" />
                    <div className="flex gap-2 text-sm">
                      <span className="text-text-primary">{formatDate(r.fecha_inicio)}</span>
                      <span className="text-text-tertiary">→</span>
                      <span
                        className="font-medium"
                        style={{ color: vencida ? 'var(--danger)' : 'var(--text-primary)' }}
                      >
                        {formatDate(r.fecha_fin)}
                      </span>
                    </div>
                  </div>

                  {vencida && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}>
                      <IconAlertTriangle className="w-4 h-4" aria-hidden="true" />
                      <span className="font-medium">Fecha de devolucion vencida</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleFinalizarRental(r.rental_id)}
                  disabled={updatingId === r.rental_id}
                  className="w-full py-3 font-semibold rounded-[14px] transition-all hover:brightness-125 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    border: '1px solid var(--success-border)',
                    color: 'var(--success)',
                    background: 'var(--success-bg)',
                  }}
                >
                  <IconCheck className="w-5 h-5" aria-hidden="true" />
                  {updatingId === r.rental_id ? 'Actualizando...' : 'Marcar como devuelto'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <p className="text-sm text-center font-medium" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full py-3 font-semibold rounded-[14px] transition-all hover:brightness-125 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{
          border: '1px solid var(--danger-border)',
          color: 'var(--danger)',
          background: 'var(--danger-bg)',
        }}
      >
        <IconTrash className="w-5 h-5" aria-hidden="true" />
        {deleting ? 'Eliminando...' : 'Eliminar prenda'}
      </button>
    </div>
  )
}
