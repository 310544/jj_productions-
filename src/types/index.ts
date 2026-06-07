export type EstadoPrenda = 'disponible' | 'ocupado' | 'vendido'

export type Categoria = 'Hombre' | 'Mujer' | 'Niño' | 'Niña' | 'Novias' | '15 Años' | 'Primera Comunión' | 'Accesorios'

export type Vendedor = 'Jhoan Becerra' | 'Karen' | 'Barbara'

export type TipoItem = 'alquiler' | 'venta'

export interface Prenda {
  id: number
  codigo: string
  nombre: string
  imagen_url: string
  estado: EstadoPrenda
  precio: number
  categoria?: Categoria
  cantidad?: number // stock (solo accesorios); resto = 1
  fechas_ocupado?: { fecha_inicio: string; fecha_fin: string }[]
}

export interface Cliente {
  id: number
  nombre: string
  telefono: string
  cedula?: string
  direccion?: string
}

export interface Alquiler {
  id: number
  codigo: string
  customer_id: number
  vendedor: Vendedor
  cedula?: string
  direccion?: string
  quien_entrega?: string
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
  precio: number
  tipo: TipoItem
}

export interface Pago {
  id: number
  rental_id: number
  monto: number
  fecha: string
}

export interface Gasto {
  id: number
  concepto: string
  categoria?: string
  monto: number
  fecha: string
}
