import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrendasStore } from '../store/usePrendasStore'
import { supabase } from '../lib/supabase'
import type { Categoria } from '../types'
import {
  IconArrowLeft, IconCamera, IconPhoto, IconChevronDown,
  IconScan, IconCurrencyDollar, IconDeviceFloppy,
} from '@tabler/icons-react'

const TIPOS = [
  'Traje', 'Smoking', 'Frac', 'Traje típico', 'Traje sastre', 'Traje coctel',
  'Camisa', 'Pantalón', 'Saco', 'Chaleco', 'Corbata', 'Corbatín',
  'Vestido', 'Zapatos', 'Sombrero', 'Muñeco decorativo', 'Cojín', 'Lazo de pétalo',
]
const CATEGORIAS: Categoria[] = [
  'Hombre', 'Mujer', 'Niño', 'Niña', 'Novias',
  '15 Años', 'Primera Comunión', 'Accesorios',
]

interface Props {
  inPopup?: boolean
  onClose?: () => void
}

export default function AgregarPrenda({ inPopup, onClose }: Props = {}) {
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
  const [openTipo, setOpenTipo] = useState(false)
  const [openCategoria, setOpenCategoria] = useState(false)

  useEffect(() => {
    if (!openTipo && !openCategoria) return
    function close() { setOpenTipo(false); setOpenCategoria(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openTipo, openCategoria])

  function handleFile(file: File | null) {
    if (!file) return
    setImagen(file)
    setPreview(URL.createObjectURL(file))
  }

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const maxW = 800
        const scale = img.width > maxW ? maxW / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => { if (blob) resolve(blob); else reject(new Error('Compresion fallida')) },
          'image/jpeg',
          0.7,
        )
      }
      img.onerror = () => reject(new Error('Error al cargar imagen'))
      img.src = URL.createObjectURL(file)
    })
  }

  async function handleSave() {
    if (!tipo || !categoria || !codigo.trim()) {
      setError('Completa tipo, categoria y codigo')
      return
    }
    if (precio.trim() && (isNaN(parseFloat(precio)) || parseFloat(precio) <= 0)) {
      setError('Ingresa un precio valido')
      return
    }

    setSaving(true)
    setError(null)

    let imagen_url = ''

    if (imagen) {
      const compressed = await compressImage(imagen)
      const safeName = `${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prendas')
        .upload(safeName, compressed)

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
      precio: parseFloat(precio) || 0,
      categoria: categoria as Categoria,
    })

    setSaving(false)

    if (!result.success) {
      setError(result.error || 'Error al guardar la prenda')
      return
    }

    if (inPopup && onClose) {
      onClose()
    } else {
      navigate('/')
    }
  }

  const inputStyle = {
    background: 'var(--field-bg)',
    border: '1px solid var(--field-border)',
  }

  return (
    <div className="space-y-5">
      {!inPopup && (
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
      )}
      {inPopup && (
        <h2 className="text-lg font-bold text-text-primary mb-5">Agregar prenda</h2>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-[16px] aspect-square flex flex-col items-center justify-center cursor-pointer transition-all"
        style={{
          borderColor: preview ? 'var(--accent-border)' : 'var(--danger)',
          background: 'transparent',
          animation: preview ? 'none' : 'pulse-border 2s ease-in-out infinite',
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
                background: 'transparent',
                animation: 'pulse-icon 2s ease-in-out infinite',
              }}
            >
              <IconCamera className="w-7 h-7" style={{ color: 'var(--danger)' }} aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Toca para agregar imagen</p>
          </div>
        )}

        <style>{`
          @keyframes pulse-border {
            0%, 100% { border-color: var(--danger); }
            50% { border-color: rgba(239,68,68,0.25); }
          }
          @keyframes pulse-icon {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.65; }
          }
        `}</style>
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
        {/* Tipo de prenda */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Tipo de prenda
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenTipo(!openTipo); setOpenCategoria(false) }}
              className="w-full rounded-[12px] px-4 py-3 text-base text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={{
                ...inputStyle,
                color: tipo ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {tipo || 'Seleccionar tipo'}
              <IconChevronDown
                className="w-5 h-5 shrink-0"
                style={{ color: 'var(--text-secondary)' }}
                aria-hidden="true"
              />
            </button>
            {openTipo && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full mt-1 left-0 right-0 rounded-[12px] py-1 z-20"
                style={{
                  background: '#ffffff',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                }}
              >
                {TIPOS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTipo(t); setOpenTipo(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-all hover:brightness-150"
                    style={{
                      color: tipo === t ? 'var(--accent)' : 'var(--text-primary)',
                      background: tipo === t ? 'rgba(201,163,90,0.10)' : 'transparent',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Categoria
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenCategoria(!openCategoria); setOpenTipo(false) }}
              className="w-full rounded-[12px] px-4 py-3 text-base text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={{
                ...inputStyle,
                color: categoria ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {categoria || 'Seleccionar categoria'}
              <IconChevronDown
                className="w-5 h-5 shrink-0"
                style={{ color: 'var(--text-secondary)' }}
                aria-hidden="true"
              />
            </button>
            {openCategoria && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full mt-1 left-0 right-0 rounded-[12px] py-1 z-20"
                style={{
                  background: '#ffffff',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                }}
              >
                {CATEGORIAS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCategoria(c); setOpenCategoria(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-all hover:brightness-150"
                    style={{
                      color: categoria === c ? 'var(--accent)' : 'var(--text-primary)',
                      background: categoria === c ? 'rgba(201,163,90,0.10)' : 'transparent',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
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
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Color / Descripcion (opcional)
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Azul marino"
            className="w-full rounded-[12px] px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Precio de alquiler (opcional)
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
              className="w-full rounded-[12px] pl-11 pr-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40"
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
