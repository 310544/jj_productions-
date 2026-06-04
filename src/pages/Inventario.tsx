import { useEffect, useState } from 'react'
import GarmentCard from '../components/GarmentCard'
import Hero from '../components/Hero'
import CategoryFilter from '../components/CategoryFilter'
import GarmentModal from '../components/GarmentModal'
import { usePrendasStore } from '../store/usePrendasStore'
import type { Categoria, Prenda } from '../types'

export default function Inventario() {
  const { prendas, loading, error, fetchPrendas, removePrenda } = usePrendasStore()
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [selectedPrenda, setSelectedPrenda] = useState<Prenda | null>(null)

  useEffect(() => {
    fetchPrendas()
  }, [fetchPrendas])

  const filtered = prendas.filter((p) => {
    const matchSearch = search
      ? p.codigo.toLowerCase().includes(search.toLowerCase())
      : true
    const matchCategoria = categoria ? p.categoria === categoria : true
    return matchSearch && matchCategoria
  })

  return (
    <div className="space-y-5 px-4 md:px-8">
      {/* Desktop page header */}
      <div className="hidden md:flex items-center justify-between pt-7 pb-1">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Inventario</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {filtered.length} prenda{filtered.length !== 1 ? 's' : ''}
            {categoria ? ` en ${categoria}` : ' en total'}
          </p>
        </div>
        <div />
      </div>

      <div>
        <Hero
          searchValue={search}
          onSearchChange={setSearch}
        />
      </div>

      <div className="max-w-[1500px] mx-auto w-full space-y-3">
        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-0.5">
          Categorías
        </p>
        <CategoryFilter active={categoria} onChange={setCategoria} />
      </div>

      {error && (
        <p className="text-center py-12" style={{ color: 'var(--danger)' }}>
          Error: {error}
        </p>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 max-w-[1500px] mx-auto w-full pb-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[20px] overflow-hidden animate-pulse"
              style={{ background: '#f5f5f5', border: '1px solid rgba(0,0,0,0.04)' }}
            >
              <div className="aspect-[3/4]" style={{ background: '#e8e8e8' }} />
              <div className="p-3.5 space-y-2">
                <div className="h-2.5 rounded-full" style={{ background: '#e2e2e2', width: '40%' }} />
                <div className="h-3 rounded-full" style={{ background: '#ddd', width: '70%' }} />
                <div className="h-3 rounded-full" style={{ background: '#ddd', width: '45%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-6xl mb-3 opacity-30">👔</p>
          <p className="text-text-secondary">
            {search ? 'Sin resultados' : 'No hay prendas registradas'}
          </p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 max-w-[1500px] mx-auto w-full pb-2">
          {filtered.map((prenda) => (
            <GarmentCard
              key={prenda.id}
              prenda={prenda}
              onSelect={setSelectedPrenda}
            />
          ))}
        </div>
      )}

      {selectedPrenda && (
        <GarmentModal
          prenda={selectedPrenda}
          onClose={() => setSelectedPrenda(null)}
          onDelete={() => {
            removePrenda(selectedPrenda.id)
            setSelectedPrenda(null)
          }}
        />
      )}
    </div>
  )
}
