import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IconFileInvoice, IconPlus, IconHistory, IconX } from '@tabler/icons-react'
import AgregarPrenda from '../pages/AgregarPrenda'
import Alquiler from '../pages/Alquiler'

type Popup = 'alquiler' | 'agregar' | null

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const [popup, setPopup] = useState<Popup>(null)

  return (
    <div className="app-wrapper">
      <main className="px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-8">
        {children}
      </main>

      {isHome && (
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-6 md:hidden">
          <div
            className="flex items-center gap-4 px-8 py-2 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.40)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            <button
              onClick={() => setPopup('alquiler')}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all hover:scale-110"
              style={{
                background: 'var(--accent-glow)',
                color: '#fff',
              }}
              aria-label="Factura"
            >
              <IconFileInvoice className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              onClick={() => setPopup('agregar')}
              className="w-11 h-11 flex items-center justify-center rounded-full transition-all hover:scale-110"
              style={{
                background: 'var(--accent-glow)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              }}
              aria-label="Agregar"
            >
              <IconPlus className="w-5 h-5" aria-hidden="true" />
            </button>

            <button
              onClick={() => navigate('/historial')}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all hover:scale-110"
              style={{
                background: 'var(--accent-glow)',
                color: '#fff',
              }}
              aria-label="Historial"
            >
              <IconHistory className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Popup Alquiler */}
      <AnimatePresence>
        {popup === 'alquiler' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setPopup(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-[430px] md:max-w-[600px]"
            >
              <button
                onClick={() => setPopup(null)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:brightness-95 transition-all z-20"
                style={{
                  background: '#ffffff',
                  color: 'var(--text-secondary)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}
                aria-label="Cerrar"
              >
                <IconX className="w-4 h-4" />
              </button>
              <div
                className="w-full max-h-[90vh] overflow-y-auto rounded-[28px] px-4 pt-5 pb-6 space-y-4"
                style={{
                  background: 'rgba(255,255,255,0.65)',
                  backdropFilter: 'blur(50px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(50px) saturate(200%)',
                  border: '1px solid rgba(255,255,255,0.30)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
                  scrollbarWidth: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Alquiler inPopup onClose={() => setPopup(null)} />
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup Agregar */}
      <AnimatePresence>
        {popup === 'agregar' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setPopup(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-[430px] md:max-w-[600px]"
            >
              <button
                onClick={() => setPopup(null)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:brightness-95 transition-all z-20"
                style={{
                  background: '#ffffff',
                  color: 'var(--text-secondary)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}
                aria-label="Cerrar"
              >
                <IconX className="w-4 h-4" />
              </button>
              <div
                className="w-full max-h-[90vh] overflow-y-auto rounded-[28px] px-4 pt-5 pb-6 space-y-4"
                style={{
                  background: 'rgba(255,255,255,0.65)',
                  backdropFilter: 'blur(50px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(50px) saturate(200%)',
                  border: '1px solid rgba(255,255,255,0.30)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
                  scrollbarWidth: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <AgregarPrenda inPopup onClose={() => setPopup(null)} />
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
