import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { compartirComprobante, type ComprobanteData } from '../lib/comprobante'
import { formatDateRange } from '../lib/formatDate'
import DatePicker from '../components/DatePicker'
import type { Prenda, Vendedor, TipoItem } from '../types'
import {
  User, Phone, CalendarBlank, X, Plus,
  MagnifyingGlass, WhatsappLogo, CoatHanger, ArrowLeft, Check,
  Warning, IdentificationCard, MapPin, HandPalm,
  Money, Trash, Receipt, CaretDown,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'

const VENDEDORES: Vendedor[] = ['Jhoan Becerra', 'Karen', 'Barbara']

interface GarmentSeleccionada {
  prenda: Prenda
  tipo: TipoItem
  precio: string
  cantidad: string // unidades a vender (solo accesorios); resto = '1'
}

interface PagoLocal {
  key: string
  monto: string
  fecha: string
}

interface Props {
  inPopup?: boolean
  onClose?: () => void
  editRentalId?: number
  onSaved?: () => void
}

export default function Alquiler({ inPopup, onClose, editRentalId, onSaved }: Props = {}) {
  const navigate = useNavigate()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [cedula, setCedula] = useState('')
  const [direccion, setDireccion] = useState('')
  const [vendedor, setVendedor] = useState<Vendedor | ''>('')
  const [quienEntrega, setQuienEntrega] = useState('')
  const [selectedGarments, setSelectedGarments] = useState<GarmentSeleccionada[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Prenda[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [allGarments, setAllGarments] = useState<Prenda[]>([])
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [fechaFin, setFechaFin] = useState('')
  const [total, setTotal] = useState('')
  const [pagos, setPagos] = useState<PagoLocal[]>([])
  const [deposito, setDeposito] = useState('') // se devuelve cuando traen el traje
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [savedCodigo, setSavedCodigo] = useState('')
  const [openVendedor, setOpenVendedor] = useState(false)
  const [openEntrega, setOpenEntrega] = useState(false)
  const [nombreDuplicado, setNombreDuplicado] = useState('')

  const [conflictingGarments, setConflictingGarments] = useState<Set<number> | null>(null)
  const [conflictingDates, setConflictingDates] = useState<Map<number, string>>(new Map())
  const [checkingConflicts, setCheckingConflicts] = useState(false)
  const [showConflictPopup, setShowConflictPopup] = useState(false)
  const [conflictMessage, setConflictMessage] = useState('')
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [editItemsOriginal, setEditItemsOriginal] = useState<{ garment_id: number; tipo: TipoItem; cantidad: number; esAccesorio: boolean }[]>([])

  useEffect(() => {
    supabase
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setAllGarments(data)
      })
  }, [])

  // Cargar datos de factura existente para edicion
  useEffect(() => {
    if (!editRentalId) return
    async function loadRental() {
      setLoadingEdit(true)
      // Cargar rental
      const { data: rental } = await supabase
        .from('rentals')
        .select('*, customers(*)')
        .eq('id', editRentalId)
        .single()
      if (!rental) { setLoadingEdit(false); return }

      // Cargar items con garments
      const { data: items } = await supabase
        .from('rental_items')
        .select('*, garments(*)')
        .eq('rental_id', editRentalId)

      // Cargar pagos
      const { data: pagosData } = await supabase
        .from('pagos')
        .select('*')
        .eq('rental_id', editRentalId)
        .order('fecha', { ascending: true })

      // Llenar formulario
      const cust = Array.isArray(rental.customers) ? rental.customers[0] : rental.customers
      setCustomerName(cust?.nombre || '')
      setCustomerPhone(cust?.telefono || '')
      setCedula(rental.cedula || '')
      setDireccion(rental.direccion || '')
      setVendedor(rental.vendedor || '')
      setQuienEntrega(rental.quien_entrega || '')
      setFechaInicio(rental.fecha_inicio)
      setFechaFin(rental.fecha_fin)
      setTotal(rental.monto_total ? String(rental.monto_total) : '')
      setDeposito(rental.deposito ? String(Math.round(rental.deposito)) : '')
      setSavedCodigo(rental.codigo || '')

      if (items) {
        const mapped: GarmentSeleccionada[] = items.map((item: any) => ({
          prenda: item.garments,
          tipo: item.tipo as TipoItem,
          precio: item.precio ? String(Math.round(item.precio)) : '',
          cantidad: String(item.cantidad || 1),
        }))
        setSelectedGarments(mapped)
        setEditItemsOriginal(items.map((item: any) => ({
          garment_id: item.garment_id,
          tipo: item.tipo as TipoItem,
          cantidad: item.cantidad || 1,
          esAccesorio: item.garments?.categoria === 'Accesorios',
        })))
      }

      if (pagosData) {
        setPagos(pagosData.map((p: any) => ({
          key: `edit-${p.id}`,
          monto: String(p.monto),
          fecha: p.fecha,
        })))
      }

      setLoadingEdit(false)
    }
    loadRental()
  }, [editRentalId])

  // Cerrar dropdowns al hacer click afuera
  useEffect(() => {
    if (!openVendedor && !openEntrega) return
    function close() { setOpenVendedor(false); setOpenEntrega(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openVendedor, openEntrega])

  // Revisar conflictos de fecha para alquileres
  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      setConflictingGarments(null)
      return
    }
    async function checkConflicts() {
      setCheckingConflicts(true)
      let query = supabase
        .from('rental_items')
        .select('garment_id, rental_id, rentals!inner(fecha_inicio, fecha_fin, estado)')
        .eq('rentals.estado', 'activo')
        .lte('rentals.fecha_inicio', fechaFin)
        .gte('rentals.fecha_fin', fechaInicio)
      if (editRentalId) {
        query = query.neq('rental_id', editRentalId)
      }
      const { data: items } = await query

      const ids = new Set<number>()
      const dates = new Map<number, string>()
      if (items) {
        for (const item of items) {
          ids.add(item.garment_id)
          const rental = Array.isArray(item.rentals) ? item.rentals[0] : item.rentals
          if (rental && !dates.has(item.garment_id)) {
            dates.set(item.garment_id, formatDateRange(rental.fecha_inicio, rental.fecha_fin))
          }
        }
      }
      setConflictingGarments(ids)
      setConflictingDates(dates)
      setCheckingConflicts(false)
    }
    checkConflicts()
  }, [fechaInicio, fechaFin])

  // Popup si alguna prenda en ALQUILER entra en conflicto con las fechas
  useEffect(() => {
    if (conflictingGarments === null) return
    const alquilerItems = selectedGarments.filter(item => item.tipo === 'alquiler')
    const conflictIds = alquilerItems
      .filter(item => conflictingGarments.has(item.prenda.id))
      .map(item => item.prenda.codigo)
    if (conflictIds.length > 0) {
      const detalles = alquilerItems
        .filter(item => conflictingGarments.has(item.prenda.id))
        .map(item => {
          const fechas = conflictingDates.get(item.prenda.id) || 'fecha no disponible'
          return `${item.prenda.codigo}: ${fechas}`
        })
        .join('\n')
      setConflictMessage(detalles)
      setShowConflictPopup(true)
    }
  }, [conflictingGarments])

  function handleSearch(value: string) {
    setSearchQuery(value)
    if (value.trim()) {
      const q = value.toLowerCase()
      setSearchResults(
        allGarments.filter(
          (g) =>
            g.codigo.toLowerCase().includes(q) &&
            !selectedGarments.find((s) => s.prenda.id === g.id)
        )
      )
    } else {
      setSearchResults([])
    }
  }

  function addGarment(g: Prenda) {
    const esAccesorio = g.categoria === 'Accesorios'

    // Accesorios: se manejan por stock y se venden. No aplican conflictos de fechas.
    if (esAccesorio) {
      if ((g.cantidad ?? 0) <= 0) {
        setConflictMessage(`${g.codigo} está agotado. Repón stock para poder venderlo.`)
        setShowConflictPopup(true)
        setSearchQuery('')
        setSearchResults([])
        setShowSearch(false)
        return
      }
      setSelectedGarments([...selectedGarments, { prenda: g, tipo: 'venta', precio: g.precio ? String(Math.round(g.precio)) : '', cantidad: '1' }])
      setSearchQuery('')
      setSearchResults([])
      setShowSearch(false)
      return
    }

    // Si ya hay fechas y esta prenda esta alquilada en un rango que se cruza, bloquear
    if (fechaInicio && fechaFin && conflictingGarments?.has(g.id)) {
      const fechas = conflictingDates.get(g.id) || 'esas fechas'
      setConflictMessage(`${g.codigo} ya esta alquilada del ${fechas}.\nElige otras fechas o quita el cruce.`)
      setShowConflictPopup(true)
      setSearchQuery('')
      setSearchResults([])
      setShowSearch(false)
      return
    }
    setSelectedGarments([...selectedGarments, { prenda: g, tipo: 'alquiler', precio: (g as any).precio ? String(Math.round((g as any).precio)) : '', cantidad: '1' }])
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }

  function updateGarmentCantidad(index: number, delta: number) {
    setSelectedGarments(prev => prev.map((item, i) => {
      if (i !== index) return item
      const max = item.prenda.cantidad ?? 1
      const next = Math.min(max, Math.max(1, (parseInt(item.cantidad) || 1) + delta))
      return { ...item, cantidad: String(next) }
    }))
  }

  // Suma/resta unidades al stock de un accesorio (lee el valor actual en BD)
  async function ajustarStock(garmentId: number, delta: number) {
    if (delta === 0) return
    const { data } = await supabase.from('garments').select('cantidad').eq('id', garmentId).single()
    const actual = data?.cantidad ?? 0
    await supabase.from('garments').update({ cantidad: Math.max(0, actual + delta) }).eq('id', garmentId)
  }

  // Avisar si ya existe un cliente con el mismo nombre y apellido
  async function checkNombreDuplicado() {
    const nombre = customerName.trim().replace(/\s+/g, ' ')
    if (nombre.split(' ').filter(Boolean).length < 2) { setNombreDuplicado(''); return }
    const { data } = await supabase
      .from('customers')
      .select('id, nombre')
      .ilike('nombre', nombre)
      .limit(1)
    setNombreDuplicado(data && data.length > 0 ? data[0].nombre : '')
  }

  function removeGarment(index: number) {
    setSelectedGarments(selectedGarments.filter((_, i) => i !== index))
  }

  function toggleTipoItem(index: number) {
    setSelectedGarments(prev => prev.map((item, i) =>
      i === index
        ? { ...item, tipo: item.tipo === 'alquiler' ? 'venta' : 'alquiler' }
        : item
    ))
  }

  function updateGarmentPrecio(index: number, raw: string) {
    const digits = raw.replace(/\D/g, '')
    setSelectedGarments(prev => prev.map((item, i) =>
      i === index ? { ...item, precio: digits } : item
    ))
  }

  // Total = suma automática del precio de cada prenda
  useEffect(() => {
    const suma = selectedGarments.reduce((s, it) => s + (parseInt(it.precio) || 0), 0)
    setTotal(suma ? String(suma) : '')
  }, [selectedGarments])

  // Pagos/abonos
  function addPago() {
    setPagos([...pagos, {
      key: Date.now().toString(),
      monto: '',
      fecha: new Date().toISOString().split('T')[0],
    }])
  }

  function removePago(key: string) {
    setPagos(pagos.filter(p => p.key !== key))
  }

  function updatePagoMonto(key: string, raw: string) {
    setPagos(pagos.map(p => p.key === key ? { ...p, monto: raw.replace(/\D/g, '') } : p))
  }

  function updatePagoFecha(key: string, fecha: string) {
    setPagos(pagos.map(p => p.key === key ? { ...p, fecha } : p))
  }

  const abonoTotal = pagos.reduce((sum, p) => sum + (parseInt(p.monto) || 0), 0)
  const deuda = (parseFloat(total) || 0) - abonoTotal
  const depositoNum = parseInt(deposito) || 0

  function formatPesos(value: string) {
    const num = parseInt(value.replace(/\D/g, ''), 10)
    if (isNaN(num)) return ''
    return num.toLocaleString('es-CO')
  }

  async function handleSave() {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Completa nombre y telefono del cliente')
      return
    }
    if (customerName.trim().split(/\s+/).filter(Boolean).length < 2) {
      setError('Ingresa nombre y apellido del cliente (mínimo 2 palabras)')
      return
    }
    if (!cedula.trim()) {
      setError('Ingresa la cedula del cliente')
      return
    }
    if (!vendedor) {
      setError('Selecciona un vendedor')
      return
    }
    if (selectedGarments.length === 0) {
      setError('Selecciona al menos una prenda')
      return
    }
    if (!fechaInicio || !fechaFin) {
      setError('Selecciona fecha de entrega y devolucion')
      return
    }
    if (!total || parseFloat(total) <= 0) {
      setError('Ingresa el precio de las prendas')
      return
    }

    // Verificar que los abonos no excedan el total
    if (abonoTotal > (parseFloat(total) || 0)) {
      setError('Los abonos no pueden exceder el total')
      return
    }

    setSaving(true)
    setError(null)

    // Verificar conflictos SOLO para items tipo 'alquiler'
    const alquilerIds = selectedGarments
      .filter(item => item.tipo === 'alquiler')
      .map(item => item.prenda.id)

    if (alquilerIds.length > 0) {
      let query = supabase
        .from('rental_items')
        .select('garment_id, rentals!inner(fecha_inicio, fecha_fin, estado)')
        .in('garment_id', alquilerIds)
        .eq('rentals.estado', 'activo')
        .lte('rentals.fecha_inicio', fechaFin)
        .gte('rentals.fecha_fin', fechaInicio)
      if (editRentalId) {
        query = query.neq('rental_id', editRentalId)
      }
      const { data: conflicts } = await query

      if (conflicts && conflicts.length > 0) {
        const ids = conflicts.map((c: any) => c.garment_id)
        const prendasConflicto = selectedGarments
          .filter(item => ids.includes(item.prenda.id))
          .map(item => item.prenda.codigo)
          .join(', ')
        setError(`Conflicto de fechas: ${prendasConflicto} ya estan alquiladas en ese rango`)
        setSaving(false)
        return
      }

      // Solo bloquear prendas vendidas; la disponibilidad por fechas ya se valido arriba.
      // Una prenda 'ocupado' puede alquilarse en fechas que no se crucen con sus otros alquileres.
      if (!editRentalId) {
        const vendidas = selectedGarments
          .filter(item => item.tipo === 'alquiler' && item.prenda.estado === 'vendido')
        if (vendidas.length > 0) {
          setError(`Prendas vendidas, no se pueden alquilar: ${vendidas.map(i => i.prenda.codigo).join(', ')}`)
          setSaving(false)
          return
        }
      }
    }

    // Verificar que las prendas a vender no esten ocupadas (solo en modo creacion)
    if (!editRentalId) {
      const ventaOcupadas = selectedGarments
        .filter(item => item.tipo === 'venta' && item.prenda.estado === 'ocupado' && item.prenda.categoria !== 'Accesorios')
      if (ventaOcupadas.length > 0) {
        setError(`No se puede vender prendas alquiladas: ${ventaOcupadas.map(i => i.prenda.codigo).join(', ')}`)
        setSaving(false)
        return
      }
    }

    // Verificar stock suficiente de accesorios a vender.
    // En edición, lo que esta misma factura ya tenía vendido se considera disponible
    // (porque al guardar primero se repone y luego se vuelve a descontar).
    const origAccQty: Record<number, number> = {}
    for (const o of editItemsOriginal) {
      if (o.esAccesorio && o.tipo === 'venta') {
        origAccQty[o.garment_id] = (origAccQty[o.garment_id] || 0) + o.cantidad
      }
    }
    for (const item of selectedGarments) {
      if (item.prenda.categoria === 'Accesorios' && item.tipo === 'venta') {
        const pedir = parseInt(item.cantidad) || 1
        const disponible = (item.prenda.cantidad ?? 0) + (origAccQty[item.prenda.id] || 0)
        if (pedir > disponible) {
          setError(`No hay suficiente stock de ${item.prenda.codigo}: quedan ${item.prenda.cantidad ?? 0}, pediste ${pedir}`)
          setSaving(false)
          return
        }
      }
    }

    // Crear o recuperar cliente
    let customerId: number
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('telefono', customerPhone.trim())
      .limit(1)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
      await supabase
        .from('customers')
        .update({ cedula: cedula.trim(), direccion: direccion.trim() })
        .eq('id', customerId)
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          nombre: customerName.trim(),
          telefono: customerPhone.trim(),
          cedula: cedula.trim(),
          direccion: direccion.trim(),
        })
        .select()
        .single()

      if (customerError || !newCustomer) {
        setError('Error al guardar cliente')
        setSaving(false)
        return
      }
      customerId = newCustomer.id
    }

    if (editRentalId) {
      // ===== MODO EDICION =====
      // 1. Revertir garments originales a disponible (accesorios NO usan estado)
      const origAlquilerIds = editItemsOriginal
        .filter(i => i.tipo === 'alquiler' && !i.esAccesorio)
        .map(i => i.garment_id)
      const origVentaIds = editItemsOriginal
        .filter(i => i.tipo === 'venta' && !i.esAccesorio)
        .map(i => i.garment_id)

      if (origAlquilerIds.length > 0) {
        await supabase.from('garments').update({ estado: 'disponible' }).in('id', origAlquilerIds)
      }
      if (origVentaIds.length > 0) {
        await supabase.from('garments').update({ estado: 'disponible' }).in('id', origVentaIds)
      }

      // 1b. Reponer el stock que la venta original había descontado de los accesorios
      for (const id of Object.keys(origAccQty).map(Number)) {
        await ajustarStock(id, origAccQty[id])
      }

      // 2. UPDATE rental
      const { error: updateError } = await supabase
        .from('rentals')
        .update({
          customer_id: customerId,
          vendedor: vendedor,
          cedula: cedula.trim(),
          direccion: direccion.trim(),
          quien_entrega: quienEntrega.trim() || null,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          monto_total: parseFloat(total),
          abono: 0,
          deposito: depositoNum,
        })
        .eq('id', editRentalId)

      if (updateError) {
        setError('Error al actualizar factura: ' + updateError.message)
        setSaving(false)
        return
      }

      // 3. Eliminar items viejos y pagos viejos
      await supabase.from('rental_items').delete().eq('rental_id', editRentalId)
      await supabase.from('pagos').delete().eq('rental_id', editRentalId)

      // 4. Insertar nuevos items
      const items = selectedGarments.map(item => ({
        rental_id: editRentalId,
        garment_id: item.prenda.id,
        precio: parseInt(item.precio) || 0,
        tipo: item.tipo,
        cantidad: item.prenda.categoria === 'Accesorios' ? (parseInt(item.cantidad) || 1) : 1,
      }))

      const { error: itemsError } = await supabase
        .from('rental_items')
        .insert(items)

      if (itemsError) {
        setError('Error al actualizar prendas: ' + itemsError.message)
        setSaving(false)
        return
      }

      // 5. Insertar nuevos pagos
      const pagosToInsert = pagos
        .filter(p => (parseInt(p.monto) || 0) > 0)
        .map(p => ({
          rental_id: editRentalId,
          monto: parseInt(p.monto) || 0,
          fecha: p.fecha,
        }))

      if (pagosToInsert.length > 0) {
        await supabase.from('pagos').insert(pagosToInsert)
      }

      // 6. Actualizar abono total
      const { data: pagosSum } = await supabase
        .from('pagos')
        .select('monto')
        .eq('rental_id', editRentalId)

      const totalAbonado = pagosSum?.reduce((sum, p) => sum + p.monto, 0) || 0
      await supabase
        .from('rentals')
        .update({ abono: totalAbonado })
        .eq('id', editRentalId)

      // 7. Nuevo estado de garments (accesorios NO usan estado, van por stock)
      const alquilerGarmentIds = selectedGarments
        .filter(item => item.tipo === 'alquiler' && item.prenda.categoria !== 'Accesorios')
        .map(item => item.prenda.id)
      const ventaGarmentIds = selectedGarments
        .filter(item => item.tipo === 'venta' && item.prenda.categoria !== 'Accesorios')
        .map(item => item.prenda.id)

      if (alquilerGarmentIds.length > 0) {
        await supabase.from('garments').update({ estado: 'ocupado' }).in('id', alquilerGarmentIds)
      }
      if (ventaGarmentIds.length > 0) {
        await supabase.from('garments').update({ estado: 'vendido' }).in('id', ventaGarmentIds)
      }

      // 7b. Descontar stock de los accesorios vendidos en esta factura
      for (const item of selectedGarments) {
        if (item.prenda.categoria === 'Accesorios' && item.tipo === 'venta') {
          await ajustarStock(item.prenda.id, -(parseInt(item.cantidad) || 1))
        }
      }

      setSaving(false)
      setShowPopup(true)
      if (onSaved) onSaved()
    } else {
      // ===== MODO CREACION =====
      // Insertar rental (codigo se genera via trigger en BD)
      const { data: rental, error: rentalError } = await supabase
        .from('rentals')
        .insert({
          customer_id: customerId,
          vendedor: vendedor,
          cedula: cedula.trim(),
          direccion: direccion.trim(),
          quien_entrega: quienEntrega.trim() || null,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          monto_total: parseFloat(total),
          abono: 0,
          deposito: depositoNum,
          estado: 'activo',
        })
        .select()
        .single()

      if (rentalError || !rental) {
        setError('Error al crear factura: ' + (rentalError?.message || ''))
        setSaving(false)
        return
      }

      setSavedCodigo(rental.codigo)

      // Insertar rental_items
      const items = selectedGarments.map(item => ({
        rental_id: rental.id,
        garment_id: item.prenda.id,
        precio: parseInt(item.precio) || 0,
        tipo: item.tipo,
        cantidad: item.prenda.categoria === 'Accesorios' ? (parseInt(item.cantidad) || 1) : 1,
      }))

      const { error: itemsError } = await supabase
        .from('rental_items')
        .insert(items)

      if (itemsError) {
        setError('Error al agregar prendas: ' + itemsError.message)
        setSaving(false)
        return
      }

      // Insertar pagos
      const pagosToInsert = pagos
        .filter(p => (parseInt(p.monto) || 0) > 0)
        .map(p => ({
          rental_id: rental.id,
          monto: parseInt(p.monto) || 0,
          fecha: p.fecha,
        }))

      if (pagosToInsert.length > 0) {
        const { error: pagosError } = await supabase
          .from('pagos')
          .insert(pagosToInsert)

        if (pagosError) {
          setError('Error al guardar abonos: ' + pagosError.message)
          setSaving(false)
          return
        }
      }

      // Actualizar abono total en rental
      const { data: pagosSum } = await supabase
        .from('pagos')
        .select('monto')
        .eq('rental_id', rental.id)

      const totalAbonado = pagosSum?.reduce((sum, p) => sum + p.monto, 0) || 0
      await supabase
        .from('rentals')
        .update({ abono: totalAbonado })
        .eq('id', rental.id)

      // Actualizar estado de garments (accesorios NO usan estado, van por stock)
      const alquilerGarmentIds = selectedGarments
        .filter(item => item.tipo === 'alquiler' && item.prenda.categoria !== 'Accesorios')
        .map(item => item.prenda.id)
      const ventaGarmentIds = selectedGarments
        .filter(item => item.tipo === 'venta' && item.prenda.categoria !== 'Accesorios')
        .map(item => item.prenda.id)

      // Descontar stock de los accesorios vendidos
      for (const item of selectedGarments) {
        if (item.prenda.categoria === 'Accesorios' && item.tipo === 'venta') {
          await ajustarStock(item.prenda.id, -(parseInt(item.cantidad) || 1))
        }
      }

      if (alquilerGarmentIds.length > 0) {
        await supabase
          .from('garments')
          .update({ estado: 'ocupado' })
          .in('id', alquilerGarmentIds)
      }
      if (ventaGarmentIds.length > 0) {
        await supabase
          .from('garments')
          .update({ estado: 'vendido' })
          .in('id', ventaGarmentIds)
      }

      setSaving(false)
      setShowPopup(true)
    }
  }

  const inputStyle = {
    background: 'var(--field-bg)',
    border: '1px solid var(--field-border)',
  }

  const cardStyle = {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
  }

  // Datos de la factura para el comprobante (mismo diseño que en el Historial)
  function datosComprobante(): ComprobanteData {
    return {
      codigo: savedCodigo,
      cliente: customerName.trim(),
      cedula: cedula.trim(),
      telefono: customerPhone.trim(),
      vendedor: vendedor || '',
      direccion: direccion.trim(),
      quienEntrega: quienEntrega.trim(),
      prendas: selectedGarments.map((item) => ({
        codigo: item.prenda.codigo,
        nombre: item.prenda.nombre,
        tipo: item.tipo,
        precio: parseInt(item.precio) || 0,
        cantidad: parseInt(item.cantidad) || 1,
      })),
      pagos: pagos
        .filter((p) => (parseInt(p.monto) || 0) > 0)
        .map((p) => ({ fecha: p.fecha, monto: parseInt(p.monto) || 0 })),
      total: parseFloat(total) || 0,
      abonado: abonoTotal,
      deposito: depositoNum,
      fechaInicio,
      fechaFin,
    }
  }

  // Abre directo el chat del cliente en WhatsApp (aunque no este en los contactos)
  // con el resumen escrito, y deja la imagen de la factura copiada para pegarla.
  function handleShareReceipt() {
    compartirComprobante(datosComprobante())
  }

  return (
    <div className="space-y-5">
      {loadingEdit ? (
        <div className="text-center py-8">
          <p className="text-text-secondary">Cargando factura...</p>
        </div>
      ) : (
        <>
      {!inPopup && !editRentalId && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:brightness-125 transition-all"
            style={{
              background: 'var(--glass-strong)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <h2 className="text-lg font-bold text-text-primary">Factura / Alquiler</h2>
        </div>
      )}
      {inPopup && !editRentalId && (
        <h2 className="text-lg font-bold text-text-primary mb-5">Factura / Alquiler</h2>
      )}

      {/* Cliente */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Nombre del cliente
          </label>
          <div className="relative">
            <User
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
              aria-hidden="true"
            />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onBlur={checkNombreDuplicado}
              placeholder="Nombre y apellido"
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={inputStyle}
            />
          </div>
          {nombreDuplicado && !editRentalId && (
            <p className="mt-1.5 text-xs flex items-center gap-1.5" style={{ color: '#B7791F' }}>
              <Warning className="w-3.5 h-3.5 shrink-0" />
              Ya existe un cliente llamado «{nombreDuplicado}». Verifica que no sea un duplicado.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Cedula
            </label>
            <div className="relative">
              <IdentificationCard
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
                aria-hidden="true"
              />
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej: 12345678"
                className="w-full rounded-[12px] pl-11 pr-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Telefono
            </label>
            <div className="relative">
              <Phone
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
                aria-hidden="true"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="300 123 4567"
                className="w-full rounded-[12px] pl-11 pr-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Direccion
          </label>
          <div className="relative">
            <MapPin
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
              aria-hidden="true"
            />
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Direccion del cliente"
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Datos de factura */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Vendedor
          </label>
          <div className="relative">
            <Receipt
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenVendedor(!openVendedor) }}
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-base text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={{
                ...inputStyle,
                color: vendedor ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {vendedor || 'Seleccionar'}
              <CaretDown className="w-5 h-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
            </button>
            {openVendedor && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full mt-1 left-0 right-0 rounded-[12px] py-1 z-20"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                }}
              >
                {VENDEDORES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setVendedor(v); setOpenVendedor(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-all hover:brightness-150"
                    style={{
                      color: vendedor === v ? 'var(--accent)' : 'var(--text-primary)',
                      background: vendedor === v ? 'rgba(201,163,90,0.08)' : 'transparent',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Quien entrega
          </label>
          <div className="relative">
            <HandPalm
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenEntrega(!openEntrega); setOpenVendedor(false) }}
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-base text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={{
                ...inputStyle,
                color: quienEntrega ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {quienEntrega || 'Opcional'}
              <CaretDown className="w-5 h-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
            </button>
            {openEntrega && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full mt-1 left-0 right-0 rounded-[12px] py-1 z-20"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                }}
              >
                {VENDEDORES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setQuienEntrega(v); setOpenEntrega(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-all hover:brightness-150"
                    style={{
                      color: quienEntrega === v ? 'var(--accent)' : 'var(--text-primary)',
                      background: quienEntrega === v ? 'rgba(201,163,90,0.08)' : 'transparent',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prendas */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Prendas
        </label>

        {/* Lista de prendas seleccionadas */}
        {selectedGarments.length > 0 && (
          <div className="space-y-2 mb-2">
            {selectedGarments.map((item, index) => (
              <div
                key={item.prenda.id}
                className="flex items-center gap-2 px-3 py-2 rounded-[12px]"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <CoatHanger className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {item.prenda.codigo}
                  </p>
                  <p className="text-xs text-text-tertiary truncate">{item.prenda.nombre}</p>
                </div>
                {/* Toggle alquiler/venta */}
                <div
                  className="flex rounded-[8px] overflow-hidden shrink-0"
                  style={{ border: '1px solid var(--accent-border)' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (item.tipo !== 'alquiler') toggleTipoItem(index)
                    }}
                    className="px-2.5 py-1 text-xs font-semibold transition-all"
                    style={{
                      background: item.tipo === 'alquiler' ? 'var(--accent)' : 'transparent',
                      color: item.tipo === 'alquiler' ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    ALQ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.tipo !== 'venta') toggleTipoItem(index)
                    }}
                    className="px-2.5 py-1 text-xs font-semibold transition-all"
                    style={{
                      background: item.tipo === 'venta' ? 'var(--accent)' : 'transparent',
                      color: item.tipo === 'venta' ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    VTA
                  </button>
                </div>
                {/* Cantidad — solo accesorios */}
                {item.prenda.categoria === 'Accesorios' && (
                  <div
                    className="flex items-center rounded-[8px] overflow-hidden shrink-0"
                    style={{ border: '1px solid var(--accent-border)' }}
                  >
                    <button
                      type="button"
                      onClick={() => updateGarmentCantidad(index, -1)}
                      className="w-7 h-7 flex items-center justify-center text-sm font-bold text-text-secondary hover:brightness-125"
                      aria-label="Restar cantidad"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-text-primary">{item.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => updateGarmentCantidad(index, 1)}
                      className="w-7 h-7 flex items-center justify-center text-sm font-bold text-text-secondary hover:brightness-125 disabled:opacity-30"
                      disabled={(parseInt(item.cantidad) || 1) >= (item.prenda.cantidad ?? 1)}
                      aria-label="Sumar cantidad"
                    >
                      +
                    </button>
                  </div>
                )}
                {/* Precio de esta prenda */}
                <div className="relative shrink-0 w-[104px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-tertiary pointer-events-none">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatPesos(item.precio)}
                    onChange={(e) => updateGarmentPrecio(index, e.target.value)}
                    placeholder="0"
                    className="w-full rounded-[8px] pl-5 pr-2 py-1.5 text-xs text-right font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                    style={{ background: 'var(--field-bg)', border: '1px solid var(--accent-border)' }}
                  />
                </div>
                <button
                  onClick={() => removeGarment(index)}
                  className="shrink-0 hover:opacity-70 transition-opacity"
                  aria-label="Quitar prenda"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Buscador */}
        {showSearch ? (
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar prenda por codigo..."
              className="w-full rounded-[12px] pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none"
              style={{
                ...inputStyle,
                border: '1px solid var(--accent-border)',
              }}
              autoFocus
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            />
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"
              aria-hidden="true"
            />
            {searchResults.length > 0 && (
              <div
                className="absolute top-full mt-1 left-0 right-0 rounded-[12px] shadow-lg z-10 max-h-40 overflow-y-auto"
                style={cardStyle}
              >
                {searchResults.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => addGarment(g)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:brightness-125 transition-all flex items-center justify-between"
                  >
                    <span className="text-text-primary font-medium">{g.codigo}</span>
                    <span className="text-text-tertiary text-xs">{g.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : checkingConflicts ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-text-tertiary">
            Verificando disponibilidad...
          </span>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-dashed rounded-full text-sm font-medium transition-all hover:brightness-125"
            style={{
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
            }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Agregar por codigo
          </button>
        )}
      </div>

      {/* Fechas */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary mb-2">
          <CalendarBlank className="w-4 h-4" aria-hidden="true" />
          Fechas
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <DatePicker
              label="Entrega"
              value={fechaInicio}
              onChange={setFechaInicio}
              placeholder="Entrega"
            />
          </div>
          <div className="min-w-0">
            <DatePicker
              label="Devolucion"
              value={fechaFin}
              onChange={setFechaFin}
              placeholder="Devolucion"
              min={fechaInicio}
              align="right"
            />
          </div>
        </div>
      </div>

      {/* Abonos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text-secondary">
            Abonos
          </label>
          <button
            type="button"
            onClick={addPago}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all hover:brightness-110 text-white"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)', boxShadow: '0 3px 10px rgba(184,134,11,0.28)' }}
          >
            <Money className="w-3.5 h-3.5" />
            Agregar abono
          </button>
        </div>

        {pagos.length > 0 && (
          <div className="space-y-2">
            {pagos.map((p) => (
              <div
                key={p.key}
                className="flex items-center gap-2 px-3 py-2 rounded-[12px]"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div style={{ width: '140px' }}>
                  <DatePicker
                    value={p.fecha}
                    onChange={(val) => updatePagoFecha(p.key, val)}
                    placeholder="Fecha"
                  />
                </div>
                <div className="relative flex-1">
                  <Money
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatPesos(p.monto)}
                    onChange={(e) => updatePagoMonto(p.key, e.target.value)}
                    placeholder="0"
                    className="w-full rounded-[8px] pl-9 pr-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                    style={inputStyle}
                  />
                </div>
                <button
                  onClick={() => removePago(p.key)}
                  className="shrink-0 hover:opacity-70 transition-opacity"
                  aria-label="Quitar abono"
                >
                  <Trash className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                </button>
              </div>
            ))}
            <p
              className="text-xs font-medium text-right"
              style={{ color: 'var(--success)' }}
            >
              Total abonado: {abonoTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
            </p>
          </div>
        )}

        {pagos.length === 0 && (
          <p className="text-xs text-text-tertiary">Sin abonos registrados</p>
        )}
      </div>

      {/* Totales */}
      <div
        className="rounded-[16px] p-4 space-y-3"
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(201,168,76,0.22)',
          borderTop: '2px solid #C9A84C',
        }}
      >
        <h3 className="font-semibold text-text-primary text-sm">Totales</h3>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-text-tertiary">Total</label>
            <span className="text-[10px] text-text-tertiary">Suma de las prendas</span>
          </div>
          <div
            className="w-full rounded-[12px] px-4 py-2.5 text-base font-bold text-text-primary mt-1"
            style={{
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(50px) saturate(200%)',
              WebkitBackdropFilter: 'blur(50px) saturate(200%)',
              border: '1px solid rgba(0,0,0,0.10)',
            }}
          >
            {(parseFloat(total) || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--success)' }}>
              Abonado
            </label>
            <div
              className="w-full rounded-[12px] px-4 py-2.5 text-sm font-medium mt-1"
              style={{
                background: 'var(--field-bg)',
                border: '1px solid var(--field-border)',
                color: 'var(--success)',
              }}
            >
              {abonoTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: deuda > 0 ? 'var(--danger)' : 'var(--success)' }}>
              Deuda
            </label>
            <div
              className="w-full rounded-[12px] px-4 py-2.5 text-sm font-medium mt-1"
              style={{
                background: 'var(--field-bg)',
                border: '1px solid var(--field-border)',
                color: deuda > 0 ? 'var(--danger)' : 'var(--success)',
              }}
            >
              {(deuda > 0 ? deuda : 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Deposito: no suma al total, se le devuelve al cliente cuando trae el traje */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">Deposito</label>
            <span className="text-[10px] text-text-tertiary">Se devuelve cuando traen el traje</span>
          </div>
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-tertiary pointer-events-none">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={formatPesos(deposito)}
              onChange={(e) => setDeposito(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="w-full rounded-[12px] pl-8 pr-4 py-2.5 text-sm font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={{ background: 'var(--field-bg)', border: '1px solid var(--field-border)' }}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-center font-medium" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 text-white font-semibold rounded-[14px] transition-all hover:brightness-110 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #A8823A 100%)', boxShadow: '0 6px 18px rgba(184,134,11,0.30)' }}
      >
        {saving ? 'Guardando...' : editRentalId ? 'Guardar cambios' : 'Registrar factura'}
      </button>

      {/* Popup de conflicto de fechas */}
      {showConflictPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)' }}
          onClick={() => setShowConflictPopup(false)}
        >
          <div
            className="w-full max-w-[340px] rounded-[24px] px-5 pt-6 pb-5 text-center space-y-4"
            style={{
              background: 'var(--surface)',
              border: '1px solid rgba(201,168,76,0.22)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{
                background: 'rgba(255,60,60,0.15)',
                border: '1px solid rgba(255,60,60,0.3)',
              }}
            >
              <Warning className="w-6 h-6" style={{ color: '#ff3b3b' }} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium" style={{ color: '#ff3b3b' }}>Conflicto de fechas</p>
            <p className="text-xs text-text-secondary whitespace-pre-line">{conflictMessage}</p>
            <button
              onClick={() => setShowConflictPopup(false)}
              className="w-full py-2.5 text-sm font-semibold rounded-[12px] transition-all hover:brightness-125"
              style={{
                background: 'var(--glass-strong)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Popup de exito */}
      {showPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(false) }}
        >
          <div
            className="w-full max-w-[380px] rounded-[28px] px-4 pt-5 pb-6 space-y-4"
            style={{
              background: 'var(--surface)',
              border: '1px solid rgba(201,168,76,0.22)',
              borderTop: '2px solid #C9A84C',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{
                  background: 'var(--success-bg)',
                  border: '1px solid var(--success-border)',
                }}
              >
                <Check className="w-7 h-7" style={{ color: 'var(--success)' }} aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">{editRentalId ? 'Factura actualizada' : 'Factura registrada'}</h3>
              {savedCodigo && (
                <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{savedCodigo}</p>
              )}
              <p className="text-sm text-text-secondary">
                {selectedGarments.filter(i => i.tipo === 'alquiler').length > 0 && 'Prendas alquiladas marcadas como ocupadas. '}
                {selectedGarments.filter(i => i.tipo === 'venta').length > 0 && 'Prendas vendidas marcadas como vendido.'}
              </p>
            </div>

            <button
              onClick={handleShareReceipt}
              className="w-full py-3.5 text-white font-semibold rounded-[14px] transition-all hover:brightness-110 flex items-center justify-center gap-2"
              style={{ background: '#25D366' }}
            >
              <WhatsappLogo className="w-5 h-5" aria-hidden="true" />
              Enviar comprobante a WhatsApp
            </button>
            <p className="text-xs text-center text-text-tertiary -mt-1">
              Se abre el chat del cliente. La imagen queda copiada: en el chat mantén presionado y toca <b>Pegar</b>.
            </p>

            <button
              onClick={() => {
                setShowPopup(false)
                if (inPopup && onClose) onClose()
                else navigate('/')
              }}
              className="w-full py-3.5 font-semibold rounded-[14px] transition-all hover:brightness-125"
              style={{
                ...cardStyle,
                color: 'var(--text-primary)',
              }}
            >
              Volver al inventario
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
