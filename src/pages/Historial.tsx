import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Alquiler from './Alquiler'
import {
  IconArrowLeft, IconSearch, IconX, IconEdit,
  IconUser, IconPhone, IconId, IconMapPin,
  IconCalendar, IconCash, IconChevronRight,
} from '@tabler/icons-react'

interface RentalSummary {
  id: number
  codigo: string
  fecha_inicio: string
  fecha_fin: string
  monto_total: number
  abono: number
  estado: string
  vendedor: string
  cedula?: string
  direccion?: string
  quien_entrega?: string
  customers: { nombre: string; telefono: string } | null
}

interface RentalDetail {
  rental: RentalSummary
  items: { id: number; garment_id: number; precio: number; tipo: string; garments: any }[]
  pagos: { id: number; monto: number; fecha: string }[]
}

export default function Historial() {
  const navigate = useNavigate()
  const [rentals, setRentals] = useState<RentalSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'activas' | 'finalizadas'>('activas')
  const [viewingId, setViewingId] = useState<number | null>(null)
  const [editingActive, setEditingActive] = useState(false)
  const [detail, setDetail] = useState<RentalDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [devolviendo, setDevolviendo] = useState(false)

  useEffect(() => {
    fetchRentals()
  }, [])

  async function fetchRentals() {
    setLoading(true)
    const { data } = await supabase
      .from('rentals')
      .select('id, codigo, fecha_inicio, fecha_fin, monto_total, abono, estado, vendedor, cedula, direccion, quien_entrega, customers(nombre, telefono)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (data) setRentals(data as RentalSummary[])
    setLoading(false)
  }

  function openInvoice(id: number) {
    setViewingId(id)
    setEditingActive(true)
  }

  function goBack() {
    setViewingId(null)
    setEditingActive(false)
    setDetail(null)
  }

  async function handleDevolucion() {
    if (!detail) return
    if (!window.confirm('Registrar devolucion de todas las prendas alquiladas de esta factura?')) return

    setDevolviendo(true)
    const alquilerItems = detail.items.filter(i => i.tipo === 'alquiler')
    const alquilerIds = alquilerItems.map(i => i.garment_id)

    if (alquilerIds.length > 0) {
      // Buscar todos los rental_items activos para estas prendas
      const { data: todasRentas } = await supabase
        .from('rental_items')
        .select('garment_id, rental_id, rentals!inner(estado)')
        .in('garment_id', alquilerIds)
        .eq('rentals.estado', 'activo')

      // Contar cuantas rentas activas tiene cada prenda FUERA de esta factura
      const conteo: Record<number, number> = {}
      for (const r of (todasRentas || [])) {
        if (r.rental_id === detail.rental.id) continue // ignorar esta misma factura
        conteo[r.garment_id] = (conteo[r.garment_id] || 0) + 1
      }

      const idsParaDisponible = alquilerIds.filter(id => !conteo[id])
      const idsSigueOcupado = alquilerIds.filter(id => conteo[id])

      if (idsParaDisponible.length > 0) {
        await supabase.from('garments').update({ estado: 'disponible' }).in('id', idsParaDisponible)
      }
      // Las que aun tienen otros alquileres activos se quedan como 'ocupado'
      if (idsSigueOcupado.length > 0) {
        await supabase.from('garments').update({ estado: 'ocupado' }).in('id', idsSigueOcupado)
      }
    }
    await supabase.from('rentals').update({ estado: 'finalizado' }).eq('id', detail.rental.id)

    setDevolviendo(false)
    openInvoice(detail.rental.id)
    fetchRentals()
  }

  const activas = rentals.filter(r => r.estado === 'activo')
  const finalizadas = rentals.filter(r => r.estado === 'finalizado')

  const filtered = (tab === 'activas' ? activas : finalizadas).filter((r) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      r.codigo?.toLowerCase().includes(q) ||
      (r.customers as any)?.nombre?.toLowerCase().includes(q)
    )
  })

  const formatCOP = (n: number) =>
    n.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })

  const getCustomer = (r: RentalSummary) => {
    if (!r.customers) return { nombre: 'Sin cliente', telefono: '' }
    if (Array.isArray(r.customers)) return r.customers[0] || { nombre: 'Sin cliente', telefono: '' }
    return r.customers
  }

  // ====== VISTA DE FACTURA DETALLE ======
  if (viewingId && !editingActive) {
    if (loadingDetail || !detail) {
      return (
        <div className="text-center py-12">
          <p className="text-text-secondary">Cargando factura...</p>
        </div>
      )
    }

    const { rental, items, pagos } = detail
    const cust = getCustomer(rental)
    const deuda = (rental.monto_total || 0) - (rental.abono || 0)
    const cantAlq = items.filter(i => i.tipo === 'alquiler').length
    const cantVta = items.filter(i => i.tipo === 'venta').length
    const cardStyle = {
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      border: '1px solid var(--glass-border)',
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:brightness-125 transition-all"
              style={{
                background: 'var(--glass-strong)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
              aria-label="Volver"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-text-primary">Factura</h2>
          </div>
          <div className="flex items-center gap-2">
            {rental.estado === 'activo' && cantAlq > 0 && (
              <button
                onClick={handleDevolucion}
                disabled={devolviendo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{
                  background: 'var(--success-bg)',
                  border: '1px solid var(--success-border)',
                  color: 'var(--success)',
                }}
              >
                {devolviendo ? 'Devolviendo...' : 'Devolver'}
              </button>
            )}
            <button
              onClick={() => setEditingActive(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:brightness-110 text-white"
              style={{ background: 'var(--accent-glow)' }}
            >
              <IconEdit className="w-4 h-4" />
              Editar
            </button>
          </div>
        </div>

        {/* FAC-XXX encabezado */}
        <div
          className="rounded-[20px] p-5 text-center"
          style={{
            background: 'var(--accent-glow)',
            color: '#fff',
          }}
        >
          <p className="text-xs font-medium opacity-80 tracking-widest uppercase">Factura</p>
          <h1 className="text-2xl font-extrabold tracking-wide mt-1">{rental.codigo}</h1>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs opacity-90">
            <span className={`px-2 py-0.5 rounded-full font-semibold ${rental.estado === 'activo' ? 'bg-white/20' : 'bg-white/10'}`}>
              {rental.estado === 'activo' ? 'Activo' : 'Finalizado'}
            </span>
          </div>
        </div>

        {/* Datos del cliente y factura */}
        <div className="rounded-[20px] p-5 space-y-3" style={cardStyle}>
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <IconUser className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            Datos del cliente
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-tertiary">Nombre</p>
              <p className="font-medium text-text-primary">{cust.nombre}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Telefono</p>
              <p className="font-medium text-text-primary">{cust.telefono || '-'}</p>
            </div>
            {rental.cedula && (
              <div>
                <p className="text-xs text-text-tertiary">Cedula</p>
                <p className="font-medium text-text-primary">{rental.cedula}</p>
              </div>
            )}
            {rental.direccion && (
              <div>
                <p className="text-xs text-text-tertiary">Direccion</p>
                <p className="font-medium text-text-primary">{rental.direccion}</p>
              </div>
            )}
          </div>

          <div className="border-t pt-3" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-text-tertiary">Vendedor</p>
                <p className="font-medium text-text-primary">{rental.vendedor}</p>
              </div>
              {rental.quien_entrega && (
                <div>
                  <p className="text-xs text-text-tertiary">Quien entrega</p>
                  <p className="font-medium text-text-primary">{rental.quien_entrega}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-3" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <IconCalendar className="w-4 h-4 text-text-secondary" />
                <span className="text-text-primary font-medium">{rental.fecha_inicio}</span>
              </div>
              <span className="text-text-tertiary">→</span>
              <div className="flex items-center gap-1.5">
                <IconCalendar className="w-4 h-4 text-text-secondary" />
                <span className="text-text-primary font-medium">{rental.fecha_fin}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-[20px] p-5 space-y-3" style={cardStyle}>
          <h3 className="text-sm font-bold text-text-primary">
            Prendas ({items.length})
            {cantAlq > 0 && <span className="ml-2 text-xs font-normal text-text-secondary">{cantAlq} alquiler</span>}
            {cantVta > 0 && <span className="ml-1 text-xs font-normal text-text-secondary">{cantVta} venta</span>}
          </h3>
          <div className="space-y-1.5">
            {items.map((item: any) => {
              const g = item.garments
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[12px]"
                  style={{ background: 'rgba(0,0,0,0.02)' }}
                >
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                    style={{
                      background: item.tipo === 'alquiler' ? 'var(--accent-bg)' : 'rgba(100,100,100,0.1)',
                      color: item.tipo === 'alquiler' ? 'var(--accent)' : 'var(--text-secondary)',
                      border: item.tipo === 'alquiler' ? '1px solid var(--accent-border)' : '1px solid rgba(0,0,0,0.1)',
                    }}
                  >
                    {item.tipo === 'alquiler' ? 'ALQ' : 'VTA'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {g?.codigo || `#${item.garment_id}`}
                    </p>
                    {g?.nombre && (
                      <p className="text-xs text-text-tertiary truncate">{g.nombre}</p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-text-primary shrink-0">
                    {formatCOP(item.precio || 0)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pagos */}
        {pagos.length > 0 && (
          <div className="rounded-[20px] p-5 space-y-3" style={cardStyle}>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <IconCash className="w-4 h-4" style={{ color: 'var(--success)' }} />
              Abonos ({pagos.length})
            </h3>
            <div className="space-y-1.5">
              {pagos.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 rounded-[12px]"
                  style={{ background: 'rgba(0,0,0,0.02)' }}
                >
                  <span className="text-sm text-text-primary">{p.fecha}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
                    {formatCOP(p.monto)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totales */}
        <div
          className="rounded-[20px] p-5 space-y-3"
          style={{
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(50px) saturate(200%)',
            WebkitBackdropFilter: 'blur(50px) saturate(200%)',
            border: '1px solid rgba(0,0,0,0.10)',
          }}
        >
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Total</span>
            <span className="font-bold text-text-primary">{formatCOP(rental.monto_total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--success)' }}>Abonado</span>
            <span className="font-semibold" style={{ color: 'var(--success)' }}>{formatCOP(rental.abono)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between text-sm" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
            <span className="font-bold" style={{ color: deuda > 0 ? 'var(--danger)' : 'var(--success)' }}>Deuda</span>
            <span className="font-bold text-lg" style={{ color: deuda > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {formatCOP(deuda > 0 ? deuda : 0)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ====== MODO EDICION ======
  if (viewingId && editingActive) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={goBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:brightness-125 transition-all"
            style={{
              background: 'var(--glass-strong)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Volver al historial"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-text-primary">Editar factura</h2>
        </div>
        <Alquiler
          editRentalId={viewingId}
          inPopup={false}
          onSaved={() => {
            goBack()
            fetchRentals()
          }}
        />
      </div>
    )
  }

  // ====== LISTA DE FACTURAS ======
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
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
          <IconArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-text-primary">Historial de facturas</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('activas')}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{
            background: tab === 'activas' ? 'var(--accent)' : 'var(--glass-bg)',
            border: tab === 'activas' ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
            color: tab === 'activas' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          Activas ({activas.length})
        </button>
        <button
          onClick={() => setTab('finalizadas')}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{
            background: tab === 'finalizadas' ? 'var(--accent)' : 'var(--glass-bg)',
            border: tab === 'finalizadas' ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
            color: tab === 'finalizadas' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          Finalizadas ({finalizadas.length})
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <IconSearch
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por codigo FAC-XXX o nombre del cliente..."
          className="w-full rounded-[12px] pl-11 pr-10 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
          style={{
            background: 'var(--field-bg)',
            border: '1px solid var(--field-border)',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
            aria-label="Limpiar busqueda"
          >
            <IconX className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">Cargando facturas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-6xl mb-3 opacity-30">📄</p>
          <p className="text-text-secondary">
            {search ? 'Sin resultados' : 'No hay facturas registradas'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const deuda = (r.monto_total || 0) - (r.abono || 0)
            const cust = getCustomer(r)
            const isActivo = r.estado === 'activo'
            const pagado = deuda <= 0
            const pctPagado = r.monto_total > 0 ? Math.min(100, ((r.abono || 0) / r.monto_total) * 100) : 0
            const inicial = (cust.nombre || '?').charAt(0).toUpperCase()

            return (
              <button
                key={r.id}
                onClick={() => openInvoice(r.id)}
                className="w-full text-left rounded-[18px] overflow-hidden transition-all hover:-translate-y-0.5 active:scale-[0.995]"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.6) inset',
                }}
              >
                {/* Cabecera */}
                <div className="flex items-center gap-3 p-4 pb-3">
                  <div
                    className="w-11 h-11 shrink-0 rounded-[14px] flex items-center justify-center text-base font-bold"
                    style={{
                      background: isActivo
                        ? 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(34,197,94,0.06))'
                        : 'linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02))',
                      border: isActivo ? '1px solid var(--success-border)' : '1px solid rgba(0,0,0,0.06)',
                      color: isActivo ? 'var(--success)' : 'var(--text-secondary)',
                    }}
                  >
                    {inicial}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold tracking-widest uppercase text-text-secondary">
                        {r.codigo || `#${r.id}`}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                        style={{
                          background: isActivo ? 'var(--success-bg)' : 'rgba(0,0,0,0.04)',
                          color: isActivo ? 'var(--success)' : 'var(--text-tertiary)',
                          border: isActivo ? '1px solid var(--success-border)' : '1px solid rgba(0,0,0,0.06)',
                        }}
                      >
                        {r.estado}
                      </span>
                    </div>
                    <p className="text-[15px] font-semibold text-text-primary truncate">
                      {cust.nombre}
                    </p>
                  </div>

                  <IconChevronRight
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-hidden="true"
                  />
                </div>

                {/* Panel inferior */}
                <div
                  className="px-4 py-3 space-y-2.5"
                  style={{
                    background: 'rgba(0,0,0,0.025)',
                    borderTop: '1px solid var(--glass-border)',
                  }}
                >
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <IconCalendar className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    <span>{r.fecha_inicio} → {r.fecha_fin}</span>
                    {r.vendedor && (
                      <>
                        <span className="text-text-tertiary">·</span>
                        <span className="truncate text-text-tertiary">{r.vendedor}</span>
                      </>
                    )}
                  </div>

                  {r.monto_total > 0 && (
                    <div className="flex items-end justify-between gap-4 pt-0.5">
                    <div>
                      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">Total</p>
                      <p className="text-base font-bold text-text-primary">{formatCOP(r.monto_total)}</p>
                    </div>
                    <div className="text-right">
                      {pagado ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)' }}
                        >
                          Pagado
                        </span>
                      ) : (
                        <>
                          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">Deuda</p>
                          <p className="text-base font-bold" style={{ color: 'var(--danger)' }}>{formatCOP(deuda)}</p>
                        </>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
