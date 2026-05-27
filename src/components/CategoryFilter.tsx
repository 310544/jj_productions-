import type { Categoria } from '../types'

interface CategoryItem {
  key: Categoria
  label: string
  image: string
}

const categories: CategoryItem[] = [
  { key: 'Hombre',            label: 'Hombre',            image: '/men.png.jpg' },
  { key: 'Mujer',             label: 'Mujer',             image: '/women.jpg' },
  { key: 'Niño',              label: 'Niño',              image: '/niño.jpg' },
  { key: 'Niña',              label: 'Niña',              image: '/niña.jpg' },
  { key: 'Novias',            label: 'Novias',            image: '/novia.jpg' },
  { key: '15 Años',           label: '15 Años',           image: '/quinceaños.jpg' },
  { key: 'Primera Comunión',  label: 'Primera Comunión',  image: '/primeracomunion.jpg' },
  { key: 'Accesorios',        label: 'Accesorios',        image: '/accesorios.jpg' },
]

interface Props {
  active: Categoria | null
  onChange: (categoria: Categoria | null) => void
}

export default function CategoryFilter({ active, onChange }: Props) {
  return (
    <div
      className="flex gap-2.5 overflow-x-auto pb-1 md:justify-center"
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
                ? 'var(--accent-bg)'
                : '#ffffff',
              border: isActive
                ? '1px solid var(--accent-border)'
                : '1px solid rgba(0,0,0,0.05)',
              boxShadow: isActive
                ? '0 2px 10px rgba(0,0,0,0.06)'
                : '0 3px 12px rgba(0,0,0,0.08)',
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