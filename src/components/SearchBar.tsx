import { IconSearch, IconBell } from '@tabler/icons-react'

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: Props) {
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
          className="w-full pl-11 pr-4 py-3 rounded-[12px] text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        />
      </div>

      {/* Ícono de notificaciones */}
      <button
        className="w-11 h-11 flex items-center justify-center rounded-full shrink-0 relative"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          color: 'var(--text-secondary)',
        }}
        aria-label="Notificaciones"
      >
        <IconBell className="w-5 h-5" />
        {/* Punto rojo de notificación */}
        <span
          className="absolute top-2 right-2.5 w-2 h-2 rounded-full"
          style={{ background: 'var(--danger)' }}
        />
      </button>
    </div>
  )
}