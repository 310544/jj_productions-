import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSearch, IconBell, IconX, IconAlertTriangle, IconCalendarCheck, IconSun, IconMoon, IconFileInvoice, IconPlus, IconHistory } from '@tabler/icons-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/formatDate'
import { useThemeStore } from '../store/useThemeStore'
import Alquiler from '../pages/Alquiler'
import AgregarPrenda from '../pages/AgregarPrenda'

type Popup = 'alquiler' | 'agregar' | null

interface Notification {
  codigo: string
  nombre: string
  fecha_fin: string
  vencido: boolean
  diasRetraso: number
}

interface HeroProps {
  searchValue: string
  onSearchChange: (value: string) => void
}

export default function Hero({ searchValue, onSearchChange }: HeroProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [popup, setPopup] = useState<Popup>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { theme, toggle } = useThemeStore()
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      fetchNotifications()
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function fetchNotifications() {
    const hoy = new Date().toISOString().split('T')[0]

    const { data: items } = await supabase
      .from('rental_items')
      .select('garment_id, rentals!inner(fecha_inicio, fecha_fin, estado)')
      .eq('rentals.estado', 'activo')
      .lte('rentals.fecha_fin', hoy)

    if (!items || items.length === 0) {
      setNotifications([])
      return
    }

    const garmentIds = [...new Set(items.map((i) => i.garment_id))]
    const { data: garments } = await supabase
      .from('garments')
      .select('id, codigo, nombre')
      .in('id', garmentIds)

    const garmentMap = new Map<number, { codigo: string; nombre: string }>()
    if (garments) {
      for (const g of garments) {
        garmentMap.set(g.id, { codigo: g.codigo, nombre: g.nombre })
      }
    }

    const hoyDate = new Date(hoy + 'T00:00:00')
    const notifs: Notification[] = []
    const seen = new Set<string>()
    for (const item of items) {
      const rental = Array.isArray(item.rentals) ? item.rentals[0] : item.rentals
      const g = garmentMap.get(item.garment_id)
      if (rental && g) {
        const key = `${g.codigo}-${rental.fecha_fin}`
        if (!seen.has(key)) {
          seen.add(key)
          const fechaFinDate = new Date(rental.fecha_fin + 'T00:00:00')
          const dias = Math.floor((hoyDate.getTime() - fechaFinDate.getTime()) / (1000 * 60 * 60 * 24))
          notifs.push({
            codigo: g.codigo,
            nombre: g.nombre,
            fecha_fin: rental.fecha_fin,
            vencido: rental.fecha_fin < hoy,
            diasRetraso: dias,
          })
        }
      }
    }
    notifs.sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin))
    setNotifications(notifs)
  }

  const hasNotifications = notifications.length > 0

  const bubbleGlass: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.16)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1.5px solid rgba(255, 255, 255, 0.72)',
    boxShadow:
      '0 10px 40px rgba(0, 0, 0, 0.14), 0 4px 12px rgba(255, 255, 255, 0.12), inset 0 2px 2px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.06)',
  }

  return (
    <>
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {/* Marca */}
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight shrink-0">
          <span className="text-white">JJ</span>
          <span className="text-white/90 font-light"> Production</span>
        </h1>

        {/* Espaciador */}
        <div className="flex-1" />
      </div>

      {/* Barra de búsqueda + Notificaciones */}
      <div className="relative max-w-2xl mx-auto flex items-center gap-3">
        <div className="relative flex-1">
          {/* Halo suave detrás de la burbuja */}
          <div
            className="absolute inset-0 rounded-full scale-[1.02] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.35) 0%, transparent 70%)',
              filter: 'blur(8px)',
              opacity: 0.7,
            }}
            aria-hidden="true"
          />
          <IconSearch
            className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none z-10"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Buscar por codigo..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="relative w-full pl-12 pr-5 py-4 rounded-full text-base placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:scale-[1.01] transition-all duration-200"
            style={{
              ...bubbleGlass,
              color: '#ffffff',
            }}
          />
        </div>

        {/* Campana notificaciones */}
        <div className="relative shrink-0" ref={popupRef}>
          <button
            onClick={() => setOpen(!open)}
            className="relative w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/40"
            style={bubbleGlass}
            aria-label="Notificaciones"
          >
            <span className="bell-swing relative inline-flex">
              <IconBell
                className="w-5 h-5 bell-shake"
                stroke={1.5}
                style={{ color: 'rgba(255,255,255,0.95)' }}
              />
              {hasNotifications && (
                <span
                  className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                  style={{ background: 'var(--danger)' }}
                >
                  {notifications.length}
                </span>
              )}
              {!hasNotifications && (
                <span
                  className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full"
                  style={{ background: 'var(--danger)' }}
                />
              )}
            </span>
          </button>

          <AnimatePresence>
            {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-80 rounded-[16px] p-5 z-30 max-h-80 overflow-y-auto"
              style={{
                background: theme === 'dark' ? 'rgba(25,25,30,0.95)' : '#ffffff',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                boxShadow: theme === 'dark' ? '0 8px 40px rgba(0,0,0,0.5)' : '0 8px 40px rgba(0,0,0,0.12)',
                scrollbarWidth: 'none',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary">Notificaciones</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:brightness-125 transition-all"
                  style={{
                    background: 'var(--glass-strong)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-secondary)',
                  }}
                  aria-label="Cerrar"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              </div>

              {!hasNotifications && (
                <div className="text-center py-6">
                  <p className="text-4xl mb-2 opacity-20">🔔</p>
                  <p className="text-sm font-medium text-text-secondary">
                    No hay notificaciones
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Aqui veras tus alertas y recordatorios
                  </p>
                </div>
              )}

              {hasNotifications && (
                <div className="space-y-2">
                  {notifications.map((n, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-[12px]"
                      style={{
                        background: n.vencido
                          ? theme === 'dark' ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)'
                          : theme === 'dark' ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.06)',
                        border: n.vencido
                          ? theme === 'dark' ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(239,68,68,0.15)'
                          : theme === 'dark' ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(249,115,22,0.15)',
                      }}
                    >
                      {n.vencido ? (
                        <IconAlertTriangle
                          className="w-5 h-5 shrink-0 mt-0.5"
                          style={{ color: 'var(--danger)' }}
                        />
                      ) : (
                        <IconCalendarCheck
                          className="w-5 h-5 shrink-0 mt-0.5"
                          style={{ color: '#F97316' }}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary">
                          {n.codigo} <span className="font-normal text-text-tertiary">{n.nombre}</span>
                        </p>
                        <p
                          className="text-xs font-medium mt-0.5"
                          style={{ color: n.vencido ? 'var(--danger)' : '#F97316' }}
                        >
                          {n.vencido
                            ? `Debio devolverse hace ${n.diasRetraso} dia${n.diasRetraso > 1 ? 's' : ''} (${formatDate(n.fecha_fin)})`
                            : `Se devuelve hoy`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>

    {/* Popup Factura */}
    <AnimatePresence>
      {popup === 'alquiler' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPopup(null) }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-[430px] md:max-w-[600px]"
          >
            <button
              onClick={() => setPopup(null)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:brightness-95 transition-all z-20"
              style={{
                background: '#ffffff',
                color: 'var(--text-secondary)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
              aria-label="Cerrar"
            >
              <IconX className="w-4 h-4" />
            </button>
            <div
              className="w-full max-h-[90vh] overflow-y-auto rounded-[28px] px-4 pt-5 pb-6 space-y-4"
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
              <Alquiler inPopup onClose={() => setPopup(null)} />
              <style>{`div::-webkit-scrollbar { display: none; }`}</style>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Popup Agregar */}
    <AnimatePresence>
      {popup === 'agregar' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPopup(null) }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-[430px] md:max-w-[600px]"
          >
            <button
              onClick={() => setPopup(null)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:brightness-95 transition-all z-20"
              style={{
                background: '#ffffff',
                color: 'var(--text-secondary)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
              aria-label="Cerrar"
            >
              <IconX className="w-4 h-4" />
            </button>
            <div
              className="w-full max-h-[90vh] overflow-y-auto rounded-[28px] px-4 pt-5 pb-6 space-y-4"
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
              <AgregarPrenda inPopup onClose={() => setPopup(null)} />
              <style>{`div::-webkit-scrollbar { display: none; }`}</style>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
