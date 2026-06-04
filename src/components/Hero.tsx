import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { IconSearch, IconBell, IconX, IconAlertTriangle, IconCalendarCheck, IconFileInvoice, IconPlus } from '@tabler/icons-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/formatDate'
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
  const [open, setOpen] = useState(false)
  const [popup, setPopup] = useState<Popup>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
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

  const searchStyle: CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 12px 30px rgba(0,0,0,0.12)',
  }

  const bellStyle: CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.07)',
  }

  return (
    <>
    <div className="pb-6 pt-5 md:pt-6 md:pb-5">
      <div className="relative space-y-4 max-w-2xl mx-auto w-full">
        {/* Marca — solo mobile */}
        <div className="text-center md:hidden">
          <h1 className="text-xl font-light tracking-[0.14em] text-text-primary select-none">
            <span className="font-bold" style={{ color: '#C9A84C' }}>JJ</span>{' '}
            <span className="text-text-primary/70">PRODUCTION</span>
          </h1>
          <div
            className="mt-2 mx-auto w-8 h-[2px] rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, #B8860B, #D4AF37, transparent)' }}
          />
        </div>

        {/* Busqueda + Notificaciones */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <IconSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none z-10"
              style={{ color: '#B8860B' }}
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Buscar por codigo..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="relative w-full pl-12 pr-5 py-3.5 rounded-full text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:bg-white transition-all duration-200"
              style={{
                ...searchStyle,
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Campana */}
          <div className="relative shrink-0" ref={popupRef}>
            <button
              onClick={() => setOpen(!open)}
              className="relative w-11 h-11 flex items-center justify-center rounded-full shrink-0 transition-all duration-200 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              style={bellStyle}
              aria-label="Notificaciones"
            >
              <IconBell
                className="w-5 h-5"
                stroke={1.5}
                style={{ color: 'var(--text-secondary)' }}
              />
              {hasNotifications && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                  style={{ background: 'var(--danger)' }}
                />
              )}
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
                  background: 'var(--surface)',
                  border: '1px solid var(--surface-border)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.10)',
                  scrollbarWidth: 'none',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-primary">Notificaciones</h3>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 transition-all"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label="Cerrar"
                  >
                    <IconX className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!hasNotifications && (
                  <div className="text-center py-6">
                    <p className="text-4xl mb-2 opacity-20">🔔</p>
                    <p className="text-sm font-medium text-text-secondary">No hay notificaciones</p>
                    <p className="text-xs text-text-tertiary mt-1">Aqui veras tus alertas y recordatorios</p>
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
                            ? 'var(--danger-bg)'
                            : 'rgba(249,115,22,0.06)',
                          border: n.vencido
                            ? '1px solid var(--danger-border)'
                            : '1px solid rgba(249,115,22,0.15)',
                        }}
                      >
                        {n.vencido ? (
                          <IconAlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
                        ) : (
                          <IconCalendarCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#F97316' }} />
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
          style={{ background: 'rgba(0,0,0,0.45)' }}
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
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
              }}
              aria-label="Cerrar"
            >
              <IconX className="w-4 h-4" />
            </button>
            <div
              className="w-full max-h-[90vh] overflow-y-auto rounded-[24px] px-4 pt-5 pb-6 space-y-4"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--surface-border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
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
          style={{ background: 'rgba(0,0,0,0.45)' }}
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
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
              }}
              aria-label="Cerrar"
            >
              <IconX className="w-4 h-4" />
            </button>
            <div
              className="w-full max-h-[90vh] overflow-y-auto rounded-[24px] px-4 pt-5 pb-6 space-y-4"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--surface-border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
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
