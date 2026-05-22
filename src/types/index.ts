export type EstadoPrenda = 'disponible' | 'ocupado'

export type Categoria = 'Hombre' | 'Mujer' | 'Niño' | 'Niña'

export interface Prenda {
  id: number
  codigo: string
  nombre: string
  imagen_url: string
  estado: EstadoPrenda
  precio: number
  categoria?: Categoria
  fechas_ocupado?: { fecha_inicio: string; fecha_fin: string }[]
}

export interface Cliente {
  id: number
  nombre: string
  telefono: string
}

export interface Alquiler {
  id: number
  customer_id: number
  fecha_inicio: string
  fecha_fin: string
  monto_total: number
  abono: number
  saldo_pendiente: number
  estado: 'activo' | 'finalizado'
}

export interface AlquilerItem {
  id: number
  rental_id: number
  garment_id: number
}
