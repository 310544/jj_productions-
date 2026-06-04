import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateRange } from '../lib/formatDate'
import DatePicker from '../components/DatePicker'
import type { Prenda, Vendedor, TipoItem } from '../types'
import {
  IconUser, IconPhone, IconCalendar, IconX, IconPlus,
  IconSearch, IconBrandWhatsapp, IconHanger, IconArrowLeft, IconCheck,
  IconAlertTriangle, IconId, IconMapPin, IconHandStop,
  IconCash, IconTrash, IconReceipt, IconChevronDown,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

const VENDEDORES: Vendedor[] = ['Jhoan Becerra', 'Karen', 'Barbara']

interface GarmentSeleccionada {
  prenda: Prenda
  tipo: TipoItem
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [savedCodigo, setSavedCodigo] = useState('')
  const [openVendedor, setOpenVendedor] = useState(false)
  const [openEntrega, setOpenEntrega] = useState(false)

  const [conflictingGarments, setConflictingGarments] = useState<Set<number> | null>(null)
  const [conflictingDates, setConflictingDates] = useState<Map<number, string>>(new Map())
  const [checkingConflicts, setCheckingConflicts] = useState(false)
  const [showConflictPopup, setShowConflictPopup] = useState(false)
  const [conflictMessage, setConflictMessage] = useState('')
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [editItemsOriginal, setEditItemsOriginal] = useState<{ garment_id: number; tipo: TipoItem }[]>([])

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
      setSavedCodigo(rental.codigo || '')

      if (items) {
        const mapped: GarmentSeleccionada[] = items.map((item: any) => ({
          prenda: item.garments,
          tipo: item.tipo as TipoItem,
        }))
        setSelectedGarments(mapped)
        setEditItemsOriginal(items.map((item: any) => ({
          garment_id: item.garment_id,
          tipo: item.tipo as TipoItem,
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
    setSelectedGarments([...selectedGarments, { prenda: g, tipo: 'alquiler' }])
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
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

  function formatPesos(value: string) {
    const num = parseInt(value.replace(/\D/g, ''), 10)
    if (isNaN(num)) return ''
    return num.toLocaleString('es-CO')
  }

  function handleTotalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    setTotal(raw)
  }

  async function handleSave() {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Completa nombre y telefono del cliente')
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
      setError('Ingresa el monto total')
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
        .filter(item => item.tipo === 'venta' && item.prenda.estado === 'ocupado')
      if (ventaOcupadas.length > 0) {
        setError(`No se puede vender prendas alquiladas: ${ventaOcupadas.map(i => i.prenda.codigo).join(', ')}`)
        setSaving(false)
        return
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
      // 1. Revertir garments originales a disponible
      const origAlquilerIds = editItemsOriginal
        .filter(i => i.tipo === 'alquiler')
        .map(i => i.garment_id)
      const origVentaIds = editItemsOriginal
        .filter(i => i.tipo === 'venta')
        .map(i => i.garment_id)

      if (origAlquilerIds.length > 0) {
        await supabase.from('garments').update({ estado: 'disponible' }).in('id', origAlquilerIds)
      }
      if (origVentaIds.length > 0) {
        await supabase.from('garments').update({ estado: 'disponible' }).in('id', origVentaIds)
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
        precio: item.prenda.precio || 0,
        tipo: item.tipo,
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

      // 7. Nuevo estado de garments
      const alquilerGarmentIds = selectedGarments
        .filter(item => item.tipo === 'alquiler')
        .map(item => item.prenda.id)
      const ventaGarmentIds = selectedGarments
        .filter(item => item.tipo === 'venta')
        .map(item => item.prenda.id)

      if (alquilerGarmentIds.length > 0) {
        await supabase.from('garments').update({ estado: 'ocupado' }).in('id', alquilerGarmentIds)
      }
      if (ventaGarmentIds.length > 0) {
        await supabase.from('garments').update({ estado: 'vendido' }).in('id', ventaGarmentIds)
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
        precio: item.prenda.precio || 0,
        tipo: item.tipo,
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

      // Actualizar estado de garments
      const alquilerGarmentIds = selectedGarments
        .filter(item => item.tipo === 'alquiler')
        .map(item => item.prenda.id)
      const ventaGarmentIds = selectedGarments
        .filter(item => item.tipo === 'venta')
        .map(item => item.prenda.id)

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

  async function generateReceiptImage(): Promise<Blob | null> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const scale = 3
    const w = 500
    const pad = 30
    const headerH = 92
    const FONT = 'Plus Jakarta Sans, system-ui, sans-serif'

    const money = (n: number) =>
      n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

    const itemsCount = selectedGarments.length
    const validPagos = pagos.filter(p => (parseInt(p.monto) || 0) > 0)
    const pagosCount = validPagos.length
    const clientRows = 1 + 1 + (direccion.trim() ? 1 : 0) + 1 + (quienEntrega.trim() ? 1 : 0)
    const totalsBoxH = 122

    // Altura dinamica (debe coincidir con los incrementos de dibujo)
    let H = headerH + 30
    H += 18 + clientRows * 24 + 22                 // datos cliente + divisor
    H += 18 + itemsCount * 26 + 22                 // prendas + divisor
    if (pagosCount > 0) H += 18 + pagosCount * 24 + 22
    H += totalsBoxH + 18
    H += 26 + 22                                   // footer + pad inferior

    canvas.width = w * scale
    canvas.height = H * scale
    ctx.scale(scale, scale)

    // Fondo (esquinas redondeadas, transparentes fuera)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(0, 0, w, H, 20)
    ctx.fill()

    // ===== Header smoking =====
    const hg = ctx.createLinearGradient(0, 0, w, headerH)
    hg.addColorStop(0, '#231D15')
    hg.addColorStop(1, '#14110B')
    ctx.fillStyle = hg
    ctx.beginPath()
    ctx.roundRect(0, 0, w, headerH, [20, 20, 0, 0])
    ctx.fill()

    // Marca
    ctx.textAlign = 'left'
    ctx.fillStyle = '#E8C766'
    ctx.font = `800 24px ${FONT}`
    ctx.fillText('JJ PRODUCTION', pad, 44)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = `500 11px ${FONT}`
    ctx.fillText('Alquiler & Venta de Trajes', pad, 64)

    // Factura # (derecha)
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = `600 10px ${FONT}`
    ctx.fillText('FACTURA', w - pad, 38)
    ctx.fillStyle = '#F2E4BC'
    ctx.font = `800 18px ${FONT}`
    ctx.fillText(savedCodigo, w - pad, 60)
    ctx.textAlign = 'left'

    // Barra de acento dorada
    const gb = ctx.createLinearGradient(0, 0, w, 0)
    gb.addColorStop(0, '#D4AF37')
    gb.addColorStop(1, '#A8823A')
    ctx.fillStyle = gb
    ctx.fillRect(0, headerH, w, 4)

    let y = headerH + 36

    const sectionTitle = (t: string) => {
      ctx.fillStyle = '#A8823A'
      ctx.font = `700 11px ${FONT}`
      ctx.fillText(t.toUpperCase(), pad, y)
      y += 18
    }
    const divider = () => {
      y += 8
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pad, y)
      ctx.lineTo(w - pad, y)
      ctx.stroke()
      y += 14
    }
    const row = (label: string, value: string) => {
      ctx.fillStyle = '#9A9488'
      ctx.font = `500 12px ${FONT}`
      ctx.fillText(label, pad, y)
      const lw = ctx.measureText(label).width
      ctx.fillStyle = '#1C1A14'
      ctx.font = `600 12px ${FONT}`
      ctx.fillText(value, pad + lw + 8, y)
      y += 24
    }

    // ===== Datos del cliente =====
    sectionTitle('Datos del cliente')
    row('Cliente', customerName.trim() || '-')
    row('Cédula / Tel', `${cedula.trim() || '-'}  ·  ${customerPhone.trim() || '-'}`)
    if (direccion.trim()) row('Dirección', direccion.trim())
    row('Vendedor', vendedor)
    if (quienEntrega.trim()) row('Entrega', quienEntrega.trim())
    divider()

    // ===== Prendas =====
    sectionTitle(`Prendas (${itemsCount})`)
    for (const item of selectedGarments) {
      const isAlq = item.tipo === 'alquiler'
      // pill ALQ/VTA
      const pillW = 36
      ctx.fillStyle = isAlq ? 'rgba(201,168,76,0.16)' : 'rgba(0,0,0,0.06)'
      ctx.beginPath()
      ctx.roundRect(pad, y - 11, pillW, 16, 5)
      ctx.fill()
      ctx.fillStyle = isAlq ? '#A8823A' : '#7A746A'
      ctx.font = `700 9px ${FONT}`
      ctx.textAlign = 'center'
      ctx.fillText(isAlq ? 'ALQ' : 'VTA', pad + pillW / 2, y)
      ctx.textAlign = 'left'
      // nombre
      ctx.fillStyle = '#1C1A14'
      ctx.font = `600 12px ${FONT}`
      ctx.fillText(item.prenda.codigo, pad + pillW + 10, y)
      const cw = ctx.measureText(item.prenda.codigo).width
      ctx.fillStyle = '#9A9488'
      ctx.font = `400 12px ${FONT}`
      ctx.fillText(`  ${item.prenda.nombre}`, pad + pillW + 10 + cw, y)
      y += 26
    }
    divider()

    // ===== Abonos =====
    if (pagosCount > 0) {
      sectionTitle(`Abonos (${pagosCount})`)
      for (const p of validPagos) {
        const monto = parseInt(p.monto) || 0
        ctx.fillStyle = '#9A9488'
        ctx.font = `400 12px ${FONT}`
        ctx.fillText(p.fecha, pad, y)
        ctx.textAlign = 'right'
        ctx.fillStyle = '#16a34a'
        ctx.font = `600 12px ${FONT}`
        ctx.fillText(money(monto), w - pad, y)
        ctx.textAlign = 'left'
        y += 24
      }
      divider()
    }

    // ===== Caja de totales =====
    const pagado = deuda <= 0
    const boxTop = y
    ctx.fillStyle = '#FBF6E7'
    ctx.strokeStyle = 'rgba(201,168,76,0.40)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(pad, boxTop, w - pad * 2, totalsBoxH, 14)
    ctx.fill()
    ctx.stroke()

    const bx = pad + 18
    const bxr = w - pad - 18
    let by = boxTop + 28

    const totalRow = (label: string, value: string, color: string, bold = false) => {
      ctx.textAlign = 'left'
      ctx.fillStyle = '#7A746A'
      ctx.font = `500 12px ${FONT}`
      ctx.fillText(label, bx, by)
      ctx.textAlign = 'right'
      ctx.fillStyle = color
      ctx.font = `${bold ? 800 : 700} ${bold ? 15 : 13}px ${FONT}`
      ctx.fillText(value, bxr, by)
      ctx.textAlign = 'left'
    }

    totalRow('Total', money(parseFloat(total) || 0), '#1C1A14')
    by += 26
    totalRow('Abonado', money(abonoTotal), '#16a34a')
    by += 14
    ctx.strokeStyle = 'rgba(201,168,76,0.30)'
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bxr, by)
    ctx.stroke()
    by += 24

    if (pagado) {
      ctx.textAlign = 'left'
      ctx.fillStyle = '#7A746A'
      ctx.font = `500 12px ${FONT}`
      ctx.fillText('Estado', bx, by)
      // badge PAGADO
      ctx.textAlign = 'right'
      ctx.font = `800 12px ${FONT}`
      const txt = 'PAGADO'
      const tw = ctx.measureText(txt).width
      ctx.fillStyle = 'rgba(22,163,74,0.14)'
      ctx.beginPath()
      ctx.roundRect(bxr - tw - 20, by - 14, tw + 20, 20, 10)
      ctx.fill()
      ctx.fillStyle = '#16a34a'
      ctx.fillText(txt, bxr - 10, by)
      ctx.textAlign = 'left'
    } else {
      totalRow('Saldo pendiente', money(deuda), '#dc2626', true)
    }

    y = boxTop + totalsBoxH + 24

    // ===== Footer =====
    ctx.textAlign = 'center'
    ctx.fillStyle = '#9A9488'
    ctx.font = `500 11px ${FONT}`
    ctx.fillText(`Entrega ${fechaInicio}   ·   Devolución ${fechaFin}`, w / 2, y)
    ctx.textAlign = 'left'

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
  }

  async function handleShareReceipt() {
    const blob = await generateReceiptImage()
    if (!blob) return

    const file = new File([blob], 'comprobante-rentatraje.png', { type: 'image/png' })

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Comprobante RentaTraje',
        })
        return
      } catch {}
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'comprobante-rentatraje.png'
    a.click()
    URL.revokeObjectURL(url)

    const phone = customerPhone.trim().replace(/\D/g, '')
    const formatCOP = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
    const itemsText = selectedGarments.map(item =>
      `• ${item.tipo === 'alquiler' ? 'ALQ' : 'VTA'} ${item.prenda.codigo} - ${item.prenda.nombre}`
    ).join('%0A')
    const pagado = deuda <= 0

    const msg =
      `*JJ PRODUCTION*%0A_Alquiler & Venta de Trajes_%0A%0A` +
      `*Factura ${savedCodigo}*%0A` +
      `━━━━━━━━━━━━━%0A` +
      `*Cliente:* ${customerName.trim()}%0A` +
      `*Cédula:* ${cedula.trim()}%0A` +
      `*Vendedor:* ${vendedor}%0A%0A` +
      `*Prendas:*%0A${itemsText}%0A%0A` +
      `━━━━━━━━━━━━━%0A` +
      `Total:  *${formatCOP(parseFloat(total) || 0)}*%0A` +
      `Abonado:  ${formatCOP(abonoTotal)}%0A` +
      (pagado ? `*✅ PAGADO*` : `*Saldo pendiente:  ${formatCOP(deuda)}*`) +
      `%0A%0A_Entrega ${fechaInicio}  ·  Devolución ${fechaFin}_`
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
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
            <IconArrowLeft className="w-5 h-5" aria-hidden="true" />
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
            <IconUser
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
              aria-hidden="true"
            />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre completo"
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Cedula
            </label>
            <div className="relative">
              <IconId
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
              <IconPhone
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
                aria-hidden="true"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+54 11 1234-5678"
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
            <IconMapPin
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
            <IconReceipt
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
              <IconChevronDown className="w-5 h-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
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
            <IconHandStop
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
              <IconChevronDown className="w-5 h-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
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
                <IconHanger className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
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
                <button
                  onClick={() => removeGarment(index)}
                  className="shrink-0 hover:opacity-70 transition-opacity"
                  aria-label="Quitar prenda"
                >
                  <IconX className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
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
            <IconSearch
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
            <IconPlus className="w-4 h-4" aria-hidden="true" />
            Agregar por codigo
          </button>
        )}
      </div>

      {/* Fechas */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary mb-2">
          <IconCalendar className="w-4 h-4" aria-hidden="true" />
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
            <IconCash className="w-3.5 h-3.5" />
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
                  <IconCash
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
                  <IconTrash className="w-4 h-4" style={{ color: 'var(--danger)' }} />
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
          <label className="text-xs text-text-tertiary">Total acordado</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatPesos(total)}
            onChange={handleTotalChange}
            placeholder="50.000"
            className="w-full rounded-[12px] px-4 py-2.5 text-sm text-text-primary mt-1 focus:outline-none focus:ring-2 focus:ring-accent/40"
            style={{
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(50px) saturate(200%)',
              WebkitBackdropFilter: 'blur(50px) saturate(200%)',
              border: '1px solid rgba(0,0,0,0.10)',
            }}
          />
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
              <IconAlertTriangle className="w-6 h-6" style={{ color: '#ff3b3b' }} aria-hidden="true" />
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
                <IconCheck className="w-7 h-7" style={{ color: 'var(--success)' }} aria-hidden="true" />
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
              <IconBrandWhatsapp className="w-5 h-5" aria-hidden="true" />
              Enviar comprobante a WhatsApp
            </button>

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
