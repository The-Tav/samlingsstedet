import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Registrer from './pages/Registrer'
import Dashboard from './pages/Dashboard'
import GruppeSoegning from './pages/GruppeSoegning'
import GruppeDetaljer from './pages/GruppeDetaljer'
import Kalender from './pages/Kalender'
import Profil from './pages/Profil'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Offentlige ruter */}
          <Route path="/login" element={<Login />} />
          <Route path="/registrer" element={<Registrer />} />

          {/* Beskyttede ruter */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/grupper" element={<ProtectedRoute><GruppeSoegning /></ProtectedRoute>} />
          <Route path="/grupper/:id" element={<ProtectedRoute><GruppeDetaljer /></ProtectedRoute>} />
          <Route path="/kalender" element={<ProtectedRoute><Kalender /></ProtectedRoute>} />
          <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
