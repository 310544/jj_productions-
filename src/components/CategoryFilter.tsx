import type { Categoria } from '../types'

interface CategoryItem {
  key: Categoria
  label: string
  image: string
}

const categories: CategoryItem[] = [
  { key: 'Hombre', label: 'Hombre', image: '/men.png.jpg' },
  { key: 'Mujer',  label: 'Mujer',  image: '/women.jpg' },
  { key: 'Niño',   label: 'Niño',   image: '/niño.jpg' },
  { key: 'Niña',   label: 'Niña',   image: '/niña.jpg' },
]

interface Props {
  active: Categoria | null
  onChange: (categoria: Categoria | null) => void
}

export default function CategoryFilter({ active, onChange }: Props) {
  return (
    <div
      className="flex gap-2.5 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {categories.map((cat) => {
        const isActive = active === cat.key

        return (
          <button
            key={cat.key}
            onClick={() => onChange(isActive ? null : cat.key)}
            className="flex items-center shrink-0 overflow-hidden cursor-pointer select-none"
            style={{
              borderRadius: '999px',
              background: isActive
                ? 'rgba(212, 160, 23, 0.18)'
                : 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: isActive
                ? '1px solid rgba(212, 160, 23, 0.6)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Mitad izquierda: foto */}
            <div className="w-10 h-10 shrink-0 overflow-hidden">
              <img
                src={cat.image}
                alt={cat.label}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Mitad derecha: nombre */}
            <span
              className="text-sm font-medium whitespace-nowrap px-3"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              {cat.label}
            </span>
          </button>
        )
      })}

      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}