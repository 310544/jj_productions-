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

// ── Asistencia / Nómina diaria ──

export interface Empleada {
  id: number
  nombre: string
  pin: string
  activo: boolean
}

export type EstadoJornada = 'trabajando_am' | 'almuerzo' | 'trabajando_pm' | 'cerrado'

export interface Jornada {
  id: number
  empleada_id: number
  fecha: string
  hora_entrada: string | null
  inicio_almuerzo: string | null
  fin_almuerzo: string | null
  hora_salida: string | null
  estado: EstadoJornada
  minutos_trabajados: number | null
  pago: number | null
  empleadas?: { nombre: string } // join opcional para reportes
}

// ── Trajes a la medida (Encargos) ──

export type EstadoEncargo = 'pendiente' | 'listo' | 'entregado' | 'cancelado'

export interface EncargoPago {
  id: number
  encargo_id: number
  monto: number
  fecha: string
}

export interface Encargo {
  id: number
  codigo: string
  cliente_nombre: string
  cliente_telefono?: string
  cliente_cedula?: string
  descripcion: string
  notas?: string
  precio: number
  fecha_pedido: string
  fecha_entrega: string
  estado: EstadoEncargo
  encargo_pagos?: EncargoPago[] // join opcional
}

// Lo que devuelve la función registrar_marca() de Supabase
export interface ResultadoMarca {
  ok: boolean
  error?: string
  accion?: 'entrada' | 'inicio_almuerzo' | 'fin_almuerzo' | 'salida'
  empleada?: string
  hora?: string
  minutos?: number
  almuerzo_min?: number
  pago?: number
}
