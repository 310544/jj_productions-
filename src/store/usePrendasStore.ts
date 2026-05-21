import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Prenda } from '../types'

interface PrendasState {
  prendas: Prenda[]
  loading: boolean
  error: string | null
  fetchPrendas: () => Promise<void>
  agregarPrenda: (prenda: Omit<Prenda, 'id'>) => Promise<void>
}

export const usePrendasStore = create<PrendasState>((set) => ({
  prendas: [],
  loading: false,
  error: null,

  fetchPrendas: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ loading: false, error: error.message })
    } else {
      set({ prendas: data || [], loading: false })
    }
  },

  agregarPrenda: async (prenda) => {
    const { data, error } = await supabase
      .from('garments')
      .insert(prenda)
      .select()
      .single()

    if (error) {
      set({ error: error.message })
    } else if (data) {
      set((state) => ({ prendas: [data, ...state.prendas] }))
    }
  },
}))
