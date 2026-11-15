import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { IconContext } from '@phosphor-icons/react'
import './index.css'
import App from './App'
import { registerSW } from 'virtual:pwa-register'

// Actualizacion automatica de la app instalada (PWA).
// Revisa si hay una version nueva al abrir la app, al volver a ella y cada
// minuto mientras esta abierta. Si la hay, recarga sola con los cambios.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    if (!registro) return
    const revisar = () => { registro.update().catch(() => {}) }
    setInterval(revisar, 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') revisar()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Estilo por defecto de todos los íconos Phosphor: trazo fino y uniforme.
        Los íconos que pasen su propio weight lo siguen sobrescribiendo. */}
    <IconContext.Provider value={{ weight: 'light' }}>
      <App />
    </IconContext.Provider>
  </StrictMode>,
)
