import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Inventario from './pages/Inventario'
import AgregarPrenda from './pages/AgregarPrenda'
import DetallePrenda from './pages/DetallePrenda'
import Alquiler from './pages/Alquiler'
import Historial from './pages/Historial'
import Contabilidad from './pages/Contabilidad'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Inventario />} />
          <Route path="/agregar" element={<AgregarPrenda />} />
          <Route path="/prenda/:codigo" element={<DetallePrenda />} />
          <Route path="/alquiler" element={<Alquiler />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/contabilidad" element={<Contabilidad />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
