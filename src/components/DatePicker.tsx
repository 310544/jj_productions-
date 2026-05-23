import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCalendar, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { formatDate } from '../lib/formatDate'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

interface Props {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  min?: string
  align?: 'left' | 'right'
}

export default function DatePicker({ value, onChange, label, placeholder = 'Seleccionar fecha', min, align = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => value ? new Date(value + 'T00:00:00') : new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (value) setViewDate(new Date(value + 'T00:00:00'))
  }, [value])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  function selectDay(day: number) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(iso)
    setOpen(false)
  }

  const minDate = min ? new Date(min + 'T00:00:00') : null
  function isDisabled(day: number) {
    if (!minDate) return false
    const d = new Date(year, month, day)
    return d < minDate
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="relative" ref={ref}>
      {label && (
        <span className="text-xs text-text-tertiary block mb-1">{label}</span>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-[12px] px-3 py-3 text-sm text-left flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
        style={{
          background: 'var(--field-bg)',
          border: open ? '1px solid var(--accent-border)' : '1px solid var(--field-border)',
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
        }}
      >
        <IconCalendar className="w-4 h-4 shrink-0" style={{ color: open ? 'var(--accent)' : 'var(--text-secondary)' }} />
        <span className="flex-1 min-w-0 truncate">
          {value ? formatDate(value) : placeholder}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="rounded-[16px] p-4 shadow-lg w-64"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:brightness-95 transition-all"
                  style={{ background: 'rgba(0,0,0,0.04)' }}
                >
                  <IconChevronLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                <p className="text-sm font-semibold text-text-primary">
                  {MESES[month]} {year}
                </p>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:brightness-95 transition-all"
                  style={{ background: 'rgba(0,0,0,0.04)' }}
                >
                  <IconChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>

              {/* Dias de la semana */}
              <div className="grid grid-cols-7 mb-1.5">
                {DIAS.map((d) => (
                  <span key={d} className="text-[10px] font-semibold text-center text-text-tertiary py-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Grid de dias */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const selected = iso === value
                  const today = iso === todayStr
                  const disabled = isDisabled(day)

                  return (
                    <button
                      type="button"
                      key={day}
                      disabled={disabled}
                      onClick={() => selectDay(day)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium transition-all"
                      style={{
                        background: selected ? 'var(--accent)' : 'transparent',
                        color: selected ? '#fff' : disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
                        border: today && !selected ? '1px solid var(--accent)' : '1px solid transparent',
                        opacity: disabled ? 0.3 : 1,
                        cursor: disabled ? 'default' : 'pointer',
                      }}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
