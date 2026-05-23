import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Prenda } from '../types'
import {
  IconX, IconUser, IconPhone, IconCalendar,
  IconTrash, IconArrowBack,
} from '@tabler/icons-react'

interface RentalDetail {
  rental_id: number
  customer_name: string
  customer_phone: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
}

interface Props {
  prenda: Prenda
  onClose: () => void
  onDelete: () => void
}

export default function GarmentModal({ prenda: initialPrenda, onClose, onDelete }: Props) {
  const [prenda, setPrenda] = useState(initialPrenda)
  const [rentals, setRentals] = useState<RentalDetail[]>([])
  const [loadingRentals, setLoadingRentals] = useState(false)
  const [returningId, setReturningId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPrenda(initialPrenda)
    setError(null)
    fetchRentals(initialPrenda.id)
  }, [initialPrenda])

  async function fetchRentals(garmentId: number) {
    setLoadingRentals(true)

    const { data: items } = await supabase
      .from('rental_items')
      .select('rental_id, rentals!inner(id, fecha_inicio, fecha_fin, customer_id, estado)')
      .eq('garment_id', garmentId)
      .order('fecha_inicio', { referencedTable: 'rentals', ascending: false })

    if (!items || items.length === 0) {
      setRentals([])
      setLoadingRentals(false)
      return
    }

    const detalles: RentalDetail[] = []
    for (const item of items) {
      const rental = Array.isArray(item.rentals) ? item.rentals[0] : item.rentals
      if (!rental) continue

      const { data: customer } = await supabase
        .from('customers')
        .select('nombre, telefono')
        .eq('id', rental.customer_id)
        .single()

      detalles.push({
        rental_id: rental.id,
        customer_name: customer?.nombre || '—',
        customer_phone: customer?.telefono || '—',
        fecha_inicio: rental.fecha_inicio,
        fecha_fin: rental.fecha_fin,
        estado: rental.estado,
      })
    }

    setRentals(detalles)
    setLoadingRentals(false)
  }

  async function handleDevolver(rental: RentalDetail) {
    if (!window.confirm(`Devolver prenda de "${rental.customer_name}"?`)) return

    setReturningId(rental.rental_id)
    setError(null)

    await supabase
      .from('rentals')
      .update({ estado: 'finalizado' })
      .eq('id', rental.rental_id)

    // Verificar si quedan alquileres activos
    const { data: activos } = await supabase
      .from('rental_items')
      .select('rental_id, rentals!inner(estado)')
      .eq('garment_id', prenda.id)
      .filter('rentals.estado', 'eq', 'activo')

    const quedanActivos = activos && activos.length > 0

    if (!quedanActivos) {
      await supabase
        .from('garments')
        .update({ estado: 'disponible' })
        .eq('id', prenda.id)
      setPrenda({ ...prenda, estado: 'disponible' })
    }

    setReturningId(null)
    fetchRentals(prenda.id)
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
      } catch { /* continuar */ }
    }

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

    onDelete()
  }

  const cardStyle = {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[380px] md:max-w-[500px] max-h-[85vh] overflow-y-auto rounded-[28px] px-4 pt-5 pb-6 space-y-4"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
          scrollbarWidth: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div className="flex items-center justify-between sticky top-0 z-10 pt-3 -mt-5 pb-2">
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

        {/* Imagen */}
        <div
          className="aspect-square rounded-[16px] flex items-center justify-center relative overflow-hidden"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
          {prenda.imagen_url ? (
            <img src={prenda.imagen_url} alt={prenda.nombre} className="w-full h-full object-cover" loading="eager" />
          ) : (
            <span className="text-7xl opacity-30">👔</span>
          )}
        </div>

        {/* Info basica */}
        <div>
          <p className="text-sm font-medium text-text-tertiary tracking-wide">{prenda.codigo}</p>
          <h2 className="text-xl font-bold text-text-primary mt-1">{prenda.nombre}</h2>
          {prenda.precio > 0 && (
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--accent)' }}>
              {prenda.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} / alquiler
            </p>
          )}
        </div>

        {/* Sin alquileres */}
        {!loadingRentals && rentals.length === 0 && (
          <div className="rounded-[16px] p-5 text-center" style={cardStyle}>
            <p className="text-4xl mb-2 opacity-30">✅</p>
            <p className="text-text-secondary font-medium">Sin alquileres registrados</p>
            <p className="text-text-tertiary text-sm mt-1">Lista para alquilar</p>
          </div>
        )}

        {/* Lista de alquileres */}
        {loadingRentals && (
          <p className="text-center text-text-secondary py-4">Cargando alquileres...</p>
        )}

        {!loadingRentals && rentals.map((r) => {
          const vencido = new Date(r.fecha_fin) < new Date()
          const activo = r.estado === 'activo'

          return (
            <div key={r.rental_id} className="rounded-[16px] p-4 space-y-3" style={cardStyle}>
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: activo
                      ? 'rgba(255,60,60,0.12)'
                      : 'rgba(255,255,255,0.06)',
                    color: activo ? '#ff3b3b' : 'var(--text-secondary)',
                  }}
                >
                  {activo ? 'Activo' : 'Finalizado'}
                </span>
                {vencido && activo && (
                  <span className="text-[10px] font-semibold" style={{ color: '#ff3b3b' }}>
                    Vencido
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconUser className="w-4 h-4 text-text-secondary shrink-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-text-primary">{r.customer_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <IconPhone className="w-4 h-4 text-text-secondary shrink-0" aria-hidden="true" />
                  <p className="text-sm text-text-primary">{r.customer_phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <IconCalendar className="w-4 h-4 text-text-secondary shrink-0" aria-hidden="true" />
                  <div className="flex gap-2 text-sm">
                    <span className="text-text-primary">
                      {new Date(r.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-text-tertiary">→</span>
                    <span className="font-medium" style={{ color: vencido && activo ? '#ff3b3b' : 'var(--text-primary)' }}>
                      {new Date(r.fecha_fin).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              </div>

              {activo && (
                <button
                  onClick={() => handleDevolver(r)}
                  disabled={returningId === r.rental_id}
                  className="w-full py-2.5 text-sm font-semibold rounded-[12px] transition-all hover:brightness-125 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    border: '1px solid var(--success-border)',
                    color: 'var(--success)',
                    background: 'var(--success-bg)',
                  }}
                >
                  <IconArrowBack className="w-4 h-4" aria-hidden="true" />
                  {returningId === r.rental_id ? 'Devolviendo...' : 'Registrar devolucion'}
                </button>
              )}
            </div>
          )
        })}

        {/* Error */}
        {error && (
          <p className="text-sm text-center font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        {/* Eliminar prenda */}
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

        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
      </div>
    </div>
  )
}
