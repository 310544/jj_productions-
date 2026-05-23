import { useState, useRef, useEffect } from 'react'
import { IconSearch, IconBell, IconX } from '@tabler/icons-react'

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <IconSearch
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5"
          style={{ color: 'var(--text-secondary)' }}
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Buscar por codigo..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-full text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        />
      </div>

      {/* Boton notificaciones */}
      <div className="relative" ref={popupRef}>
        <button
          onClick={() => setOpen(!open)}
          className="w-11 h-11 flex items-center justify-center rounded-full shrink-0 relative"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 16px rgba(0,0,0,0.25)',
            color: 'var(--text-secondary)',
          }}
          aria-label="Notificaciones"
        >
          <span className="bell-swing relative inline-flex">
            <IconBell
              className="w-5 h-5 bell-shake"
              stroke={1.5}
              style={{ color: 'rgba(255,255,255,0.95)' }}
            />
            <span
              className="absolute -top-0.5 right-0 w-2 h-2 rounded-full"
              style={{ background: '#F97316' }}
            />
          </span>
        </button>

        {/* Popup */}
        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-72 rounded-[16px] p-5 z-30"
            style={{
              background: 'rgba(20, 20, 25, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
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

            <div className="text-center py-6">
              <p className="text-4xl mb-2 opacity-20">🔔</p>
              <p className="text-sm font-medium text-text-secondary">
                No hay notificaciones
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Aqui veras tus alertas y recordatorios
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
