import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GarmentCard from '../components/GarmentCard'
import Hero from '../components/Hero'
import CategoryFilter from '../components/CategoryFilter'
import GarmentModal from '../components/GarmentModal'
import { usePrendasStore } from '../store/usePrendasStore'
import type { Categoria, Prenda } from '../types'
import { IconFileInvoice, IconPlus, IconHistory } from '@tabler/icons-react'

export default function Inventario() {
  const navigate = useNavigate()
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
      <div
        className="pb-6 -mx-4 md:-mx-8 px-4 md:px-8 -mt-5 md:-mt-8"
        style={{
          background: 'linear-gradient(to right, #D4AF37, #B8860B)',
        }}
      >
        <Hero
          searchValue={search}
          onSearchChange={setSearch}
        />
      </div>
      <div className="border-b" style={{ borderColor: 'rgba(0,0,0,0.10)' }} />

      <div className="max-w-6xl mx-auto w-full space-y-3">
        <p className="text-sm font-bold text-text-primary">Category</p>
        <CategoryFilter active={categoria} onChange={setCategoria} />

        <p className="text-sm font-bold text-text-primary mt-2">Popular</p>
      </div>

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

      {/* Linea divisoria vertical */}
      <div className="hidden md:block fixed left-64 z-0" style={{ top: '210px', bottom: '0', borderRight: '1px solid rgba(0,0,0,0.12)' }} />

      {/* Sidebar menu - solo web, fijo a la izquierda */}
      <div className="hidden md:flex md:flex-col md:gap-0.5 fixed left-0 top-[210px] bottom-0 z-10 py-4" style={{ width: '256px', background: '#F6F6F7' }}>
        <button
          onClick={() => navigate('/alquiler')}
          className="flex items-center gap-3 mx-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-black/5 text-text-primary"
        >
          <IconFileInvoice className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          Factura
        </button>
        <button
          onClick={() => navigate('/agregar')}
          className="flex items-center gap-3 mx-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-black/5 text-text-primary"
        >
          <IconPlus className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          Agregar
        </button>
        <button
          onClick={() => navigate('/historial')}
          className="flex items-center gap-3 mx-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-black/5 text-text-primary"
        >
          <IconHistory className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          Historial
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-6xl mx-auto w-full">
        {filtered.map((prenda) => (
          <GarmentCard
            key={prenda.id}
            prenda={prenda}
            onSelect={setSelectedPrenda}
          />
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
