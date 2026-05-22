import { useEffect, useState } from 'react'
import GarmentCard from '../components/GarmentCard'
import SearchBar from '../components/SearchBar'
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
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} />

      <CategoryFilter active={categoria} onChange={setCategoria} />

      {error && (
        <p className="text-center py-12" style={{ color: 'var(--danger)' }}>
          Error: {error}
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-6xl mb-3 opacity-30">👔</p>
          <p className="text-text-secondary">
            {search ? 'Sin resultados' : 'No hay prendas registradas'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {filtered.map((prenda) => (
          <GarmentCard key={prenda.id} prenda={prenda} onSelect={setSelectedPrenda} />
        ))}
      </div>

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
