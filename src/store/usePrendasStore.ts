import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Prenda } from '../types'

interface PrendasState {
  prendas: Prenda[]
  loading: boolean
  error: string | null
  fetchPrendas: () => Promise<void>
  agregarPrenda: (prenda: Omit<Prenda, 'id'>) => Promise<{ success: boolean; error?: string }>
  removePrenda: (id: number) => void
}

export const usePrendasStore = create<PrendasState>((set, get) => ({
  prendas: [],
  loading: false,
  error: null,

  fetchPrendas: async () => {
    if (get().prendas.length > 0) return
    set({ loading: true, error: null })
    const { data: garments, error } = await supabase
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    if (!garments || garments.length === 0) {
      set({ prendas: [], loading: false })
      return
    }

    // Obtener TODAS las fechas de alquileres activos para cada prenda
    const { data: rentals } = await supabase
      .from('rental_items')
      .select('garment_id, rentals!inner(fecha_inicio, fecha_fin)')
      .in('garment_id', garments.map((g: Prenda) => g.id))
      .filter('rentals.estado', 'eq', 'activo')

    const fechasPorId: Record<number, { fecha_inicio: string; fecha_fin: string }[]> = {}
    if (rentals) {
      for (const r of rentals) {
        const rental = Array.isArray(r.rentals) ? r.rentals[0] : r.rentals
        if (rental) {
          if (!fechasPorId[r.garment_id]) fechasPorId[r.garment_id] = []
          fechasPorId[r.garment_id].push({
            fecha_inicio: rental.fecha_inicio,
            fecha_fin: rental.fecha_fin,
          })
        }
      }
    }

    const prendas = garments.map((g: Prenda) => ({
      ...g,
      fechas_ocupado: fechasPorId[g.id] || undefined,
      ...(fechasPorId[g.id]?.[0] || {}),
    }))

    set({ prendas, loading: false })
  },

  agregarPrenda: async (prenda) => {
    const { data, error } = await supabase
      .from('garments')
      .insert(prenda)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return { success: false, error: error.message }
    }

    set((state) => ({ prendas: [data, ...state.prendas] }))
    return { success: true }
  },

  removePrenda: (id) => {
    set((state) => ({ prendas: state.prendas.filter((p) => p.id !== id) }))
  },
}))
