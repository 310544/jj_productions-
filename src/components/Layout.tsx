import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IconFileInvoice, IconPlus, IconChartPie, IconX } from '@tabler/icons-react'
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
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-8">
          <div
            className="flex items-end gap-3 px-5 py-3 rounded-[20px]"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <button
              onClick={() => setPopup('alquiler')}
              className="flex flex-col items-center gap-1 group"
              aria-label="Factura"
            >
              <div
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all"
                style={{
                  background: 'var(--glass-strong)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <IconFileInvoice className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-medium text-text-tertiary">Factura</span>
            </button>

            <button
              onClick={() => setPopup('agregar')}
              className="flex flex-col items-center gap-1 -mt-4"
              aria-label="Agregar"
            >
              <div
                className="w-[52px] h-[52px] flex items-center justify-center rounded-full shadow-lg transition-all"
                style={{
                  background: '#FFB800',
                  color: '#fff',
                }}
              >
                <IconPlus className="w-7 h-7" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-medium" style={{ color: '#FFB800' }}>
                Agregar
              </span>
            </button>

            <button
              className="flex flex-col items-center gap-1 group relative"
              aria-label="Stats"
              title="Proximamente"
            >
              <div
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all"
                style={{
                  background: 'var(--glass-strong)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  opacity: 0.6,
                }}
              >
                <IconChartPie className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-medium text-text-tertiary">Stats</span>
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
              background: 'rgba(15,15,20,0.78)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
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
              background: 'rgba(15,15,20,0.78)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
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
