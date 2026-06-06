import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendUp, TrendDown, Scales, Plus, X, CaretLeft, CaretRight,
  Wallet, Receipt, Trash,
} from '@phosphor-icons/react'
import type { Gasto } from '../types'
import DatePicker from '../components/DatePicker'

interface DatoMes {
  mes: string
  ingresos: number
  gastos: number
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatCOP(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n}`
}
function formatCOPFull(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function monthRange(anio: number, m: number) {
  const inicio = `${anio}-${String(m + 1).padStart(2, '0')}-01`
  const lastDay = new Date(anio, m + 1, 0).getDate()
  const fin = `${anio}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { inicio, fin }
}

export default function Contabilidad() {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [serie, setSerie] = useState<DatoMes[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { fetchAnio() }, [anio])
  useEffect(() => { fetchGastosMes() }, [mes, anio])

  async function fetchAnio() {
    setLoading(true)
    const inicioAnio = `${anio}-01-01`
    const finAnio = `${anio}-12-31`

    const [{ data: rentals }, { data: gs }] = await Promise.all([
      supabase.from('rentals').select('monto_total, fecha_inicio')
        .gte('fecha_inicio', inicioAnio).lte('fecha_inicio', finAnio),
      supabase.from('gastos').select('monto, fecha')
        .gte('fecha', inicioAnio).lte('fecha', finAnio),
    ])

    const datos: DatoMes[] = MESES.map((m) => ({ mes: m, ingresos: 0, gastos: 0 }))
    for (const r of rentals || []) {
      const idx = parseInt((r as any).fecha_inicio.slice(5, 7), 10) - 1
      if (idx >= 0 && idx < 12) datos[idx].ingresos += (r as any).monto_total || 0
    }
    for (const g of gs || []) {
      const idx = parseInt((g as any).fecha.slice(5, 7), 10) - 1
      if (idx >= 0 && idx < 12) datos[idx].gastos += (g as any).monto || 0
    }
    setSerie(datos)
    setLoading(false)
  }

  async function fetchGastosMes() {
    const { inicio, fin } = monthRange(anio, mes)
    const { data } = await supabase
      .from('gastos').select('*')
      .gte('fecha', inicio).lte('fecha', fin)
      .order('fecha', { ascending: false })
    setGastos((data as Gasto[]) || [])
  }

  async function eliminarGasto(id: number) {
    await supabase.from('gastos').delete().eq('id', id)
    fetchGastosMes(); fetchAnio()
  }

  function prevMes() {
    if (mes === 0) { setMes(11); setAnio(a => a - 1) } else setMes(m => m - 1)
  }
  function nextMes() {
    if (mes === hoy.getMonth() && anio === hoy.getFullYear()) return
    if (mes === 11) { setMes(0); setAnio(a => a + 1) } else setMes(m => m + 1)
  }
  const esMesActual = mes === hoy.getMonth() && anio === hoy.getFullYear()

  const ingresosMes = serie[mes]?.ingresos || 0
  const gastosMes = serie[mes]?.gastos || 0
  const utilidadMes = ingresosMes - gastosMes
  const margen = ingresosMes > 0 ? Math.round((utilidadMes / ingresosMes) * 100) : 0

  const ingresosAnio = serie.reduce((s, d) => s + d.ingresos, 0)
  const gastosAnio = serie.reduce((s, d) => s + d.gastos, 0)
  const balanceAnio = ingresosAnio - gastosAnio
  const mesesConDato = serie.filter(d => d.ingresos > 0 || d.gastos > 0).length || 1
  const promIngreso = ingresosAnio / mesesConDato
  const promGasto = gastosAnio / mesesConDato

  return (
    <div className="px-4 md:px-8 pt-7 pb-16 space-y-6 w-full">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-medium text-text-tertiary tracking-wide">Resumen financiero</p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Contabilidad</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de mes compacto */}
          <div
            className="flex items-center rounded-full overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <button onClick={prevMes} className="w-9 h-9 flex items-center justify-center hover:bg-black/5 transition-all">
              <CaretLeft size={16} weight="bold" />
            </button>
            <span className="px-2 text-sm font-bold text-text-primary min-w-[96px] text-center">
              {MESES_FULL[mes].slice(0, 3)} {anio}
            </span>
            <button onClick={nextMes} disabled={esMesActual} className="w-9 h-9 flex items-center justify-center hover:bg-black/5 transition-all disabled:opacity-25">
              <CaretRight size={16} weight="bold" />
            </button>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 h-9 rounded-full text-sm font-semibold transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)', color: '#1C1A16', boxShadow: '0 4px 14px rgba(184,134,11,0.30)' }}
          >
            <Plus size={16} weight="bold" /> Gasto
          </button>
        </div>
      </div>

      {/* Fila superior: Balance hero + tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Hero Balance — smoking */}
        <div
          className="md:col-span-1 rounded-[20px] p-6 flex flex-col justify-between relative overflow-hidden"
          style={{ background: 'linear-gradient(150deg, #211C15 0%, #16130E 100%)', minHeight: 190, boxShadow: '0 6px 20px rgba(28,20,8,0.20)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Balance {anio}
            </span>
            <Wallet size={20} weight="light" color="#E8C766" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: '#fff' }}>
              {formatCOPFull(balanceAnio)}
            </p>
            <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: balanceAnio >= 0 ? '#7BE0A3' : '#FF9B9B' }}>
              {balanceAnio >= 0 ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
              Ingresos − Gastos del año
            </p>
          </div>
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', filter: 'blur(20px)' }} />
        </div>

        {/* Tarjetas mes */}
        <StatCard
          label="Ingresos"
          value={formatCOPFull(ingresosMes)}
          sub={`${MESES_FULL[mes]}`}
          icon={<TrendUp size={24} weight="light" />}
          accent="#15A36A"
        />
        <StatCard
          label="Gastos"
          value={formatCOPFull(gastosMes)}
          sub={`${gastos.length} registro${gastos.length === 1 ? '' : 's'}`}
          icon={<TrendDown size={24} weight="light" />}
          accent="#DC2626"
        />
        <StatCard
          label="Utilidad"
          value={formatCOPFull(utilidadMes)}
          sub={`Margen ${margen}%`}
          icon={<Scales size={24} weight="light" />}
          accent="#8B6914"
        />
      </div>

      {/* Gráfica Ingresos vs Gastos */}
      <div className="rounded-[20px] p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 10px 30px rgba(28,20,8,0.10), 0 2px 6px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-bold text-text-primary">Ingresos y Gastos</p>
            <p className="text-xs text-text-tertiary">Comparativa mensual {anio}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981' }} /> Ingresos
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F43F5E' }} /> Gastos
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-[240px] rounded-[14px] animate-pulse" style={{ background: 'var(--surface-2)' }} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={serie} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--surface-border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCOP} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                formatter={(v: number, name: string) => [formatCOPFull(v), name === 'ingresos' ? 'Ingresos' : 'Gastos']}
                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', fontSize: 12 }}
                cursor={{ stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#10B981" strokeWidth={2.5} fill="url(#gradIngresos)" dot={false} activeDot={{ r: 5, fill: '#10B981' }} />
              <Area type="monotone" dataKey="gastos" stroke="#F43F5E" strokeWidth={2.5} fill="url(#gradGastos)" dot={false} activeDot={{ r: 5, fill: '#F43F5E' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        <div className="flex items-center gap-8 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div>
            <p className="text-xs text-text-tertiary">Promedio ingreso</p>
            <p className="text-lg font-bold text-text-primary">{formatCOPFull(promIngreso)}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Promedio gasto</p>
            <p className="text-lg font-bold" style={{ color: '#F43F5E' }}>{formatCOPFull(promGasto)}</p>
          </div>
        </div>
      </div>

      {/* Lista de gastos del mes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
            Gastos — {MESES_FULL[mes]}
          </p>
          <button onClick={() => setModalOpen(true)} className="text-xs font-semibold" style={{ color: '#8B6914' }}>
            + Registrar
          </button>
        </div>

        {gastos.length === 0 ? (
          <div className="rounded-[16px] py-12 text-center" style={{ background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 10px 30px rgba(28,20,8,0.10), 0 2px 6px rgba(0,0,0,0.04)' }}>
            <Receipt size={32} weight="light" className="mx-auto mb-2 opacity-25" />
            <p className="text-sm font-medium text-text-secondary">Sin gastos en {MESES_FULL[mes]}</p>
            <p className="text-xs text-text-tertiary mt-0.5">Registra tus egresos para ver la utilidad real</p>
          </div>
        ) : (
          <div className="rounded-[16px] overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 10px 30px rgba(28,20,8,0.10), 0 2px 6px rgba(0,0,0,0.04)' }}>
            {gastos.map((g, i) => (
              <div
                key={g.id}
                className="flex items-center gap-3 px-4 py-3.5 group"
                style={{ background: 'var(--surface)', borderBottom: i < gastos.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
              >
                <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(220,38,38,0.08)' }}>
                  <TrendDown size={16} weight="light" style={{ color: '#DC2626' }} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{g.concepto}</p>
                  <p className="text-xs text-text-tertiary">{g.categoria ? `${g.categoria} · ` : ''}{g.fecha}</p>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: '#DC2626' }}>−{formatCOPFull(g.monto)}</p>
                <button
                  onClick={() => eliminarGasto(g.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Eliminar"
                >
                  <Trash size={15} weight="light" style={{ color: '#DC2626' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <GastoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultFecha={monthRange(anio, mes).inicio}
        onSaved={() => { setModalOpen(false); fetchGastosMes(); fetchAnio() }}
      />
    </div>
  )
}

function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string; sub: string; icon: React.ReactNode; accent: string
}) {
  return (
    <div
      className="rounded-[20px] p-6 flex flex-col gap-4"
      style={{
        background: `linear-gradient(150deg, ${accent}26 0%, transparent 55%), var(--glass-card-bg)`,
        backdropFilter: 'blur(16px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
        border: `1px solid ${accent}33`,
        minHeight: 190,
        boxShadow: `0 8px 28px ${accent}1F, inset 0 1px 0 var(--glass-card-highlight)`,
      }}
    >
      <span
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: `${accent}14`, color: accent }}
      >
        {icon}
      </span>
      <div className="mt-auto">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{label}</span>
        <p className="text-2xl font-bold leading-tight mt-1 text-text-primary">{value}</p>
        <p className="text-xs mt-1 text-text-tertiary">{sub}</p>
      </div>
    </div>
  )
}

export function GastoModal({ open, onClose, onSaved, defaultFecha }: {
  open: boolean; onClose: () => void; onSaved: () => void; defaultFecha: string
}) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(defaultFecha)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setConcepto(''); setMonto(''); setFecha(new Date().toISOString().split('T')[0]) }
  }, [open, defaultFecha])

  async function guardar() {
    const m = Number(monto)
    if (!concepto.trim() || !m || m <= 0) return
    setSaving(true)
    await supabase.from('gastos').insert({ concepto: concepto.trim(), categoria: null, monto: m, fecha })
    setSaving(false)
    onSaved()
  }

  const inputStyle = { background: 'var(--field-bg)', border: '1px solid var(--field-border)', color: 'var(--text-primary)' } as React.CSSProperties

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(28,25,20,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative w-full max-w-[420px] rounded-[24px] p-6"
            style={{ background: 'var(--surface)', border: '1px solid rgba(201,168,76,0.18)', boxShadow: '0 30px 80px rgba(28,20,8,0.28)' }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-all" aria-label="Cerrar" style={{ color: 'var(--text-secondary)' }}>
              <X size={16} weight="light" />
            </button>

            <h2 className="text-lg font-bold text-text-primary mb-0.5">Registrar gasto</h2>
            <p className="text-xs text-text-tertiary mb-5">Egreso del negocio</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary">Concepto</label>
                <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej: Tintorería, arriendo, hilos..."
                  className="w-full mt-1 px-4 py-2.5 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Monto</label>
                  <input value={monto ? Number(monto).toLocaleString('es-CO') : ''} onChange={(e) => setMonto(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="0"
                    className="w-full mt-1 px-4 py-2.5 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Fecha</label>
                  <div className="mt-1">
                    <DatePicker value={fecha} onChange={setFecha} />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={guardar}
              disabled={saving || !concepto.trim() || !Number(monto)}
              className="w-full mt-5 py-3 rounded-[12px] text-sm font-bold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)', color: '#1C1A16' }}
            >
              {saving ? 'Guardando...' : 'Guardar gasto'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
