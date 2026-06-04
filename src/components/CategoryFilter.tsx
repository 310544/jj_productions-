import type { Categoria } from '../types'

interface CategoryItem {
  key: Categoria
  label: string
  emoji: string
}

const categories: CategoryItem[] = [
  { key: 'Hombre',           label: 'Hombre',           emoji: '' },
  { key: 'Mujer',            label: 'Mujer',            emoji: '' },
  { key: 'Niño',             label: 'Niño',             emoji: '' },
  { key: 'Niña',             label: 'Niña',             emoji: '' },
  { key: 'Novias',           label: 'Novias',           emoji: '' },
  { key: '15 Años',          label: '15 Años',          emoji: '' },
  { key: 'Primera Comunión', label: 'Primera Comunión', emoji: '' },
  { key: 'Accesorios',       label: 'Accesorios',       emoji: '' },
]

interface Props {
  active: Categoria | null
  onChange: (categoria: Categoria | null) => void
}

function chipStyle(isActive: boolean): React.CSSProperties {
  if (isActive) {
    return {
      background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)',
      border: '1px solid transparent',
      color: '#ffffff',
      letterSpacing: '0.04em',
      boxShadow: '0 4px 14px rgba(184,134,11,0.35), inset 0 1px 0 rgba(255,255,255,0.30)',
    }
  }
  return {
    background: 'var(--surface)',
    border: '1px solid rgba(201,168,76,0.22)',
    color: 'var(--text-secondary)',
    letterSpacing: '0.04em',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 6px 16px rgba(28,20,8,0.10)',
  }
}

export default function CategoryFilter({ active, onChange }: Props) {
  const items: { key: Categoria | null; label: string }[] = [
    { key: null, label: 'Todos' },
    ...categories.map((c) => ({ key: c.key as Categoria | null, label: c.label })),
  ]

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      {items.map((item) => {
        const isActive = active === item.key
        return (
          <button
            key={item.label}
            onClick={() => onChange(isActive ? null : item.key)}
            className={`chip-filter ${isActive ? '' : 'chip-idle'} shrink-0 px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200 active:scale-95 whitespace-nowrap`}
            style={chipStyle(isActive)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
