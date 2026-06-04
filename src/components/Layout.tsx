import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SquaresFour,
  ClockCounterClockwise,
  ChartBar,
  Receipt,
  Plus,
  X,
  LockKey,
  TrendDown,
  Sun,
  Moon,
} from '@phosphor-icons/react'
import AgregarPrenda from '../pages/AgregarPrenda'
import Alquiler from '../pages/Alquiler'
import BackgroundElements from './BackgroundElements'
import { GastoModal } from '../pages/Contabilidad'

type Popup = 'alquiler' | 'agregar' | null

interface NavItem {
  label: string
  icon: React.ReactNode
  path?: string
  popup?: Popup
}

const navItems: NavItem[] = [
  { label: 'Inventario', icon: <SquaresFour size={20} weight="light" />, path: '/' },
  { label: 'Historial', icon: <ClockCounterClockwise size={20} weight="light" />, path: '/historial' },
  { label: 'Contabilidad', icon: <ChartBar size={20} weight="light" />, path: '/contabilidad' },
]

const actionItems: NavItem[] = [
  { label: 'Nueva Factura', icon: <Receipt size={20} weight="light" />, popup: 'alquiler' },
  { label: 'Agregar Prenda', icon: <Plus size={20} weight="light" />, popup: 'agregar' },
]

function ModalWrapper({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(28,25,20,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative w-full max-w-[440px] md:max-w-[620px]"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full z-20 transition-all hover:scale-110 active:scale-95"
              style={{
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.14)',
              }}
              aria-label="Cerrar"
            >
              <X size={15} weight="light" />
            </button>
            <div
              className="w-full max-h-[88vh] overflow-y-auto rounded-[24px] px-5 pt-6 pb-7 space-y-4"
              style={{
                background: 'var(--surface)',
                border: '1px solid rgba(201,168,76,0.18)',
                boxShadow: '0 30px 80px rgba(28,20,8,0.28)',
                scrollbarWidth: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [popup, setPopup] = useState<Popup>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [gastoOpen, setGastoOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  function handleNav(item: NavItem) {
    if (item.path === '/contabilidad') { setPinOpen(true); return }
    if (item.path) navigate(item.path)
    else if (item.popup) setPopup(item.popup)
  }

  return (
    <div className="app-wrapper flex">
      <BackgroundElements />

      {/* ── Sidebar (desktop only) ── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-30"
        style={{
          width: 'var(--sidebar-width)',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          boxShadow: '2px 0 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Brand */}
        <div className="px-6 pt-8 pb-7">
          <p
            className="text-2xl font-bold tracking-[0.18em] leading-none select-none"
            style={{ color: '#D4AF37', fontVariant: 'small-caps' }}
          >
            JJ
          </p>
          <p
            className="text-[9px] font-semibold tracking-[0.30em] uppercase mt-1.5 leading-none"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Production
          </p>
          <div
            className="mt-4 w-8 h-px"
            style={{ background: 'linear-gradient(90deg, #D4AF37, transparent)' }}
          />
        </div>

        <div className="gold-line mx-4" />

        {/* Nav links */}
        <nav className="flex-1 px-3 pt-4 space-y-1">
          <p className="text-[10px] font-semibold tracking-widest uppercase px-3 mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Menú
          </p>
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNav(item)}
              className={`sidebar-item w-full ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="px-3 pb-6 space-y-2">
          <div className="gold-line mb-4" />
          <p className="text-[10px] font-semibold tracking-widest uppercase px-3 mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Acciones
          </p>

          {/* Nueva Factura — outline style */}
          <button
            onClick={() => setPopup('alquiler')}
            className="sidebar-item w-full"
            style={{
              border: '1px solid rgba(201,168,76,0.40)',
              color: '#8B6914',
            }}
          >
            <Receipt size={20} weight="light" />
            Nueva Factura
          </button>

          {/* Agregar Gasto — outline style */}
          <button
            onClick={() => setGastoOpen(true)}
            className="sidebar-item w-full"
            style={{
              border: '1px solid rgba(201,168,76,0.40)',
              color: '#8B6914',
            }}
          >
            <TrendDown size={20} weight="light" />
            Agregar Gasto
          </button>

          {/* Agregar Prenda — filled gold */}
          <button
            onClick={() => setPopup('agregar')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-[12px] text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(184,134,11,0.30)',
            }}
          >
            <Plus size={18} weight="regular" />
            Agregar Prenda
          </button>

          {/* Toggle tema claro/oscuro */}
          <button
            onClick={toggleTheme}
            className="sidebar-item w-full"
            style={{ border: '1px solid var(--surface-border)' }}
          >
            {theme === 'dark' ? <Sun size={20} weight="light" /> : <Moon size={20} weight="light" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
      </aside>

      {/* Toggle tema — flotante (móvil) */}
      <button
        onClick={toggleTheme}
        className="md:hidden fixed top-4 right-4 z-40 w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          color: 'var(--text-secondary)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        }}
        aria-label="Cambiar tema"
      >
        {theme === 'dark' ? <Sun size={18} weight="light" /> : <Moon size={18} weight="light" />}
      </button>

      {/* ── Main content ── */}
      <main
        className="relative z-10 flex-1 min-w-0 min-h-screen pb-24 md:pb-10"
        style={{
          marginLeft: 0,
          background: 'var(--main-bg)',
        }}
      >
        <div className="md:ml-[248px]">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-5 pointer-events-none md:hidden">
        <div
          className="flex items-center gap-1 px-2.5 py-2 rounded-full pointer-events-auto backdrop-blur-xl"
          style={{
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10)',
          }}
        >
          {/* Inventario */}
          <MobileNavBtn
            label="Inicio"
            icon={<SquaresFour size={20} weight="light" />}
            active={location.pathname === '/'}
            onClick={() => navigate('/')}
          />

          <MobileNavBtn
            label="Factura"
            icon={<Receipt size={20} weight="light" />}
            active={false}
            onClick={() => setPopup('alquiler')}
          />

          {/* Agregar — center CTA */}
          <button
            onClick={() => setPopup('agregar')}
            className="mx-1 w-12 h-12 flex flex-col items-center justify-center rounded-full transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)',
              boxShadow: '0 4px 16px rgba(184,134,11,0.40)',
            }}
            aria-label="Agregar prenda"
          >
            <Plus size={22} weight="light" color="#fff" />
          </button>

          <MobileNavBtn
            label="Historial"
            icon={<ClockCounterClockwise size={20} weight="light" />}
            active={location.pathname === '/historial'}
            onClick={() => navigate('/historial')}
          />

          <MobileNavBtn
            label="Finanzas"
            icon={<ChartBar size={20} weight="light" />}
            active={location.pathname === '/contabilidad'}
            onClick={() => setPinOpen(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <ModalWrapper open={popup === 'alquiler'} onClose={() => setPopup(null)}>
        <Alquiler inPopup onClose={() => setPopup(null)} />
      </ModalWrapper>

      <ModalWrapper open={popup === 'agregar'} onClose={() => setPopup(null)}>
        <AgregarPrenda inPopup onClose={() => setPopup(null)} />
      </ModalWrapper>

      <PinModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onSuccess={() => { setPinOpen(false); navigate('/contabilidad') }}
      />

      <GastoModal
        open={gastoOpen}
        onClose={() => setGastoOpen(false)}
        defaultFecha={new Date().toISOString().split('T')[0]}
        onSaved={() => setGastoOpen(false)}
      />
    </div>
  )
}

function PinModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const CODE = '3105'
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])
  const [error, setError] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (open) {
      setDigits(['', '', '', ''])
      setError(false)
      const t = setTimeout(() => inputsRef.current[0]?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open])

  function verify(code: string) {
    if (code === CODE) {
      onSuccess()
    } else {
      setError(true)
      setTimeout(() => {
        setDigits(['', '', '', ''])
        setError(false)
        inputsRef.current[0]?.focus()
      }, 650)
    }
  }

  function handleChange(i: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = char
    setDigits(next)
    if (error) setError(false)
    if (char && i < 3) inputsRef.current[i + 1]?.focus()
    if (char && i === 3) {
      const code = next.join('')
      if (code.length === 4) verify(code)
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  return (
    <AnimatePresence>
      {open && (
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
            className="relative w-full max-w-[360px] rounded-[28px] px-7 pt-9 pb-8 text-center"
            style={{
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.22)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.30)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full z-20 transition-all hover:scale-110 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.20)', color: 'rgba(255,255,255,0.85)' }}
              aria-label="Cerrar"
            >
              <X size={15} weight="light" />
            </button>

            <div
              className="w-14 h-14 mx-auto flex items-center justify-center rounded-full mb-4"
              style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)' }}
            >
              <LockKey size={26} weight="light" color="#F1DC97" />
            </div>

            <h2 className="text-lg font-bold tracking-tight" style={{ color: '#ffffff' }}>
              Área protegida
            </h2>
            <p className="text-sm mt-1 mb-6" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Ingresa el código de 4 dígitos para ver Contabilidad
            </p>

            <div className="flex justify-center gap-3 mb-2">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={1}
                  value={digits[i]}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-14 h-16 text-center text-2xl font-bold rounded-[16px] focus:outline-none focus:shadow-[0_0_0_3px_rgba(241,220,151,0.35)]"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: error
                      ? '1.5px solid #ff8787'
                      : digits[i]
                      ? '1.5px solid rgba(241,220,151,0.85)'
                      : '1.5px solid rgba(255,255,255,0.22)',
                    color: error ? '#ffb4b4' : '#ffffff',
                    caretColor: '#F1DC97',
                  }}
                />
              ))}
            </div>

            <p
              className="text-xs font-medium h-4 transition-opacity"
              style={{ color: '#ff9b9b', opacity: error ? 1 : 0 }}
            >
              Código incorrecto, intenta de nuevo
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MobileNavBtn({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-full transition-all active:scale-95 min-w-[52px]"
      style={{
        background: active ? 'rgba(255,255,255,0.55)' : 'transparent',
        border: active ? '1px solid rgba(255,255,255,0.75)' : '1px solid transparent',
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.7)' : 'none',
        backdropFilter: active ? 'blur(10px)' : undefined,
        WebkitBackdropFilter: active ? 'blur(10px)' : undefined,
        color: active ? '#A8823A' : 'rgba(0,0,0,0.55)',
      }}
    >
      {icon}
      <span className="text-[9px] font-semibold tracking-wide">{label}</span>
    </button>
  )
}
