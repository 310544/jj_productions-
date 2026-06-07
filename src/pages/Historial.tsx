import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compartirComprobante } from '../lib/comprobante'
import Alquiler from './Alquiler'
import {
  ArrowLeft, MagnifyingGlass, X, PencilSimple,
  User, Phone,
  CalendarBlank, Money, CaretRight, WhatsappLogo,
} from '@phosphor-icons/react'

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
  const [rentals, setRentals] = useState<RentalSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'activas' | 'finalizadas'>('activas')
  const [viewingId, setViewingId] = useState<number | null>(null)
  const [editingActive, setEditingActive] = useState(false)
  const [detail, setDetail] = useState<RentalDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [devolviendo, setDevolviendo] = useState(false)
  const [abonoMonto, setAbonoMonto] = useState('')
  const [abonando, setAbonando] = useState(false)

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

    if (data) setRentals(data as unknown as RentalSummary[])
    setLoading(false)
  }

  async function fetchDetail(id: number) {
    setLoadingDetail(true)
    const { data: rental } = await supabase
      .from('rentals')
      .select('id, codigo, fecha_inicio, fecha_fin, monto_total, abono, estado, vendedor, cedula, direccion, quien_entrega, customers(nombre, telefono)')
      .eq('id', id)
      .single()
    const { data: items } = await supabase
      .from('rental_items')
      .select('id, garment_id, precio, tipo, garments(codigo, nombre)')
      .eq('rental_id', id)
    const { data: pagos } = await supabase
      .from('pagos')
      .select('id, monto, fecha')
      .eq('rental_id', id)
      .order('fecha', { ascending: true })
    if (rental) {
      setDetail({ rental: rental as any, items: (items as any) || [], pagos: (pagos as any) || [] })
    }
    setLoadingDetail(false)
  }

  function openInvoice(id: number) {
    setViewingId(id)
    setEditingActive(false)
    setAbonoMonto('')
    fetchDetail(id)
  }

  async function handleAbonar() {
    if (!detail) return
    const monto = parseInt(abonoMonto) || 0
    if (monto <= 0) return
    setAbonando(true)
    const hoy = new Date().toISOString().slice(0, 10)
    await supabase.from('pagos').insert({ rental_id: detail.rental.id, monto, fecha: hoy })
    const { data: pagosSum } = await supabase.from('pagos').select('monto').eq('rental_id', detail.rental.id)
    const totalAbonado = pagosSum?.reduce((s, p) => s + p.monto, 0) || 0
    await supabase.from('rentals').update({ abono: totalAbonado }).eq('id', detail.rental.id)
    setAbonoMonto('')
    setAbonando(false)
    await fetchDetail(detail.rental.id)
    fetchRentals()
  }

  function goBack() {
    setViewingId(null)
    setEditingActive(false)
    setDetail(null)
  }

  const [enviandoWa, setEnviandoWa] = useState(false)

  async function enviarWhatsapp() {
    if (!detail) return
    const { rental, items, pagos } = detail
    const cust = getCustomer(rental)
    setEnviandoWa(true)
    await compartirComprobante({
      codigo: rental.codigo,
      cliente: cust.nombre || '',
      cedula: rental.cedula || '',
      telefono: cust.telefono || '',
      vendedor: rental.vendedor || '',
      direccion: rental.direccion,
      quienEntrega: rental.quien_entrega,
      prendas: items.map((i: any) => ({
        codigo: i.garments?.codigo || '',
        nombre: i.garments?.nombre || '',
        tipo: i.tipo,
        precio: i.precio || 0,
      })),
      pagos: (pagos || []).map((p: any) => ({ fecha: p.fecha, monto: p.monto })),
      total: rental.monto_total || 0,
      abonado: rental.abono || 0,
      fechaInicio: rental.fecha_inicio,
      fechaFin: rental.fecha_fin,
    })
    setEnviandoWa(false)
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

  const debe = (r: RentalSummary) => (r.monto_total || 0) - (r.abono || 0) > 0
  const activas = rentals.filter(debe)
  const finalizadas = rentals.filter(r => !debe(r))

  const filtered = (tab === 'activas' ? activas : finalizadas).filter((r) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      r.codigo?.toLowerCase().includes(q) ||
      (r.customers as any)?.nombre?.toLowerCase().includes(q)
    )
  })

  const formatCOP = (n: number) =>
    n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

  const getCustomer = (r: RentalSummary) => {
    if (!r.customers) return { nombre: 'Sin cliente', telefono: '' }
    if (Array.isArray(r.customers)) return r.customers[0] || { nombre: 'Sin cliente', telefono: '' }
    return r.customers
  }

  // ====== MODO EDICION ======
  if (viewingId && editingActive) {
    return (
      <div className="px-4 md:px-8 pt-7 pb-6 max-w-[680px] mx-auto w-full">
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
            <ArrowLeft className="w-5 h-5" />
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
    <div className="px-4 md:px-8 pt-7 pb-6 w-full space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-medium text-text-tertiary tracking-wide">Facturas registradas</p>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Historial</h2>
      </div>

      {/* Buscador + Tabs en una barra */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        {/* Tabs — control segmentado */}
        <div
          className="flex p-1 rounded-full shrink-0"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 14px rgba(28,20,8,0.07)' }}
        >
          {(['activas', 'finalizadas'] as const).map((t) => {
            const isActive = tab === t
            const count = t === 'activas' ? activas.length : finalizadas.length
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap"
                style={{
                  background: isActive ? 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: isActive ? '0 3px 10px rgba(184,134,11,0.28)' : 'none',
                }}
              >
                {t === 'activas' ? 'Activas' : 'Finalizadas'} ({count})
              </button>
            )
          })}
        </div>

        {/* Buscador */}
        <div className="relative flex-1">
          <MagnifyingGlass
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: '#B8860B' }}
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por codigo FAC-XXX o nombre del cliente..."
            className="w-full rounded-full pl-11 pr-10 py-3 text-base text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.07)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
              aria-label="Limpiar busqueda"
            >
              <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
        </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((r) => {
            const deuda = (r.monto_total || 0) - (r.abono || 0)
            const cust = getCustomer(r)
            const isActivo = r.estado === 'activo'
            const pagado = deuda <= 0
            const inicial = (cust.nombre || '?').charAt(0).toUpperCase()

            return (
              <button
                key={r.id}
                onClick={() => openInvoice(r.id)}
                className="group w-full text-left rounded-[20px] overflow-hidden
                           hover:-translate-y-[5px] active:scale-[0.995]
                           border border-black/[0.07] hover:border-[#C9A84C]/40
                           shadow-[0_2px_6px_rgba(0,0,0,0.05),0_12px_30px_rgba(28,20,8,0.12)]
                           hover:shadow-[0_22px_46px_rgba(168,130,58,0.20),0_8px_18px_rgba(0,0,0,0.08)]"
                style={{
                  background: 'var(--surface)',
                  transition:
                    'transform 450ms cubic-bezier(0.22,1,0.36,1), box-shadow 450ms cubic-bezier(0.22,1,0.36,1), border-color 450ms cubic-bezier(0.22,1,0.36,1)',
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

                  <CaretRight
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-hidden="true"
                  />
                </div>

                {/* Panel inferior */}
                <div
                  className="px-4 py-3.5 space-y-2.5"
                  style={{
                    background: 'transparent',
                    borderTop: '1px solid var(--surface-border)',
                  }}
                >
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <CalendarBlank className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
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

      {/* ====== POP-UP DE FACTURA ====== */}
      {viewingId && !editingActive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(20,17,11,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={goBack}
        >
          <div
            className="w-full max-w-[440px] max-h-[88vh] overflow-y-auto rounded-[24px]"
            style={{ background: 'var(--surface)', boxShadow: '0 30px 80px rgba(28,20,8,0.40)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {loadingDetail || !detail ? (
              <div className="p-12 text-center text-text-secondary">Cargando factura...</div>
            ) : (() => {
              const { rental, items } = detail
              const cust = getCustomer(rental)
              const deuda = (rental.monto_total || 0) - (rental.abono || 0)
              const cantAlq = items.filter((i) => i.tipo === 'alquiler').length
              return (
                <>
                  {/* Encabezado */}
                  <div
                    className="relative p-5 text-center"
                    style={{ background: 'linear-gradient(135deg, #231D15 0%, #14110B 100%)' }}
                  >
                    <button
                      onClick={goBack}
                      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:brightness-125 transition-all"
                      style={{ background: 'rgba(255,255,255,0.12)' }}
                      aria-label="Cerrar"
                    >
                      <X className="w-4 h-4" style={{ color: '#fff' }} />
                    </button>
                    <p className="text-[11px] font-medium tracking-widest uppercase" style={{ color: '#E8C766' }}>
                      Factura
                    </p>
                    <h1 className="text-2xl font-extrabold tracking-wide mt-0.5" style={{ color: '#fff' }}>
                      {rental.codigo}
                    </h1>
                    <span
                      className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                    >
                      {rental.estado === 'activo' ? 'Activo' : 'Finalizado'}
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Cliente */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-sm">
                        <User className="w-4 h-4 text-text-secondary shrink-0" />
                        <span className="font-medium text-text-primary">{cust.nombre}</span>
                      </div>
                      {cust.telefono && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Phone className="w-4 h-4 text-text-secondary shrink-0" />
                          <span className="text-text-primary">{cust.telefono}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 text-sm">
                        <CalendarBlank className="w-4 h-4 text-text-secondary shrink-0" />
                        <span className="text-text-primary">{rental.fecha_inicio} → {rental.fecha_fin}</span>
                      </div>
                    </div>

                    {/* Prendas */}
                    {items.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                          Prendas ({items.length})
                        </p>
                        {items.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-[12px]"
                            style={{ background: 'rgba(0,0,0,0.02)' }}
                          >
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                              style={{
                                background: item.tipo === 'alquiler' ? 'var(--accent-bg)' : 'rgba(100,100,100,0.1)',
                                color: item.tipo === 'alquiler' ? 'var(--accent)' : 'var(--text-secondary)',
                              }}
                            >
                              {item.tipo === 'alquiler' ? 'ALQ' : 'VTA'}
                            </span>
                            <span className="flex-1 min-w-0 text-sm text-text-primary truncate">
                              {item.garments?.codigo || `#${item.garment_id}`}
                              {item.garments?.nombre ? ` · ${item.garments.nombre}` : ''}
                            </span>
                            <span className="text-sm font-medium text-text-primary shrink-0">
                              {formatCOP(item.precio || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Totales */}
                    <div
                      className="rounded-[16px] p-4 space-y-2"
                      style={{ background: 'var(--surface-2)', border: '1px solid rgba(201,168,76,0.35)' }}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Total</span>
                        <span className="font-bold text-text-primary">{formatCOP(rental.monto_total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--success)' }}>Abonado</span>
                        <span className="font-semibold" style={{ color: 'var(--success)' }}>{formatCOP(rental.abono)}</span>
                      </div>
                      <div
                        className="border-t pt-2 flex justify-between items-center"
                        style={{ borderColor: 'rgba(201,168,76,0.30)' }}
                      >
                        <span className="font-bold" style={{ color: deuda > 0 ? 'var(--danger)' : 'var(--success)' }}>Debe</span>
                        <span
                          className="font-extrabold text-lg"
                          style={{ color: deuda > 0 ? 'var(--danger)' : 'var(--success)' }}
                        >
                          {formatCOP(deuda > 0 ? deuda : 0)}
                        </span>
                      </div>
                    </div>

                    {/* Abonar */}
                    {deuda > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Abonar</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={abonoMonto ? Number(abonoMonto).toLocaleString('es-CO') : ''}
                            onChange={(e) => setAbonoMonto(e.target.value.replace(/\D/g, ''))}
                            placeholder="50.000"
                            className="flex-1 rounded-[12px] px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                            style={{ background: 'var(--surface)', border: '1px solid var(--field-border)' }}
                          />
                          <button
                            onClick={handleAbonar}
                            disabled={abonando || !abonoMonto}
                            className="px-5 py-2.5 rounded-[12px] text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
                            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)' }}
                          >
                            <Money className="w-4 h-4" />
                            {abonando ? '...' : 'Abonar'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="space-y-2 pt-1">
                    {cust.telefono && (
                      <button
                        onClick={enviarWhatsapp}
                        disabled={enviandoWa}
                        className="w-full py-3 rounded-[14px] text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                      >
                        <WhatsappLogo className="w-4 h-4" />
                        {enviandoWa ? 'Generando...' : 'Enviar factura por WhatsApp'}
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingActive(true)}
                        className="flex-1 py-3 rounded-[14px] text-sm font-semibold text-white transition-all hover:brightness-110 flex items-center justify-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)' }}
                      >
                        <PencilSimple className="w-4 h-4" />
                        Editar factura
                      </button>
                      {rental.estado === 'activo' && cantAlq > 0 && (
                        <button
                          onClick={handleDevolucion}
                          disabled={devolviendo}
                          className="flex-1 py-3 rounded-[14px] text-sm font-semibold transition-all hover:brightness-105 disabled:opacity-50 flex items-center justify-center gap-1.5"
                          style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success)' }}
                        >
                          {devolviendo ? 'Devolviendo...' : 'Devolver prendas'}
                        </button>
                      )}
                    </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
