import { useEffect, useState } from 'react'
import GarmentCard from '../components/GarmentCard'
import SearchBar from '../components/SearchBar'
import CategoryFilter from '../components/CategoryFilter'
import { usePrendasStore } from '../store/usePrendasStore'
import type { Categoria } from '../types'

export default function Inventario() {
  const { prendas, loading, error, fetchPrendas } = usePrendasStore()
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState<Categoria | null>(null)

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

  const disponibles = prendas.filter((p) => p.estado === 'disponible').length
  const ocupados = prendas.filter((p) => p.estado === 'ocupado').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-[16px] px-4 py-4"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
            {disponibles}
          </p>
          <p className="text-xs font-medium text-text-secondary mt-1">Disponibles</p>
        </div>
        <div
          className="rounded-[16px] px-4 py-4"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <p className="text-3xl font-bold" style={{ color: 'var(--danger)' }}>
            {ocupados}
          </p>
          <p className="text-xs font-medium text-text-secondary mt-1">Ocupados</p>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <CategoryFilter active={categoria} onChange={setCategoria} />

      {loading && (
        <p className="text-center text-text-secondary py-12">Cargando...</p>
      )}

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

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((prenda) => (
          <GarmentCard key={prenda.id} prenda={prenda} />
        ))}
      </div>
    </div>
  )
}
