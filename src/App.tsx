import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Inventario from './pages/Inventario'
import AgregarPrenda from './pages/AgregarPrenda'
import DetallePrenda from './pages/DetallePrenda'
import Alquiler from './pages/Alquiler'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Inventario />} />
          <Route path="/agregar" element={<AgregarPrenda />} />
          <Route path="/prenda/:codigo" element={<DetallePrenda />} />
          <Route path="/alquiler" element={<Alquiler />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
