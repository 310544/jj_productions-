import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrendasStore } from '../store/usePrendasStore'
import { supabase } from '../lib/supabase'
import type { Categoria } from '../types'
import {
  IconArrowLeft, IconCamera, IconPhoto, IconChevronDown,
  IconScan, IconCurrencyDollar, IconDeviceFloppy,
} from '@tabler/icons-react'

const TIPOS = ['Traje', 'Camisa', 'Pantalon']
const CATEGORIAS: Categoria[] = ['Hombre', 'Mujer', 'Niño', 'Niña']

export default function AgregarPrenda() {
  const navigate = useNavigate()
  const { agregarPrenda } = usePrendasStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [imagen, setImagen] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [tipo, setTipo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [categoria, setCategoria] = useState<Categoria | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File | null) {
    if (!file) return
    setImagen(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!tipo || !categoria || !codigo.trim() || !descripcion.trim() || !precio.trim()) {
      setError('Completa todos los campos')
      return
    }
    if (isNaN(parseFloat(precio)) || parseFloat(precio) <= 0) {
      setError('Ingresa un precio valido')
      return
    }

    setSaving(true)
    setError(null)

    let imagen_url = ''

    if (imagen) {
      const ext = imagen.name.split('.').pop() || 'jpg'
      const safeName = `${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prendas')
        .upload(safeName, imagen)

      if (uploadError) {
        setError('Error al subir imagen: ' + uploadError.message)
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('prendas')
        .getPublicUrl(uploadData.path)

      imagen_url = urlData.publicUrl
    }

    const result = await agregarPrenda({
      codigo: codigo.trim(),
      nombre: `${tipo} - ${descripcion.trim()}`,
      imagen_url,
      estado: 'disponible',
      precio: parseFloat(precio),
      categoria: categoria as Categoria,
    })

    setSaving(false)

    if (!result.success) {
      setError(result.error || 'Error al guardar la prenda')
      return
    }

    navigate('/')
  }

  const inputStyle = {
    background: 'var(--field-bg)',
    border: '1px solid var(--field-border)',
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
          }}
          aria-label="Volver"
        >
          <IconArrowLeft className="w-5 h-5" style={{ color: 'var(--accent)' }} aria-hidden="true" />
        </button>
        <h2 className="text-lg font-bold text-text-primary">Agregar prenda</h2>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-[16px] aspect-square flex flex-col items-center justify-center cursor-pointer transition-all"
        style={{
          borderColor: preview ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
          background: 'var(--glass-bg)',
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Vista previa"
            className="w-full h-full object-cover rounded-[16px]"
          />
        ) : (
          <div className="text-center p-6">
            <div
              className="w-14 h-14 flex items-center justify-center rounded-xl mx-auto mb-3"
              style={{
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
              }}
            >
              <IconCamera className="w-7 h-7" style={{ color: 'var(--accent)' }} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-text-secondary">Toca para agregar imagen</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-3 rounded-[12px] font-medium text-sm transition-all hover:brightness-125"
          style={{
            background: 'var(--glass-strong)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
          }}
        >
          <IconCamera className="w-5 h-5" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          Camara
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-3 rounded-[12px] font-medium text-sm transition-all hover:brightness-125"
          style={{
            background: 'var(--glass-strong)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
          }}
        >
          <IconPhoto className="w-5 h-5" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          Galeria
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Tipo de prenda
          </label>
          <div className="relative">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full appearance-none rounded-[12px] px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={inputStyle}
            >
              <option value="" disabled>
                Seleccionar tipo
              </option>
              {TIPOS.map((t) => (
                <option key={t} value={t} style={{ background: '#1a0533', color: '#fff' }}>
                  {t}
                </option>
              ))}
            </select>
            <IconChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
              style={{ color: 'var(--text-secondary)' }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Categoria
          </label>
          <div className="relative">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as Categoria)}
              className="w-full appearance-none rounded-[12px] px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={inputStyle}
            >
              <option value="" disabled>
                Hombre / Mujer / Niño / Niña
              </option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c} style={{ background: '#1a0533', color: '#fff' }}>
                  {c}
                </option>
              ))}
            </select>
            <IconChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
              style={{ color: 'var(--text-secondary)' }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Codigo unico
          </label>
          <div className="relative">
            <IconScan
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--accent)' }}
              aria-hidden="true"
            />
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: TRJ-001"
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Color / Descripcion
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Azul marino"
            className="w-full rounded-[12px] px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Precio de alquiler
          </label>
          <div className="relative">
            <IconCurrencyDollar
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--accent)' }}
              aria-hidden="true"
            />
            <input
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="50.000"
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={inputStyle}
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
        className="w-full py-3.5 text-white font-semibold rounded-[14px] transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: 'var(--accent-glow)' }}
      >
        <IconDeviceFloppy className="w-5 h-5" aria-hidden="true" />
        {saving ? 'Guardando...' : 'Guardar prenda'}
      </button>
    </div>
  )
}
