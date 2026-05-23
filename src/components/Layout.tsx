import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IconFileInvoice, IconPlus, IconChartPie } from '@tabler/icons-react'
import AgregarPrenda from '../pages/AgregarPrenda'
import Alquiler from '../pages/Alquiler'

type Popup = 'alquiler' | 'agregar' | null

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [popup, setPopup] = useState<Popup>(null)

  return (
    <div className="app-wrapper">
      <main className="px-4 py-5 pb-28 md:px-8 md:py-8">
        {children}
      </main>

      {isHome && (
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-6">
          <div
            className="flex items-center gap-4 px-8 py-2 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              border: '1px solid var(--accent-border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            }}
          >
            <button
              onClick={() => setPopup('alquiler')}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all hover:scale-110"
              style={{
                background: 'var(--accent)',
                color: '#fff',
              }}
              aria-label="Factura"
            >
              <IconFileInvoice className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              onClick={() => setPopup('agregar')}
              className="w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-110"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.20)',
              }}
              aria-label="Agregar"
            >
              <IconPlus className="w-6 h-6" aria-hidden="true" />
            </button>

            <button
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all hover:scale-110"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                opacity: 0.4,
              }}
              aria-label="Stats"
              title="Proximamente"
            >
              <IconChartPie className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Popup Alquiler */}
      {popup === 'alquiler' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPopup(null) }}
        >
          <div
            className="w-full max-w-[430px] max-h-[90vh] overflow-y-auto rounded-[28px] px-4 pt-5 pb-6 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
              scrollbarWidth: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Alquiler inPopup onClose={() => setPopup(null)} />
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          </div>
        </div>
      )}

      {/* Popup Agregar */}
      {popup === 'agregar' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPopup(null) }}
        >
          <div
            className="w-full max-w-[430px] max-h-[90vh] overflow-y-auto rounded-[28px] px-4 pt-5 pb-6 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
              scrollbarWidth: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AgregarPrenda inPopup onClose={() => setPopup(null)} />
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          </div>
        </div>
      )}
    </div>
  )
}
