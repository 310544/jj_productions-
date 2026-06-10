import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, CalendarBlank, WhatsappLogo, Trash, CheckCircle, Bell,
  Warning, Scissors, ClockCountdown, CurrencyDollar, EnvelopeSimple, PencilSimple,
} from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { compartirComprobante, enviarComprobanteCorreo } from '../lib/comprobante'
import type { Encargo, EstadoEncargo } from '../types'

const money = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const hoyISO = () => isoLocal(new Date())

// días hasta la entrega: >0 futuro, 0 hoy, <0 atrasado
const diasRestantes = (fecha: string) =>
  Math.round((new Date(fecha + 'T00:00:00').getTime() - new Date(hoyISO() + 'T00:00:00').getTime()) / 86400000)

const fechaLarga = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

const ESTADO_UI: Record<EstadoEncargo, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: '#b8860b', bg: 'rgba(184,134,11,0.14)' },
  listo: { label: 'Listo', color: '#1a7f4b', bg: 'rgba(26,127,75,0.12)' },
  entregado: { label: 'Entregado', color: '#6b6b6b', bg: 'rgba(0,0,0,0.06)' },
  cancelado: { label: 'Cancelado', color: '#c0392b', bg: 'rgba(224,107,107,0.12)' },
}

// activos = los que aún importan para el aviso
const esActivo = (e: Encargo) => e.estado === 'pendiente' || e.estado === 'listo'
const abonadoDe = (e: Encargo) => (e.encargo_pagos || []).reduce((s, p) => s + Number(p.monto), 0)

// Texto del tiempo que falta
function tiempoTexto(dias: number) {
  if (dias < 0) return { txt: `Atrasado ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`, urgente: true }
  if (dias === 0) return { txt: '¡Entrega hoy!', urgente: true }
  if (dias === 1) return { txt: 'Entrega mañana', urgente: true }
  return { txt: `Faltan ${dias} días`, urgente: dias <= 7 }
}

// Contador grande de días que faltan para la entrega
function DiasBadge({ dias }: { dias: number }) {
  const color = dias < 0 || dias === 0 ? '#c0392b' : dias <= 7 ? '#b8860b' : '#1a7f4b'
  const bg = dias < 0 || dias === 0 ? 'rgba(224,107,107,0.12)' : dias <= 7 ? 'rgba(184,134,11,0.12)' : 'rgba(26,127,75,0.10)'
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] px-2.5 py-2 shrink-0" style={{ background: bg, color, minWidth: 72 }}>
      {dias === 0 ? (
        <span className="text-[22px] font-bold leading-none" style={{ letterSpacing: '0.02em' }}>HOY</span>
      ) : (
        <>
          <span
            className="text-[38px] font-bold leading-none"
            style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.05em' }}
          >
            {Math.abs(dias)}
          </span>
          <span className="text-[9px] font-semibold uppercase mt-1.5" style={{ letterSpacing: '0.14em', opacity: 0.75 }}>
            {dias < 0 ? 'tarde' : dias === 1 ? 'día' : 'días'}
          </span>
        </>
      )}
    </div>
  )
}

const DEMO_ENC: Encargo[] = [
  { id: 1, codigo: 'TM 005', cliente_nombre: 'Diego Mora', cliente_telefono: '3105551234', descripcion: 'Frac gris para boda', notas: 'Pecho 98, cintura 84', precio: 950000, fecha_pedido: '2026-06-05', fecha_entrega: '2026-06-12', estado: 'pendiente', encargo_pagos: [{ id: 1, encargo_id: 1, monto: 300000, fecha: '2026-06-05' }] },
]

export default function Encargos() {
  const [encargos, setEncargos] = useState<Encargo[]>(DEMO_ENC)
  const [loading, setLoading] = useState(false)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [detalle, setDetalle] = useState<Encargo | null>(null)
  const [verEntregados, setVerEntregados] = useState(false)

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('encargos')
      .select('*, encargo_pagos(*)')
      .order('fecha_entrega', { ascending: true })
    setEncargos((data as Encargo[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { /* cargar() TEMP */ }, [cargar])

  // Avisos: activos que se entregan en ≤7 días o ya están atrasados
  const avisos = encargos
    .filter((e) => esActivo(e) && diasRestantes(e.fecha_entrega) <= 7)
    .sort((a, b) => diasRestantes(a.fecha_entrega) - diasRestantes(b.fecha_entrega))

  const visibles = encargos.filter((e) =>
    verEntregados ? true : e.estado !== 'entregado' && e.estado !== 'cancelado'
  )

  return (
    <div className="px-4 md:px-10 pt-6 md:pt-10 pb-16 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Scissors size={26} weight="light" /> Trajes a la medida
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Trajes mandados a hacer, con su entrega y abonos
          </p>
        </div>
        <button
          onClick={() => setNuevoOpen(true)}
          className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)', color: '#fff', boxShadow: '0 4px 16px rgba(184,134,11,0.30)' }}
        >
          <Plus size={18} weight="bold" /> Nuevo encargo
        </button>
      </div>

      {/* AVISO de próximos a entregar */}
      {avisos.length > 0 && (() => {
        const hayAtrasado = avisos.some((e) => diasRestantes(e.fecha_entrega) < 0)
        const glow = hayAtrasado ? '224,107,107' : '201,168,76'
        return (
        <motion.div
          className="rounded-[18px] p-4 mt-5 mb-2"
          style={{ background: hayAtrasado ? 'rgba(224,107,107,0.07)' : 'rgba(184,134,11,0.08)', border: `1px solid rgba(${glow},0.35)` }}
          animate={{ boxShadow: [
            `0 0 0 0 rgba(${glow},0)`,
            `0 0 0 5px rgba(${glow},0.18)`,
            `0 0 0 0 rgba(${glow},0)`,
          ] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <p className="text-sm font-bold flex items-center gap-2 mb-2.5" style={{ color: hayAtrasado ? '#c0392b' : '#8B6914' }}>
            <motion.span
              style={{ display: 'inline-block', transformOrigin: '50% 10%' }}
              animate={{ rotate: [0, -16, 13, -10, 7, -4, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
            >
              <Bell size={18} weight="fill" />
            </motion.span>
            Próximos a entregar ({avisos.length})
          </p>
          <div className="space-y-1.5">
            {avisos.map((e) => {
              const d = diasRestantes(e.fecha_entrega)
              const t = tiempoTexto(d)
              return (
                <button
                  key={e.id}
                  onClick={() => setDetalle(e)}
                  className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-[10px] transition-all active:scale-[0.99]"
                  style={{ background: 'var(--surface)' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{e.descripcion}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{e.codigo} · {e.cliente_nombre} · {fechaLarga(e.fecha_entrega)}</p>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={{ color: d < 0 ? '#c0392b' : '#8B6914', background: d < 0 ? 'rgba(224,107,107,0.14)' : 'rgba(184,134,11,0.14)' }}
                  >
                    {t.txt}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
        )
      })()}

      {/* Filtro */}
      <div className="flex items-center justify-between mt-5 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {verEntregados ? 'Todos los encargos' : 'Encargos activos'}
        </p>
        <button onClick={() => setVerEntregados((v) => !v)} className="text-xs font-semibold" style={{ color: '#8B6914' }}>
          {verEntregados ? 'Ver solo activos' : 'Ver todos'}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center py-16 text-sm" style={{ color: 'var(--text-tertiary)' }}>Cargando…</p>
      ) : visibles.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: '#A8823A' }}>
            <Scissors size={30} weight="light" />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {verEntregados ? 'No hay encargos registrados.' : 'No hay encargos activos.'}
          </p>
          <button onClick={() => setNuevoOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)', color: '#fff' }}>
            <Plus size={18} weight="bold" /> Nuevo encargo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibles.map((e) => {
            const est = ESTADO_UI[e.estado]
            const d = diasRestantes(e.fecha_entrega)
            const t = tiempoTexto(d)
            const saldo = e.precio - abonadoDe(e)
            const activo = esActivo(e)
            return (
              <button
                key={e.id}
                onClick={() => setDetalle(e)}
                className="flex gap-3 text-left rounded-[18px] p-4 transition-all active:scale-[0.98] hover:-translate-y-0.5"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', boxShadow: '0 3px 14px rgba(0,0,0,0.05)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold" style={{ color: 'var(--text-tertiary)' }}>{e.codigo}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: est.color, background: est.bg }}>{est.label}</span>
                  </div>
                  <p className="font-bold text-[15px] leading-tight" style={{ color: 'var(--text-primary)' }}>{e.descripcion}</p>
                  <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-tertiary)' }}>{e.cliente_nombre}</p>

                  <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: activo && t.urgente ? '#c0392b' : 'var(--text-secondary)' }}>
                    <CalendarBlank size={14} weight="bold" />
                    <span className="font-semibold capitalize">{fechaLarga(e.fecha_entrega)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 mt-1" style={{ borderTop: '1px solid var(--surface-border)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{money(e.precio)}</span>
                    {saldo > 0 ? (
                      <span className="text-xs font-bold" style={{ color: '#c0392b' }}>Debe {money(saldo)}</span>
                    ) : (
                      <span className="text-xs font-bold" style={{ color: '#1a7f4b' }}>Pagado ✓</span>
                    )}
                  </div>
                </div>

                {/* Contador grande de días (solo encargos activos) */}
                {activo && <DiasBadge dias={d} />}
              </button>
            )
          })}
        </div>
      )}

      {/* Botón flotante móvil */}
      <button
        onClick={() => setNuevoOpen(true)}
        className="md:hidden fixed right-5 bottom-28 z-30 w-14 h-14 flex items-center justify-center rounded-full active:scale-95"
        style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)', boxShadow: '0 6px 20px rgba(184,134,11,0.40)' }}
        aria-label="Nuevo encargo"
      >
        <Plus size={26} weight="bold" color="#fff" />
      </button>

      <AnimatePresence>
        {nuevoOpen && <EncargoFormModal onClose={() => setNuevoOpen(false)} onSaved={() => { setNuevoOpen(false); cargar() }} />}
        {detalle && (
          <DetalleEncargoModal
            encargo={detalle}
            onClose={() => setDetalle(null)}
            onChange={() => cargar()}
            onCloseAndRefresh={() => { setDetalle(null); cargar() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// Envoltorio de modal
// ============================================
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(28,25,20,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-[440px] max-h-[88vh] overflow-y-auto rounded-[24px] p-6"
        style={{ background: 'var(--surface)', border: '1px solid rgba(201,168,76,0.18)', boxShadow: '0 30px 80px rgba(28,20,8,0.28)', scrollbarWidth: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-all" style={{ color: 'var(--text-secondary)' }} aria-label="Cerrar">
          <X size={16} weight="light" />
        </button>
        {children}
      </motion.div>
    </motion.div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-[12px] text-sm focus:outline-none'
const inputStyle = { background: 'var(--main-bg)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' } as React.CSSProperties

// ============================================
// Crear / Editar encargo (mismo formulario)
// ============================================
function EncargoFormModal({ encargo, onClose, onSaved }: { encargo?: Encargo; onClose: () => void; onSaved: () => void }) {
  const editar = !!encargo
  const [nombre, setNombre] = useState(encargo?.cliente_nombre ?? '')
  const [telefono, setTelefono] = useState(encargo?.cliente_telefono ?? '')
  const [cedula, setCedula] = useState(encargo?.cliente_cedula ?? '')
  const [descripcion, setDescripcion] = useState(encargo?.descripcion ?? '')
  const [notas, setNotas] = useState(encargo?.notas ?? '')
  const [precio, setPrecio] = useState(encargo ? String(encargo.precio) : '')
  const [abono, setAbono] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState(encargo?.fecha_entrega ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function guardar() {
    setError('')
    if (!nombre.trim()) return setError('Escribe el nombre del cliente')
    if (!descripcion.trim()) return setError('Describe el traje')
    if (!Number(precio)) return setError('Escribe el precio')
    if (!fechaEntrega) return setError('Elige la fecha de entrega')
    setSaving(true)
    const campos = {
      cliente_nombre: nombre.trim(),
      cliente_telefono: telefono.trim() || null,
      cliente_cedula: cedula.trim() || null,
      descripcion: descripcion.trim(),
      notas: notas.trim() || null,
      precio: Number(precio),
      fecha_entrega: fechaEntrega,
    }
    if (editar) {
      const { error: err } = await supabase.from('encargos').update(campos).eq('id', encargo!.id)
      if (err) { setSaving(false); return setError('No se pudo guardar') }
    } else {
      const { data, error: err } = await supabase.from('encargos').insert(campos).select().single()
      if (err || !data) { setSaving(false); return setError('No se pudo guardar') }
      if (Number(abono) > 0) {
        await supabase.from('encargo_pagos').insert({ encargo_id: (data as any).id, monto: Number(abono) })
      }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
        {editar ? 'Editar encargo' : 'Nuevo traje a la medida'}
      </h2>
      <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>
        {editar ? `${encargo!.codigo} · corrige los datos del traje` : 'Registra el encargo y su fecha de entrega'}
      </p>

      <div className="space-y-3">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del cliente *" className={inputCls} style={inputStyle} />
        <div className="grid grid-cols-2 gap-3">
          <input value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="Teléfono" className={inputCls} style={inputStyle} />
          <input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Cédula" className={inputCls} style={inputStyle} />
        </div>
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="El traje (ej: Smoking negro a la medida) *" className={inputCls} style={inputStyle} />
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Medidas / notas (opcional)" rows={2} className={inputCls} style={{ ...inputStyle, resize: 'none' }} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Precio *</label>
            <input value={precio ? Number(precio).toLocaleString('es-CO') : ''} onChange={(e) => setPrecio(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="0" className={`${inputCls} mt-1`} style={inputStyle} />
          </div>
          {!editar && (
            <div>
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Abono inicial</label>
              <input value={abono ? Number(abono).toLocaleString('es-CO') : ''} onChange={(e) => setAbono(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="0" className={`${inputCls} mt-1`} style={inputStyle} />
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Fecha de entrega *</label>
          <input type="date" value={fechaEntrega} min={editar ? undefined : hoyISO()} onChange={(e) => setFechaEntrega(e.target.value)} className={`${inputCls} mt-1`} style={{ ...inputStyle, colorScheme: 'light' }} />
        </div>
        {error && <p className="text-xs font-medium" style={{ color: '#e06b6b' }}>{error}</p>}
      </div>

      <button onClick={guardar} disabled={saving} className="w-full mt-5 py-3 rounded-[12px] text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)', color: '#fff' }}>
        {saving ? 'Guardando…' : editar ? 'Guardar cambios' : 'Guardar encargo'}
      </button>
    </Modal>
  )
}

// ============================================
// Detalle del encargo
// ============================================
function DetalleEncargoModal({ encargo, onClose, onChange, onCloseAndRefresh }: {
  encargo: Encargo; onClose: () => void; onChange: () => void; onCloseAndRefresh: () => void
}) {
  const [enc, setEnc] = useState<Encargo>(encargo)
  const [nuevoAbono, setNuevoAbono] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [editando, setEditando] = useState(false)

  const pagos = (enc.encargo_pagos || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha))
  const abonado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const saldo = enc.precio - abonado
  const est = ESTADO_UI[enc.estado]
  const d = diasRestantes(enc.fecha_entrega)
  const t = tiempoTexto(d)

  async function recargar() {
    const { data } = await supabase.from('encargos').select('*, encargo_pagos(*)').eq('id', enc.id).single()
    if (data) setEnc(data as Encargo)
    onChange()
  }

  async function agregarAbono() {
    const m = Number(nuevoAbono)
    if (!m || m <= 0) return
    if (m > saldo) return
    setBusy(true)
    await supabase.from('encargo_pagos').insert({ encargo_id: enc.id, monto: m })
    setNuevoAbono('')
    await recargar()
    setBusy(false)
  }

  async function cambiarEstado(nuevo: EstadoEncargo) {
    setBusy(true)
    await supabase.from('encargos').update({ estado: nuevo }).eq('id', enc.id)
    await recargar()
    setBusy(false)
  }

  async function eliminar() {
    setBusy(true)
    await supabase.from('encargos').delete().eq('id', enc.id)
    onCloseAndRefresh()
  }

  function datosComprobante() {
    return {
      codigo: enc.codigo,
      cliente: enc.cliente_nombre,
      cedula: enc.cliente_cedula || '',
      telefono: enc.cliente_telefono || '',
      vendedor: '',
      prendas: [{ codigo: enc.codigo, nombre: enc.descripcion, tipo: 'venta', precio: enc.precio }],
      pagos: pagos.map((p) => ({ fecha: p.fecha, monto: Number(p.monto) })),
      total: enc.precio,
      abonado,
      fechaInicio: enc.fecha_pedido,
      fechaFin: enc.fecha_entrega,
      subtitulo: 'Traje a la medida',
      footer: `Pedido ${enc.fecha_pedido}   ·   Entrega ${enc.fecha_entrega}`,
    }
  }
  const facturaWhatsapp = () => compartirComprobante(datosComprobante())
  const facturaCorreo = () => enviarComprobanteCorreo(datosComprobante())

  return (
    <Modal onClose={onClose}>
      {/* Botón Editar arriba (dorado), a la izquierda de la X */}
      <button
        onClick={() => setEditando(true)}
        disabled={busy}
        className="absolute top-3.5 right-14 flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold transition-all active:scale-95 hover:brightness-110"
        style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)', color: '#fff', boxShadow: '0 3px 10px rgba(184,134,11,0.30)' }}
      >
        <PencilSimple size={14} weight="bold" /> Editar
      </button>

      <div className="flex items-center gap-2 mb-1 pr-28">
        <span className="text-[11px] font-bold" style={{ color: 'var(--text-tertiary)' }}>{enc.codigo}</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: est.color, background: est.bg }}>{est.label}</span>
      </div>
      <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{enc.descripcion}</h2>
      <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{enc.cliente_nombre}{enc.cliente_telefono ? ` · ${enc.cliente_telefono}` : ''}</p>
      {enc.notas && <p className="text-xs mt-2 p-2.5 rounded-[10px]" style={{ background: 'var(--main-bg)', color: 'var(--text-secondary)' }}>{enc.notas}</p>}

      {/* Entrega */}
      <div className="flex items-center gap-2 mt-3 p-3 rounded-[12px]" style={{ background: esActivo(enc) && t.urgente ? 'rgba(224,107,107,0.08)' : 'var(--main-bg)' }}>
        <ClockCountdown size={20} weight="light" style={{ color: esActivo(enc) && t.urgente ? '#c0392b' : '#A8823A' }} />
        <div>
          <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{fechaLarga(enc.fecha_entrega)}</p>
          {esActivo(enc) && <p className="text-[11px] font-semibold" style={{ color: t.urgente ? '#c0392b' : 'var(--text-tertiary)' }}>{t.txt}</p>}
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="p-2.5 rounded-[12px]" style={{ background: 'var(--main-bg)' }}>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Precio</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{money(enc.precio)}</p>
        </div>
        <div className="p-2.5 rounded-[12px]" style={{ background: 'var(--main-bg)' }}>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Abonado</p>
          <p className="text-sm font-bold" style={{ color: '#1a7f4b' }}>{money(abonado)}</p>
        </div>
        <div className="p-2.5 rounded-[12px]" style={{ background: 'var(--main-bg)' }}>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Saldo</p>
          <p className="text-sm font-bold" style={{ color: saldo > 0 ? '#c0392b' : '#1a7f4b' }}>{money(saldo)}</p>
        </div>
      </div>

      {/* Abonos */}
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Abonos</p>
        {pagos.length > 0 && (
          <div className="space-y-1 mb-2">
            {pagos.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm px-3 py-1.5 rounded-[10px]" style={{ background: 'var(--main-bg)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>{p.fecha}</span>
                <span className="font-semibold" style={{ color: '#1a7f4b' }}>{money(Number(p.monto))}</span>
              </div>
            ))}
          </div>
        )}
        {saldo > 0 && enc.estado !== 'cancelado' && (
          <div className="flex gap-2">
            <input
              value={nuevoAbono ? Number(nuevoAbono).toLocaleString('es-CO') : ''}
              onChange={(e) => setNuevoAbono(e.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric" placeholder={`Abonar (máx ${money(saldo)})`}
              className={inputCls} style={inputStyle}
            />
            <button onClick={agregarAbono} disabled={busy || !Number(nuevoAbono)} className="px-4 rounded-[12px] text-sm font-semibold shrink-0 disabled:opacity-50" style={{ background: 'rgba(26,127,75,0.12)', color: '#1a7f4b' }}>
              <CurrencyDollar size={18} weight="bold" />
            </button>
          </div>
        )}
      </div>

      {/* Cambiar estado */}
      <div className="flex flex-wrap gap-2 mt-4">
        {enc.estado === 'pendiente' && (
          <button onClick={() => cambiarEstado('listo')} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs font-semibold" style={{ background: 'rgba(26,127,75,0.12)', color: '#1a7f4b' }}>
            <CheckCircle size={16} weight="bold" /> Marcar listo
          </button>
        )}
        {(enc.estado === 'pendiente' || enc.estado === 'listo') && (
          <button onClick={() => cambiarEstado('entregado')} disabled={busy} className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)' }}>
            <CheckCircle size={16} weight="bold" /> Entregado
          </button>
        )}
        {enc.estado === 'entregado' && (
          <button onClick={() => cambiarEstado('pendiente')} disabled={busy} className="px-3 py-2 rounded-[12px] text-xs font-semibold" style={{ background: 'var(--main-bg)', color: 'var(--text-secondary)' }}>
            Reabrir
          </button>
        )}
      </div>

      {/* Acciones: enviar factura */}
      <p className="text-xs font-semibold uppercase tracking-wider mt-5 mb-2" style={{ color: 'var(--text-tertiary)' }}>Enviar factura</p>
      <div className="flex gap-2">
        <button onClick={facturaWhatsapp} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-sm font-semibold text-white" style={{ background: '#25D366' }}>
          <WhatsappLogo size={18} weight="fill" /> WhatsApp
        </button>
        <button onClick={facturaCorreo} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-sm font-semibold text-white" style={{ background: '#D14836' }}>
          <EnvelopeSimple size={18} weight="bold" /> Correo
        </button>
        <button onClick={() => setConfirmarBorrar(true)} className="w-11 flex items-center justify-center rounded-[12px] shrink-0" style={{ background: 'rgba(224,107,107,0.10)', color: '#c0392b' }} aria-label="Eliminar">
          <Trash size={18} weight="bold" />
        </button>
      </div>

      {/* Formulario de edición */}
      <AnimatePresence>
        {editando && (
          <EncargoFormModal
            encargo={enc}
            onClose={() => setEditando(false)}
            onSaved={() => { setEditando(false); recargar() }}
          />
        )}
      </AnimatePresence>

      {/* Confirmación de borrado */}
      <AnimatePresence>
        {confirmarBorrar && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center p-5 rounded-[24px]"
            style={{ background: 'rgba(28,25,20,0.6)', backdropFilter: 'blur(4px)' }}
          >
            <div className="w-full rounded-[18px] p-5 text-center" style={{ background: 'var(--surface)' }}>
              <Warning size={36} weight="fill" color="#c0392b" className="mx-auto mb-2" />
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>¿Eliminar este encargo?</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Se borra el traje y sus abonos. No se puede deshacer.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmarBorrar(false)} className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold" style={{ background: 'var(--main-bg)', color: 'var(--text-primary)' }}>Cancelar</button>
                <button onClick={eliminar} disabled={busy} className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold text-white" style={{ background: '#c0392b' }}>Eliminar</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
