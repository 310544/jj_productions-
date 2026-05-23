import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { formatDateShort } from '../lib/formatDate'
import type { Prenda, Categoria } from '../types'
import {
  IconX, IconUser, IconPhone, IconCalendar,
  IconTrash, IconArrowBack, IconEdit, IconCheck, IconUpload,
} from '@tabler/icons-react'

const CATEGORIAS: Categoria[] = ['Hombre', 'Mujer', 'Niño', 'Niña']

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
  const [editing, setEditing] = useState(false)
  const [editCodigo, setEditCodigo] = useState(initialPrenda.codigo)
  const [editNombre, setEditNombre] = useState(initialPrenda.nombre)
  const [editPrecio, setEditPrecio] = useState(String(initialPrenda.precio || ''))
  const [editCategoria, setEditCategoria] = useState<Categoria | ''>(initialPrenda.categoria || '')
  const [editImagen, setEditImagen] = useState<File | null>(null)
  const [editPreview, setEditPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rentals, setRentals] = useState<RentalDetail[]>([])
  const [loadingRentals, setLoadingRentals] = useState(false)
  const [returningId, setReturningId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPrenda(initialPrenda)
    setEditCodigo(initialPrenda.codigo)
    setEditNombre(initialPrenda.nombre)
    setEditPrecio(String(initialPrenda.precio || ''))
    setEditCategoria(initialPrenda.categoria || '')
    setEditing(false)
    setEditImagen(null)
    setEditPreview(null)
    setError(null)
    fetchRentals(initialPrenda.id)
  }, [initialPrenda])

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditImagen(file)
    setEditPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!editCodigo.trim() || !editNombre.trim()) {
      setError('Codigo y nombre son obligatorios')
      return
    }
    setSaving(true)
    setError(null)

    let imagen_url = prenda.imagen_url

    if (editImagen) {
      const ext = editImagen.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('prendas')
        .upload(path, editImagen)
      if (uploadError) {
        setError('Error al subir imagen: ' + uploadError.message)
        setSaving(false)
        return
      }
      const { data: publicData } = supabase.storage.from('prendas').getPublicUrl(path)
      imagen_url = publicData.publicUrl
    }

    const precio = parseFloat(editPrecio) || 0
    const { error: updateError } = await supabase
      .from('garments')
      .update({
        codigo: editCodigo.trim(),
        nombre: editNombre.trim(),
        precio,
        categoria: editCategoria || null,
        imagen_url,
      })
      .eq('id', prenda.id)

    if (updateError) {
      setError('Error al guardar: ' + updateError.message)
      setSaving(false)
      return
    }

    setPrenda({
      ...prenda,
      codigo: editCodigo.trim(),
      nombre: editNombre.trim(),
      precio,
      categoria: editCategoria || undefined,
      imagen_url,
    })
    setEditing(false)
    setEditImagen(null)
    setEditPreview(null)
    setSaving(false)
  }

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

  const inputStyle = {
    background: 'var(--field-bg)',
    border: '1px solid var(--field-border)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-[380px] md:max-w-[500px] max-h-[85vh] overflow-y-auto rounded-[28px] px-4 pt-5 pb-6 space-y-4"
        style={{
          background: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(50px) saturate(200%)',
          WebkitBackdropFilter: 'blur(50px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.30)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
          scrollbarWidth: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 z-10 pt-3 -mt-5 pb-2">
          <button
            onClick={() => {
              if (editing) {
                setEditing(false)
                setEditImagen(null)
                setEditPreview(null)
                setError(null)
              } else {
                onClose()
              }
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:brightness-125 transition-all"
            style={{
              background: 'var(--glass-strong)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
            aria-label={editing ? 'Cancelar edicion' : 'Cerrar'}
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
            {editing ? 'Editando' : prenda.estado}
          </span>
        </div>

        {/* Imagen */}
        <div
          className="aspect-square rounded-[16px] flex items-center justify-center relative overflow-hidden"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
          {editPreview ? (
            <img src={editPreview} alt="Preview" className="w-full h-full object-cover" />
          ) : prenda.imagen_url ? (
            <img src={prenda.imagen_url} alt={prenda.nombre} className="w-full h-full object-cover" loading="eager" />
          ) : (
            <span className="text-7xl opacity-30">👔</span>
          )}

          {editing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(0,0,0,0.35)' }}
            >
              <IconUpload className="w-8 h-8 text-white" />
              <span className="text-sm font-medium text-white">Cambiar foto</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* Info basica */}
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-tertiary">Codigo</label>
              <input
                type="text"
                value={editCodigo}
                onChange={(e) => setEditCodigo(e.target.value)}
                className="w-full rounded-[12px] px-4 py-2.5 text-sm text-text-primary mt-1 focus:outline-none focus:ring-2 focus:ring-accent/40"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary">Nombre</label>
              <input
                type="text"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                className="w-full rounded-[12px] px-4 py-2.5 text-sm text-text-primary mt-1 focus:outline-none focus:ring-2 focus:ring-accent/40"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary">Precio</label>
              <input
                type="text"
                inputMode="numeric"
                value={editPrecio}
                onChange={(e) => setEditPrecio(e.target.value.replace(/\D/g, ''))}
                placeholder="50000"
                className="w-full rounded-[12px] px-4 py-2.5 text-sm text-text-primary mt-1 focus:outline-none focus:ring-2 focus:ring-accent/40"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary">Categoria</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEditCategoria(editCategoria === cat ? '' : cat)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: editCategoria === cat ? 'var(--accent-bg)' : 'var(--glass-bg)',
                      border: editCategoria === cat ? '1px solid var(--accent-border)' : '1px solid var(--glass-border)',
                      color: editCategoria === cat ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-text-tertiary tracking-wide">{prenda.codigo}</p>
            <h2 className="text-xl font-bold text-text-primary mt-1">{prenda.nombre}</h2>
            {prenda.precio > 0 && (
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--accent)' }}>
                {prenda.precio.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })} / alquiler
              </p>
            )}
            {prenda.categoria && (
              <p className="text-xs text-text-tertiary mt-1">{prenda.categoria}</p>
            )}
          </div>
        )}

        {/* Sin alquileres */}
        {!editing && !loadingRentals && rentals.length === 0 && (
          <div className="rounded-[16px] p-5 text-center" style={cardStyle}>
            <p className="text-4xl mb-2 opacity-30">✅</p>
            <p className="text-text-secondary font-medium">Sin alquileres registrados</p>
            <p className="text-text-tertiary text-sm mt-1">Lista para alquilar</p>
          </div>
        )}

        {/* Lista de alquileres */}
        {!editing && loadingRentals && (
          <p className="text-center text-text-secondary py-4">Cargando alquileres...</p>
        )}

        {!editing && !loadingRentals && rentals.map((r) => {
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
                      {formatDateShort(r.fecha_inicio)}
                    </span>
                    <span className="text-text-tertiary">→</span>
                    <span className="font-medium" style={{ color: vencido && activo ? '#ff3b3b' : 'var(--text-primary)' }}>
                      {formatDateShort(r.fecha_fin)}
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

        {/* Botones */}
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 font-semibold rounded-[14px] transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 text-white"
              style={{ background: 'var(--accent)' }}
            >
              <IconCheck className="w-5 h-5" aria-hidden="true" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
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
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full py-3 font-semibold rounded-[14px] transition-all hover:brightness-110 flex items-center justify-center gap-2 text-white"
            style={{ background: 'var(--accent)' }}
          >
            <IconEdit className="w-5 h-5" aria-hidden="true" />
            Editar prenda
          </button>
        )}

        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
      </motion.div>
    </div>
  )
}
