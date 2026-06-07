import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { IconContext } from '@phosphor-icons/react'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Estilo por defecto de todos los íconos Phosphor: trazo fino y uniforme.
        Los íconos que pasen su propio weight lo siguen sobrescribiendo. */}
    <IconContext.Provider value={{ weight: 'light' }}>
      <App />
    </IconContext.Provider>
  </StrictMode>,
)
