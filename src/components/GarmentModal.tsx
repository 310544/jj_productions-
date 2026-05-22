import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Prenda } from '../types'
import {
  IconX, IconUser, IconPhone, IconCalendar,
  IconCheck, IconAlertTriangle, IconTrash,
} from '@tabler/icons-react'

interface RentalInfo {
  customer_name: string
  customer_phone: string
  fecha_inicio: string
  fecha_fin: string
  rental_id: number
}

interface Props {
  prenda: Prenda
  onClose: () => void
  onDelete: () => void
}

export default function GarmentModal({ prenda: initialPrenda, onClose, onDelete }: Props) {
  const [prenda, setPrenda] = useState(initialPrenda)
  const [rentalInfo, setRentalInfo] = useState<RentalInfo | null>(null)
  const [loadingRental, setLoadingRental] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPrenda(initialPrenda)
    setError(null)
    setRentalInfo(null)

    if (initialPrenda.estado === 'ocupado') {
      fetchRentalInfo(initialPrenda.id)
    }
  }, [initialPrenda])

  async function fetchRentalInfo(garmentId: number) {
    setLoadingRental(true)
    const { data: items } = await supabase
      .from('rental_items')
      .select('rental_id')
      .eq('garment_id', garmentId)

    if (items && items.length > 0) {
      const rentalIds = items.map((i) => i.rental_id)

      const { data: rentals } = await supabase
        .from('rentals')
        .select('id, fecha_inicio, fecha_fin, customer_id')
        .in('id', rentalIds)
        .eq('estado', 'activo')
        .limit(1)
        .single()

      if (rentals) {
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
    setLoadingRental(false)
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

  async function handleDelete() {
    if (!prenda) return
    if (!window.confirm(`Eliminar "${prenda.nombre}"? Esta accion no se puede deshacer.`)) return

    setDeleting(true)
    setError(null)

    if (prenda.imagen_url) {
      try {
        const url = new URL(prenda.imagen_url)
        const path = url.pathname.split('/').slice(2).join('/')
        await supabase.storage.from('prendas').remove([path])
      } catch { /* continuar aunque falle el borrado de imagen */ }
    }

    const { error: deleteError } = await supabase
      .from('garments')
      .delete()
      .eq('id', prenda.id)

    if (deleteError) {
      setError('Error al eliminar: ' + deleteError.message)
      setDeleting(false)
      return
    }

    onDelete()
  }

  const fechaVencida = rentalInfo && new Date(rentalInfo.fecha_fin) < new Date()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[380px] max-h-[85vh] overflow-y-auto rounded-[28px] px-4 pt-5 pb-6 space-y-4"
        style={{
          background: 'rgba(15,15,20,0.75)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          scrollbarWidth: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cerrar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:brightness-125 transition-all"
            style={{
              background: 'var(--glass-strong)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Cerrar"
          >
            <IconX className="w-5 h-5" />
          </button>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
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

        {/* Imagen */}
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
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-medium text-text-tertiary tracking-wide">
            {prenda.codigo}
          </p>
          <h2 className="text-xl font-bold text-text-primary mt-1">
            {prenda.nombre}
          </h2>
          {prenda.precio > 0 && (
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--accent)' }}>
              {prenda.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} / alquiler
            </p>
          )}
        </div>

        {/* Disponible */}
        {prenda.estado === 'disponible' && (
          <div
            className="rounded-[16px] p-5 text-center"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <p className="text-4xl mb-2 opacity-30">✅</p>
            <p className="text-text-secondary font-medium">Prenda disponible</p>
            <p className="text-text-tertiary text-sm mt-1">Lista para alquilar</p>
          </div>
        )}

        {/* Alquiler activo */}
        {loadingRental && (
          <p className="text-center text-text-secondary py-4">Cargando alquiler...</p>
        )}

        {rentalInfo && (
          <div
            className="rounded-[16px] p-5 space-y-4"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <h3 className="font-semibold text-text-primary">Alquiler activo</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <IconUser className="w-5 h-5 text-text-secondary shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium text-text-primary">{rentalInfo.customer_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <IconPhone className="w-5 h-5 text-text-secondary shrink-0" aria-hidden="true" />
                <p className="text-sm text-text-primary">{rentalInfo.customer_phone}</p>
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

        {/* Error */}
        {error && (
          <p className="text-sm text-center font-medium" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        {/* Eliminar */}
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

        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </div>
  )
}
