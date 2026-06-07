import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './components/Layout'

// Carga diferida: cada página (y sus librerías pesadas, como recharts en
// Contabilidad) solo se descarga cuando el usuario entra a esa ruta.
const Inventario = lazy(() => import('./pages/Inventario'))
const AgregarPrenda = lazy(() => import('./pages/AgregarPrenda'))
const DetallePrenda = lazy(() => import('./pages/DetallePrenda'))
const Alquiler = lazy(() => import('./pages/Alquiler'))
const Historial = lazy(() => import('./pages/Historial'))
const Contabilidad = lazy(() => import('./pages/Contabilidad'))

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Inventario />} />
            <Route path="/agregar" element={<AgregarPrenda />} />
            <Route path="/prenda/:codigo" element={<DetallePrenda />} />
            <Route path="/alquiler" element={<Alquiler />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/contabilidad" element={<Contabilidad />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}
