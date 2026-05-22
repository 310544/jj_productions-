import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Prenda } from '../types'
import {
  IconUser, IconPhone, IconCalendar, IconX, IconPlus,
  IconSearch, IconBrandWhatsapp, IconHanger, IconArrowLeft, IconCheck,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

export default function Alquiler() {
  const navigate = useNavigate()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedGarments, setSelectedGarments] = useState<Prenda[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Prenda[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [allGarments, setAllGarments] = useState<Prenda[]>([])
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [fechaFin, setFechaFin] = useState('')
  const [total, setTotal] = useState('')
  const [pagado, setPagado] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    supabase
      .from('garments')
      .select('*')
      .eq('estado', 'disponible')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setAllGarments(data)
      })
  }, [])

  function handleSearch(value: string) {
    setSearchQuery(value)
    if (value.trim()) {
      const q = value.toLowerCase()
      setSearchResults(
        allGarments.filter(
          (g) =>
            g.codigo.toLowerCase().includes(q) &&
            !selectedGarments.find((s) => s.id === g.id)
        )
      )
    } else {
      setSearchResults([])
    }
  }

  function addGarment(g: Prenda) {
    setSelectedGarments([...selectedGarments, g])
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }

  function removeGarment(id: number) {
    setSelectedGarments(selectedGarments.filter((g) => g.id !== id))
  }

  const deuda = (parseFloat(total) || 0) - (parseFloat(pagado) || 0)

  async function handleSave() {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Completa nombre y telefono del cliente')
      return
    }
    if (selectedGarments.length === 0) {
      setError('Selecciona al menos una prenda')
      return
    }
    if (!fechaInicio || !fechaFin) {
      setError('Selecciona ambas fechas')
      return
    }
    if (!total || parseFloat(total) <= 0) {
      setError('Ingresa el monto total')
      return
    }

    setSaving(true)
    setError(null)

    let customerId: number
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('telefono', customerPhone.trim())
      .limit(1)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          nombre: customerName.trim(),
          telefono: customerPhone.trim(),
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

    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .insert({
        customer_id: customerId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        monto_total: parseFloat(total),
        abono: parseFloat(pagado) || 0,
        estado: 'activo',
      })
      .select()
      .single()

    if (rentalError || !rental) {
      setError('Error al crear alquiler: ' + (rentalError?.message || ''))
      setSaving(false)
      return
    }

    const items = selectedGarments.map((g) => ({
      rental_id: rental.id,
      garment_id: g.id,
      precio: g.precio || 0,
    }))

    const { error: itemsError } = await supabase
      .from('rental_items')
      .insert(items)

    if (itemsError) {
      setError('Error al agregar prendas: ' + itemsError.message)
      setSaving(false)
      return
    }

    await supabase
      .from('garments')
      .update({ estado: 'ocupado' })
      .in('id', selectedGarments.map((g) => g.id))

    setSaving(false)
    setShowPopup(true)
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

    const w = 500
    const pad = 30
    const lineH = 28
    let y = pad

    canvas.width = w

    // Altura dinamica
    const itemsCount = selectedGarments.length
    canvas.height = pad + 40 + 30 + (itemsCount * 22) + 30 + (lineH * 5) + pad + 10

    // Fondo blanco
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(0, 0, canvas.width, canvas.height, 16)
    ctx.fill()

    // Logo / titulo
    ctx.fillStyle = '#111111'
    ctx.font = 'bold 18px Plus Jakarta Sans, sans-serif'
    ctx.fillText('RentaTraje', pad, y)
    y += 18
    ctx.fillStyle = '#888888'
    ctx.font = '11px Plus Jakarta Sans, sans-serif'
    ctx.fillText('Comprobante de alquiler', pad, y)
    y += 28

    // Linea
    ctx.strokeStyle = '#e5e5e5'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, y)
    ctx.lineTo(w - pad, y)
    ctx.stroke()
    y += 18

    // Cliente
    ctx.fillStyle = '#333333'
    ctx.font = '13px Plus Jakarta Sans, sans-serif'
    ctx.fillText(`Cliente: ${customerName.trim()}`, pad, y)
    y += lineH
    ctx.fillText(`Telefono: ${customerPhone.trim()}`, pad, y)
    y += 24

    // Prendas
    ctx.fillStyle = '#111111'
    ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif'
    ctx.fillText('Prendas:', pad, y)
    y += lineH
    ctx.fillStyle = '#444444'
    ctx.font = '12px Plus Jakarta Sans, sans-serif'
    for (const g of selectedGarments) {
      ctx.fillText(`${g.codigo}  —  ${g.nombre}`, pad + 10, y)
      y += 22
    }
    y += 10

    // Totales
    const formatCOP = (n: number) =>
      n.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })

    ctx.strokeStyle = '#e5e5e5'
    ctx.beginPath()
    ctx.moveTo(pad, y)
    ctx.lineTo(w - pad, y)
    ctx.stroke()
    y += 22

    ctx.fillStyle = '#111111'
    ctx.font = '13px Plus Jakarta Sans, sans-serif'
    ctx.fillText(`Total:    ${formatCOP(parseFloat(total) || 0)}`, pad, y)
    y += lineH
    ctx.fillText(`Pagado:   ${formatCOP(parseFloat(pagado) || 0)}`, pad, y)
    y += lineH

    const deudaVal = (parseFloat(total) || 0) - (parseFloat(pagado) || 0)
    ctx.fillStyle = deudaVal > 0 ? '#d44' : '#333'
    ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif'
    ctx.fillText(`Deuda:    ${formatCOP(deudaVal > 0 ? deudaVal : 0)}`, pad, y)
    y += lineH + 4

    ctx.fillStyle = '#888888'
    ctx.font = '11px Plus Jakarta Sans, sans-serif'
    ctx.fillText(`Inicio: ${fechaInicio}  |  Devolucion: ${fechaFin}`, pad, y)

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

    // Fallback: descargar imagen y abrir WhatsApp con texto
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'comprobante-rentatraje.png'
    a.click()
    URL.revokeObjectURL(url)

    const phone = customerPhone.trim().replace(/\D/g, '')
    const deudaVal = (parseFloat(total) || 0) - (parseFloat(pagado) || 0)
    const msg =
      `*RentaTraje - Comprobante*%0A%0A` +
      `Cliente: ${customerName.trim()}%0A` +
      `Total: ${(parseFloat(total) || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}%0A` +
      `Pagado: ${(parseFloat(pagado) || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}%0A` +
      `Deuda: ${(deudaVal > 0 ? deudaVal : 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}`
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
  }

  return (
    <div className="space-y-5">
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
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
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
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Prendas */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Prendas a alquilar
        </label>
        <div className="flex flex-wrap gap-2">
          {selectedGarments.map((g) => (
            <span
              key={g.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full"
              style={{
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
              }}
            >
              <IconHanger className="w-4 h-4" aria-hidden="true" />
              {g.codigo}
              <button
                onClick={() => removeGarment(g.id)}
                className="ml-0.5 hover:opacity-70 transition-opacity"
                aria-label="Quitar prenda"
              >
                <IconX className="w-4 h-4" />
              </button>
            </span>
          ))}

          {showSearch ? (
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar prenda por codigo..."
                className="w-full rounded-[12px] pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none"
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
              Agregar
            </button>
          )}
        </div>
      </div>

      {/* Fechas */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary mb-2">
          <IconCalendar className="w-4 h-4" aria-hidden="true" />
          Fechas
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-text-tertiary">Alquiler</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded-[12px] px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 mt-1"
              style={inputStyle}
            />
          </div>
          <div>
            <span className="text-xs text-text-tertiary">Devolucion</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full rounded-[12px] px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 mt-1"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Totales */}
      <div className="rounded-[16px] p-4 space-y-3" style={cardStyle}>
        <h3 className="font-semibold text-text-primary text-sm">Totales</h3>

        <div>
          <label className="text-xs text-text-tertiary">Total acordado</label>
          <input
            type="number"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-[12px] px-4 py-2.5 text-sm text-text-primary mt-1 focus:outline-none focus:ring-2 focus:ring-accent/40"
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--success)' }}>
              Pagado
            </label>
            <input
              type="number"
              value={pagado}
              onChange={(e) => setPagado(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-[12px] px-4 py-2.5 text-sm font-medium mt-1 focus:outline-none focus:ring-2 focus:ring-success/40"
              style={{
                ...inputStyle,
                color: 'var(--success)',
              }}
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
              Deuda
            </label>
            <div
              className="w-full rounded-[12px] px-4 py-2.5 text-sm font-medium mt-1"
              style={{
                ...inputStyle,
                color: 'var(--danger)',
              }}
            >
              {deuda.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
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
        style={{ background: 'var(--accent-glow)' }}
      >
        {saving ? 'Guardando...' : 'Registrar alquiler'}
      </button>

      {/* Popup de exito */}
      {showPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(false) }}
        >
          <div
            className="w-full max-w-[380px] rounded-[28px] px-4 pt-5 pb-6 space-y-4"
            style={{
              background: 'rgba(15,15,20,0.78)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
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
              <h3 className="text-lg font-bold text-text-primary">Alquiler registrado</h3>
              <p className="text-sm text-text-secondary">Las prendas estan marcadas como ocupadas</p>
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
                navigate('/')
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
    </div>
  )
}
