import { useState, useRef, useEffect } from 'react'
import { IconSearch, IconBell, IconX, IconAlertTriangle, IconCalendarCheck, IconSun, IconMoon } from '@tabler/icons-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/formatDate'
import { useThemeStore } from '../store/useThemeStore'

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
  const [open, setOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { theme, toggle } = useThemeStore()
  const [loadingNotifs, setLoadingNotifs] = useState(false)

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
    setLoadingNotifs(true)
    const hoy = new Date().toISOString().split('T')[0]

    const { data: items } = await supabase
      .from('rental_items')
      .select('garment_id, rentals!inner(fecha_inicio, fecha_fin, estado)')
      .eq('rentals.estado', 'activo')
      .lte('rentals.fecha_fin', hoy)

    if (!items || items.length === 0) {
      setNotifications([])
      setLoadingNotifs(false)
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
    setLoadingNotifs(false)
  }

  const hasNotifications = notifications.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center relative">
        {/* Boton tema */}
        <button
          onClick={toggle}
          className="absolute left-0 w-11 h-11 flex items-center justify-center rounded-full transition-all hover:scale-110"
          style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
          }}
          aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? (
            <IconSun className="w-5 h-5" />
          ) : (
            <IconMoon className="w-5 h-5" />
          )}
        </button>

        <h1 className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight">
          JJ Production
        </h1>

        {/* Campana notificaciones */}
        <div className="absolute right-0" ref={popupRef}>
          <button
            onClick={() => setOpen(!open)}
            className="w-11 h-11 flex items-center justify-center rounded-full shrink-0"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Notificaciones"
          >
            <span className="bell-swing relative inline-flex">
              <IconBell
                className="w-5 h-5 bell-shake"
                stroke={1.5}
                style={{ color: 'var(--text-primary)' }}
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

      {/* Barra de búsqueda */}
      <div className="relative">
        <IconSearch
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5"
          style={{ color: 'var(--text-secondary)' }}
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Buscar por codigo..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-full text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
          style={{
            background: 'var(--field-bg)',
            border: '1px solid var(--field-border)',
          }}
        />
      </div>
    </div>
  )
}
