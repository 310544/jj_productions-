import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SignIn,
  ForkKnife,
  SignOut,
  CheckCircle,
  XCircle,
  Backspace,
  Gear,
  ArrowLeft,
  Plus,
  UserPlus,
  Power,
  CalendarBlank,
  Trash,
  Warning,
  CaretDown,
} from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import type { Empleada, Jornada, EstadoJornada, ResultadoMarca } from '../types'

const money = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '--:--'

// Minutos -> "8h 0m" / "45m"
const duracion = (min: number | null | undefined) => {
  if (min == null) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// Iniciales para el avatar (máx. 2 letras)
const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')

// Color del punto de estado (vistazo rápido)
const PUNTO: Record<EstadoJornada, string> = {
  trabajando_am: '#1a7f4b',
  almuerzo: '#d99a00',
  trabajando_pm: '#1a7f4b',
  cerrado: '#9a9a9a',
}

// Reloj en vivo (componente aislado: solo él se redibuja cada segundo)
function Reloj() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="tabular-nums">
      {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

const isoDe = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const hoyISO = () => isoDe(new Date())

// Fecha 'YYYY-MM-DD' -> texto corto "lun 9 jun"
const fechaCorta = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

// Rangos rápidos (devuelven { desde, hasta }) — 'hasta' nunca pasa de hoy
const rangos = {
  hoy: () => ({ desde: hoyISO(), hasta: hoyISO() }),
  semana: () => {
    const d = new Date()
    const lunes = new Date(d)
    lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // lunes de esta semana
    return { desde: isoDe(lunes), hasta: hoyISO() }
  },
  quincena: () => {
    const d = new Date()
    const ini = new Date(d.getFullYear(), d.getMonth(), d.getDate() <= 15 ? 1 : 16)
    return { desde: isoDe(ini), hasta: hoyISO() }
  },
  mes: () => {
    const d = new Date()
    return { desde: isoDe(new Date(d.getFullYear(), d.getMonth(), 1)), hasta: hoyISO() }
  },
}

const ADMIN_PIN = '3105' // mismo código que el resto de áreas protegidas

// Texto y color según el estado de la jornada de cada empleada
const ESTADO_UI: Record<EstadoJornada, { label: string; color: string; bg: string }> = {
  trabajando_am: { label: 'Trabajando', color: '#1a7f4b', bg: 'rgba(26,127,75,0.12)' },
  almuerzo: { label: 'En almuerzo', color: '#b8860b', bg: 'rgba(184,134,11,0.14)' },
  trabajando_pm: { label: 'Trabajando', color: '#1a7f4b', bg: 'rgba(26,127,75,0.12)' },
  cerrado: { label: 'Día cerrado', color: '#6b6b6b', bg: 'rgba(0,0,0,0.06)' },
}

type Accion = 'almuerzo' | 'salida' | null
interface OpcionMarca {
  label: string
  icon: React.ReactNode
  accion: Accion
  primaria?: boolean // se muestra con el botón dorado lleno
}

// Opciones de marca disponibles según el estado de la jornada.
// En 'trabajando_am' hay DOS: salir a almorzar o terminar el día directo.
function accionesDe(j?: Jornada): OpcionMarca[] {
  if (!j) return [{ label: 'Marcar entrada', icon: <SignIn size={18} weight="bold" />, accion: null, primaria: true }]
  switch (j.estado) {
    case 'trabajando_am':
      return [
        { label: 'Salir a almorzar', icon: <ForkKnife size={18} weight="bold" />, accion: 'almuerzo' },
        { label: 'Terminar día', icon: <SignOut size={18} weight="bold" />, accion: 'salida' },
      ]
    case 'almuerzo':
      return [{ label: 'Volver del almuerzo', icon: <SignIn size={18} weight="bold" />, accion: null, primaria: true }]
    case 'trabajando_pm':
      return [{ label: 'Terminar día', icon: <SignOut size={18} weight="bold" />, accion: null, primaria: true }]
    default:
      return []
  }
}

// Estilo del botón según la opción: dorado lleno (primaria), verde (terminar
// día) o dorado suave (salir a almorzar).
function estiloOpcion(op: OpcionMarca): React.CSSProperties {
  if (op.primaria)
    return { background: 'linear-gradient(135deg, #D4AF37, #A8823A)', color: '#fff', boxShadow: '0 3px 12px rgba(184,134,11,0.25)' }
  if (op.accion === 'salida')
    return { background: 'rgba(26,127,75,0.12)', color: '#1a7f4b' }
  return { background: 'rgba(201,168,76,0.14)', color: '#8B6914' }
}

export default function Asistencia() {
  const [empleadas, setEmpleadas] = useState<Empleada[]>([])
  const [jornadas, setJornadas] = useState<Jornada[]>([])
  const [loading, setLoading] = useState(true)
  // Empleada que está marcando + la opción que eligió (para el caso de 2 botones)
  const [marcando, setMarcando] = useState<{ emp: Empleada; opcion: OpcionMarca } | null>(null)
  const [resultado, setResultado] = useState<ResultadoMarca | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminGate, setAdminGate] = useState(false) // pidiendo PIN admin

  const cargar = useCallback(async () => {
    const [emp, jor] = await Promise.all([
      supabase.from('empleadas').select('*').eq('activo', true).order('nombre'),
      supabase.from('jornadas').select('*').eq('fecha', hoyISO()),
    ])
    if (emp.data) setEmpleadas(emp.data as Empleada[])
    if (jor.data) setJornadas(jor.data as Jornada[])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Reinicio diario automático: si el kiosco queda abierto y cruza la
  // medianoche, detecta el cambio de fecha y recarga (todas vuelven a
  // poder marcar entrada para el día nuevo). Revisa cada minuto.
  useEffect(() => {
    let dia = hoyISO()
    const t = setInterval(() => {
      const ahora = hoyISO()
      if (ahora !== dia) {
        dia = ahora
        cargar()
      }
    }, 60_000)
    return () => clearInterval(t)
  }, [cargar])

  const jornadaDe = (id: number) => jornadas.find((j) => j.empleada_id === id)

  async function marcar(pin: string) {
    const { data, error } = await supabase.rpc('registrar_marca', {
      p_pin: pin,
      p_accion: marcando?.opcion.accion ?? null,
    })
    const res: ResultadoMarca = error
      ? { ok: false, error: 'Error de conexión, intenta otra vez' }
      : (data as ResultadoMarca)
    setMarcando(null)
    setResultado(res)
    if (res.ok) cargar()
    // El resultado se cierra solo a los 3.5s (o al tocar)
    setTimeout(() => setResultado(null), 3500)
  }

  if (adminOpen) {
    return <AdminPanel onBack={() => { setAdminOpen(false); cargar() }} />
  }

  return (
    <div className="px-4 md:px-10 pt-6 md:pt-10 pb-10 max-w-5xl mx-auto">
      {/* Encabezado con reloj en vivo */}
      <div
        className="rounded-[22px] px-5 py-4 mb-6 flex items-center justify-between gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(168,130,58,0.05))',
          border: '1px solid rgba(201,168,76,0.22)',
        }}
      >
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
            Asistencia
          </h1>
          <p className="text-sm mt-1.5 capitalize" style={{ color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="text-lg md:text-3xl font-bold tracking-tight leading-none"
            style={{ color: '#A8823A' }}
          >
            <Reloj />
          </div>
          <button
            onClick={() => setAdminGate(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 hover:brightness-105"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
            aria-label="Administración"
          >
            <Gear size={20} weight="light" />
          </button>
        </div>
      </div>

      <p className="text-sm mb-5 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
        <SignIn size={15} weight="bold" /> Toca tu nombre y marca con tu PIN.
      </p>

      {loading ? (
        <p className="text-center py-16 text-sm" style={{ color: 'var(--text-tertiary)' }}>Cargando…</p>
      ) : empleadas.length === 0 ? (
        <div className="text-center py-16">
          <div
            className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(201,168,76,0.12)', color: '#A8823A' }}
          >
            <UserPlus size={30} weight="light" />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Todavía no hay empleadas registradas.
          </p>
          <button
            onClick={() => setAdminGate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)', color: '#fff', boxShadow: '0 4px 16px rgba(184,134,11,0.30)' }}
          >
            <UserPlus size={18} weight="bold" /> Agregar empleadas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          {empleadas.map((e) => {
            const j = jornadaDe(e.id)
            const estado = j ? ESTADO_UI[j.estado] : null
            const opciones = accionesDe(j)
            const cerrado = j?.estado === 'cerrado'
            return (
              <div
                key={e.id}
                className="flex flex-col text-left rounded-[20px] p-4 transition-all"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--surface-border)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  opacity: cerrado ? 0.72 : 1,
                }}
              >
                {/* Avatar + nombre + estado */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative shrink-0">
                    <div
                      className="w-11 h-11 flex items-center justify-center rounded-full text-sm font-bold"
                      style={{ background: '#ffffff', color: '#A8823A', border: '1.5px solid rgba(201,168,76,0.6)' }}
                    >
                      {iniciales(e.nombre)}
                    </div>
                    {j && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                        style={{ background: PUNTO[j.estado], borderColor: 'var(--surface)' }}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[15px] leading-tight line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {e.nombre}
                    </p>
                    {estado && (
                      <span
                        className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1"
                        style={{ color: estado.color, background: estado.bg }}
                      >
                        {estado.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Horas marcadas */}
                {j && (
                  <div className="text-[11px] space-y-0.5 mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    <p>Entrada: {hora(j.hora_entrada)}</p>
                    {j.inicio_almuerzo && <p>Almuerzo: {hora(j.inicio_almuerzo)} – {hora(j.fin_almuerzo)}</p>}
                    {j.hora_salida && <p>Salida: {hora(j.hora_salida)}</p>}
                  </div>
                )}

                {/* Pago del día (cerrado) o botón(es) de acción */}
                <div className="mt-auto space-y-2">
                  {cerrado && j?.pago != null ? (
                    <div
                      className="py-2 px-3 rounded-[12px]"
                      style={{ background: 'rgba(26,127,75,0.10)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold" style={{ color: '#1a7f4b' }}>Pago de hoy</span>
                        <span className="text-sm font-bold" style={{ color: '#1a7f4b' }}>{money(j.pago)}</span>
                      </div>
                      {j.minutos_trabajados != null && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#1a7f4b', opacity: 0.75 }}>
                          {duracion(j.minutos_trabajados)} trabajadas
                        </p>
                      )}
                    </div>
                  ) : (
                    opciones.map((op) => (
                      <button
                        key={op.label}
                        onClick={() => setMarcando({ emp: e, opcion: op })}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-xs font-bold transition-all active:scale-[0.97]"
                        style={estiloOpcion(op)}
                      >
                        {op.icon} {op.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Teclado de PIN para marcar */}
      <AnimatePresence>
        {marcando && (
          <PinPad
            titulo={marcando.emp.nombre}
            subtitulo={marcando.opcion.label}
            onClose={() => setMarcando(null)}
            onSubmit={marcar}
          />
        )}
      </AnimatePresence>

      {/* Resultado de la marca */}
      <AnimatePresence>
        {resultado && (
          <ResultadoModal res={resultado} onClose={() => setResultado(null)} />
        )}
      </AnimatePresence>

      {/* PIN de administración */}
      <AnimatePresence>
        {adminGate && (
          <PinPad
            titulo="Administración"
            subtitulo="Ingresa el PIN de administrador"
            onClose={() => setAdminGate(false)}
            onSubmit={(pin) => {
              if (pin === ADMIN_PIN) {
                setAdminGate(false)
                setAdminOpen(true)
              } else {
                throw new Error('PIN incorrecto')
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// Teclado numérico de PIN (reutilizable)
// ============================================
function PinPad({
  titulo,
  subtitulo,
  onClose,
  onSubmit,
}: {
  titulo: string
  subtitulo: string
  onClose: () => void
  onSubmit: (pin: string) => void | Promise<void>
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  // Cuando se completan los 4 dígitos, enviar automáticamente.
  useEffect(() => {
    if (pin.length !== 4 || busy || error) return
    let cancelado = false
    ;(async () => {
      setBusy(true)
      try {
        await onSubmit(pin)
      } catch {
        if (!cancelado) {
          setError(true)
          setTimeout(() => { setPin(''); setError(false) }, 700)
        }
      } finally {
        if (!cancelado) setBusy(false)
      }
    })()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  function press(d: string) {
    if (busy || error) return
    setPin((prev) => (prev.length >= 4 ? prev : prev + d))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(28,25,20,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0, x: error ? [0, -10, 10, -8, 8, -4, 4, 0] : 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-[340px] rounded-[28px] px-6 pt-8 pb-7 text-center"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.30)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{titulo}</h2>
        <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-secondary)' }}>{subtitulo}</p>

        {/* Puntos del PIN */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full transition-all"
              style={{
                background: error
                  ? '#e06b6b'
                  : i < pin.length
                  ? 'linear-gradient(135deg, #D4AF37, #A8823A)'
                  : 'var(--surface-border)',
              }}
            />
          ))}
        </div>

        {/* Teclado */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <KeyBtn key={d} onClick={() => press(d)}>{d}</KeyBtn>
          ))}
          <div />
          <KeyBtn onClick={() => press('0')}>0</KeyBtn>
          <KeyBtn onClick={() => !busy && setPin((p) => p.slice(0, -1))} aria-label="Borrar">
            <Backspace size={22} weight="light" />
          </KeyBtn>
        </div>
      </motion.div>
    </motion.div>
  )
}

function KeyBtn({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      {...rest}
      className="h-14 rounded-[16px] text-2xl font-semibold flex items-center justify-center transition-all active:scale-95"
      style={{ background: 'var(--main-bg)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
    >
      {children}
    </button>
  )
}

// ============================================
// Modal de resultado tras marcar
// ============================================
function ResultadoModal({ res, onClose }: { res: ResultadoMarca; onClose: () => void }) {
  const titulos: Record<string, string> = {
    entrada: '¡Entrada registrada!',
    inicio_almuerzo: '¡Buen provecho!',
    fin_almuerzo: '¡Bienvenida de vuelta!',
    salida: '¡Día cerrado!',
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(28,25,20,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-[340px] rounded-[28px] px-7 py-9 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', boxShadow: '0 24px 70px rgba(0,0,0,0.30)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {res.ok ? (
          <>
            <CheckCircle size={64} weight="fill" color="#1a7f4b" className="mx-auto mb-3" />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {titulos[res.accion ?? ''] ?? 'Listo'}
            </h2>
            {res.empleada && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{res.empleada}</p>
            )}
            {res.hora && (
              <p className="text-3xl font-bold mt-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {hora(res.hora)}
              </p>
            )}
            {res.accion === 'salida' && res.pago != null && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Pago de hoy</p>
                <p className="text-3xl font-bold mt-1" style={{ color: '#1a7f4b' }}>{money(res.pago)}</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {Math.floor((res.minutos ?? 0) / 60)}h {(res.minutos ?? 0) % 60}m trabajadas
                  {res.almuerzo_min ? ` · ${res.almuerzo_min}m almuerzo` : ''}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <XCircle size={64} weight="fill" color="#e06b6b" className="mx-auto mb-3" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{res.error}</h2>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ============================================
// Panel de administración: empleadas + reporte
// ============================================
function AdminPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'reporte' | 'empleadas'>('reporte')

  return (
    <div className="px-4 md:px-10 pt-6 md:pt-10 pb-10 max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition-all active:scale-95"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowLeft size={18} weight="bold" /> Volver
      </button>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-5" style={{ color: 'var(--text-primary)' }}>
        Administración
      </h1>

      {/* Pestañas */}
      <div className="flex gap-2 mb-6">
        {(['reporte', 'empleadas'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={
              tab === t
                ? { background: 'linear-gradient(135deg, #D4AF37, #A8823A)', color: '#fff' }
                : { background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }
            }
          >
            {t === 'reporte' ? 'Reporte de pago' : 'Empleadas'}
          </button>
        ))}
      </div>

      {tab === 'reporte' ? <Reporte /> : <GestionEmpleadas />}
    </div>
  )
}

type Preset = 'hoy' | 'semana' | 'quincena' | 'mes' | 'personalizado'

function Reporte() {
  const [preset, setPreset] = useState<Preset>('hoy')
  const [desde, setDesde] = useState(hoyISO())
  const [hasta, setHasta] = useState(hoyISO())
  const [jornadas, setJornadas] = useState<Jornada[]>([])
  const [loading, setLoading] = useState(true)
  const [abierta, setAbierta] = useState<number | null>(null) // empleada desplegada

  function aplicarPreset(p: Exclude<Preset, 'personalizado'>) {
    const r = rangos[p]()
    setPreset(p)
    setDesde(r.desde)
    setHasta(r.hasta)
  }

  useEffect(() => {
    setLoading(true)
    supabase
      .from('jornadas')
      .select('*, empleadas(nombre)')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .then(({ data }) => {
        setJornadas((data as Jornada[]) ?? [])
        setLoading(false)
      })
  }, [desde, hasta])

  // Agrupar por empleada: total del periodo + sus días
  const grupos = useMemo(() => {
    const m = new Map<number, { nombre: string; total: number; dias: Jornada[] }>()
    for (const j of jornadas) {
      if (!m.has(j.empleada_id))
        m.set(j.empleada_id, { nombre: j.empleadas?.nombre ?? '—', total: 0, dias: [] })
      const g = m.get(j.empleada_id)!
      g.dias.push(j)
      if (j.estado === 'cerrado' && j.pago != null) g.total += Number(j.pago)
    }
    return [...m.entries()]
      .map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [jornadas])

  const totalGeneral = grupos.reduce((s, g) => s + g.total, 0)
  const pendientes = jornadas.filter((j) => j.estado !== 'cerrado').length
  const unDia = desde === hasta

  const PRESETS: { k: Exclude<Preset, 'personalizado'>; label: string }[] = [
    { k: 'hoy', label: 'Hoy' },
    { k: 'semana', label: 'Esta semana' },
    { k: 'quincena', label: 'Quincena' },
    { k: 'mes', label: 'Este mes' },
  ]

  return (
    <div>
      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p.k}
            onClick={() => aplicarPreset(p.k)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
            style={
              preset === p.k
                ? { background: 'linear-gradient(135deg, #D4AF37, #A8823A)', color: '#fff', boxShadow: '0 3px 10px rgba(184,134,11,0.22)' }
                : { background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Calendario desde – hasta */}
      <div
        className="flex items-center gap-2 p-2 rounded-[16px] mb-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
      >
        <div
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[10px]"
          style={{ background: 'rgba(201,168,76,0.14)', color: '#A8823A' }}
        >
          <CalendarBlank size={18} weight="bold" />
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <FechaInput value={desde} max={hasta} onChange={(v) => { setDesde(v); setPreset('personalizado') }} />
          <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-tertiary)' }}>→</span>
          <FechaInput value={hasta} max={hoyISO()} onChange={(v) => { setHasta(v); setPreset('personalizado') }} />
        </div>
      </div>

      {/* Total del periodo */}
      <div
        className="rounded-[22px] p-5 mb-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(168,130,58,0.07))', border: '1px solid rgba(201,168,76,0.28)' }}
      >
        <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-tertiary)' }}>
          {unDia ? 'Total a pagar este día' : 'Total a pagar en el periodo'}
        </p>
        <p className="text-4xl font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>{money(totalGeneral)}</p>
        <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span>{grupos.length} {grupos.length === 1 ? 'empleada' : 'empleadas'}</span>
          {pendientes > 0 && (
            <span style={{ color: '#b8860b' }}>· {pendientes} sin cerrar</span>
          )}
        </div>
      </div>

      {/* Lista por empleada */}
      {loading ? (
        <p className="text-center py-10 text-sm" style={{ color: 'var(--text-tertiary)' }}>Cargando…</p>
      ) : grupos.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-full" style={{ background: 'rgba(201,168,76,0.10)', color: '#A8823A' }}>
            <CalendarBlank size={26} weight="light" />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nadie marcó asistencia en estas fechas.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {grupos.map((g) => {
            const open = abierta === g.id
            return (
              <div
                key={g.id}
                className="rounded-[18px] overflow-hidden transition-all"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', boxShadow: '0 3px 14px rgba(0,0,0,0.05)' }}
              >
                {/* Cabecera: empleada + total */}
                <button
                  onClick={() => setAbierta(open ? null : g.id)}
                  className="w-full flex items-center gap-3 p-3.5 text-left transition-all active:scale-[0.99]"
                >
                  <div
                    className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: '#ffffff', color: '#A8823A', border: '1.5px solid rgba(201,168,76,0.6)' }}
                  >
                    {iniciales(g.nombre)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{g.nombre}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {g.dias.length} {g.dias.length === 1 ? 'día' : 'días'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold leading-none" style={{ color: '#1a7f4b' }}>{money(g.total)}</p>
                  </div>
                  <CaretDown
                    size={16}
                    weight="bold"
                    style={{ color: 'var(--text-tertiary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  />
                </button>

                {/* Detalle día por día */}
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-3.5 pb-3.5 pt-0 space-y-1.5">
                        {g.dias.map((j) => (
                          <div
                            key={j.id}
                            className="flex items-center justify-between p-2.5 rounded-[12px]"
                            style={{ background: 'var(--main-bg)' }}
                          >
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                                {fechaCorta(j.fecha)}
                              </p>
                              <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                {hora(j.hora_entrada)} → {hora(j.hora_salida)}
                                {j.minutos_trabajados != null && ` · ${duracion(j.minutos_trabajados)}`}
                                {j.inicio_almuerzo && ` · alm. ${hora(j.inicio_almuerzo)}–${hora(j.fin_almuerzo)}`}
                              </p>
                            </div>
                            <div className="text-right shrink-0 pl-2">
                              {j.estado === 'cerrado' && j.pago != null ? (
                                <p className="text-sm font-bold" style={{ color: '#1a7f4b' }}>{money(j.pago)}</p>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: ESTADO_UI[j.estado].color, background: ESTADO_UI[j.estado].bg }}>
                                  {ESTADO_UI[j.estado].label}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Input de fecha compacto y estilizado
function FechaInput({ value, max, onChange }: { value: string; max?: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      max={max}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className="flex-1 min-w-0 bg-transparent text-sm font-semibold focus:outline-none cursor-pointer"
      style={{ color: 'var(--text-primary)', colorScheme: 'light' }}
    />
  )
}

function GestionEmpleadas() {
  const [empleadas, setEmpleadas] = useState<Empleada[]>([])
  const [nombre, setNombre] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [porEliminar, setPorEliminar] = useState<Empleada | null>(null) // confirmación

  const cargar = useCallback(() => {
    supabase
      .from('empleadas')
      .select('*')
      .order('activo', { ascending: false })
      .order('nombre')
      .then(({ data }) => setEmpleadas((data as Empleada[]) ?? []))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function agregar() {
    setError('')
    if (!nombre.trim()) return setError('Escribe el nombre')
    if (!/^\d{4}$/.test(pin)) return setError('El PIN debe ser de 4 dígitos')
    if (empleadas.some((e) => e.activo && e.pin === pin)) return setError('Ese PIN ya está en uso')
    setSaving(true)
    const { error: err } = await supabase.from('empleadas').insert({ nombre: nombre.trim(), pin })
    setSaving(false)
    if (err) return setError('No se pudo guardar')
    setNombre(''); setPin(''); cargar()
  }

  async function toggleActivo(e: Empleada) {
    await supabase.from('empleadas').update({ activo: !e.activo }).eq('id', e.id)
    cargar()
  }

  async function eliminar(e: Empleada) {
    // Borra la empleada y, en cascada, su historial de jornadas.
    await supabase.from('empleadas').delete().eq('id', e.id)
    setPorEliminar(null)
    cargar()
  }

  return (
    <div>
      {/* Alta de empleada */}
      <div
        className="rounded-[20px] p-4 mb-5 space-y-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Agregar empleada</p>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className="w-full px-3 py-2.5 rounded-[12px] text-sm focus:outline-none"
          style={{ background: 'var(--main-bg)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
        />
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="PIN de 4 dígitos"
          inputMode="numeric"
          className="w-full px-3 py-2.5 rounded-[12px] text-sm focus:outline-none tracking-[0.3em]"
          style={{ background: 'var(--main-bg)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
        />
        {error && <p className="text-xs font-medium" style={{ color: '#e06b6b' }}>{error}</p>}
        <button
          onClick={agregar}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-sm font-semibold disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #A8823A)', color: '#fff' }}
        >
          <Plus size={18} weight="bold" /> Agregar
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {empleadas.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between p-3.5 rounded-[16px]"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', opacity: e.activo ? 1 : 0.55 }}
          >
            <div className="min-w-0">
              <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {e.nombre} {!e.activo && <span className="text-xs font-normal">(inactiva)</span>}
              </p>
              <p className="text-[11px] mt-0.5 tracking-[0.2em]" style={{ color: 'var(--text-tertiary)' }}>PIN {e.pin}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActivo(e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: e.activo ? 'rgba(224,107,107,0.10)' : 'rgba(26,127,75,0.10)',
                  color: e.activo ? '#c0392b' : '#1a7f4b',
                }}
              >
                <Power size={14} weight="bold" /> {e.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button
                onClick={() => setPorEliminar(e)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95"
                style={{ background: 'rgba(224,107,107,0.10)', color: '#c0392b' }}
                aria-label="Eliminar"
                title="Eliminar"
              >
                <Trash size={15} weight="bold" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmación de eliminación */}
      <AnimatePresence>
        {porEliminar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{ background: 'rgba(28,25,20,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={(ev) => { if (ev.target === ev.currentTarget) setPorEliminar(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative w-full max-w-[360px] rounded-[24px] px-6 pt-7 pb-6 text-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', boxShadow: '0 24px 70px rgba(0,0,0,0.30)' }}
            >
              <div
                className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full"
                style={{ background: 'rgba(224,107,107,0.12)', color: '#c0392b' }}
              >
                <Warning size={26} weight="fill" />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                ¿Eliminar a {porEliminar.nombre}?
              </h2>
              <p className="text-sm mt-2 mb-5" style={{ color: 'var(--text-secondary)' }}>
                Se borrará también <b>todo su historial</b> de jornadas y pagos. Esto no se puede
                deshacer. Si solo quieres que no aparezca, mejor usa <b>Desactivar</b>.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPorEliminar(null)}
                  className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold transition-all active:scale-95"
                  style={{ background: 'var(--main-bg)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => eliminar(porEliminar)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ background: '#c0392b' }}
                >
                  <Trash size={16} weight="bold" /> Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
