import { useLocation, useNavigate } from 'react-router-dom'
import { useThemeStore } from '../store/useThemeStore'
import { IconSun, IconMoon, IconHanger, IconFileInvoice, IconPlus, IconChartPie } from '@tabler/icons-react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggle } = useThemeStore()
  const isHome = location.pathname === '/'

  return (
    <div className="app-wrapper">
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <IconHanger className="w-6 h-6" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h1 className="text-lg font-bold text-text-primary tracking-tight">RentaTraje</h1>
        </div>
        <button
          onClick={toggle}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:brightness-125 transition-all"
          style={{
            background: 'var(--glass-strong)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
          }}
          aria-label="Cambiar tema"
        >
          {theme === 'dark' ? (
            <IconSun className="w-4 h-4" aria-hidden="true" />
          ) : (
            <IconMoon className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </header>

      <main className="px-4 py-5 pb-28">
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
  }}  >
            <button
              onClick={() => navigate('/alquiler')}
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
              onClick={() => navigate('/agregar')}
              className="flex flex-col items-center gap-1 -mt-4"
              aria-label="Agregar"
            >
              <div
                className="w-[52px] h-[52px] flex items-center justify-center rounded-full shadow-lg transition-all"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                }}
              >
                <IconPlus className="w-7 h-7" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>
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
    </div>
  )
}
