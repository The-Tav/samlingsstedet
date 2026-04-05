import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import ProtectedRoute from './components/ProtectedRoute'
import ChatBar from './components/chat/ChatBar'
import Login from './pages/Login'
import Registrer from './pages/Registrer'
import GlemtKodeord from './pages/GlemtKodeord'
import NulstilKodeord from './pages/NulstilKodeord'
import Invitationer from './pages/Invitationer'
import Dashboard from './pages/Dashboard'
import GruppeSoegning from './pages/GruppeSoegning'
import GruppeDetaljer from './pages/GruppeDetaljer'
import Kalender from './pages/Kalender'
import Profil from './pages/Profil'
import BrugerProfil from './pages/BrugerProfil'
import Beskeder from './pages/Beskeder'

function ChatUI() {
  return <ChatBar />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <Routes>
            {/* Offentlige ruter */}
            <Route path="/login" element={<Login />} />
            <Route path="/registrer" element={<Registrer />} />
            <Route path="/glemt-kodeord" element={<GlemtKodeord />} />
            <Route path="/nulstil-kodeord" element={<NulstilKodeord />} />

            {/* Beskyttede ruter */}
            <Route path="/"            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/grupper"     element={<ProtectedRoute><GruppeSoegning /></ProtectedRoute>} />
            <Route path="/grupper/:id" element={<ProtectedRoute><GruppeDetaljer /></ProtectedRoute>} />
            <Route path="/kalender"    element={<ProtectedRoute><Kalender /></ProtectedRoute>} />
            <Route path="/profil"      element={<ProtectedRoute><Profil /></ProtectedRoute>} />
            <Route path="/bruger/:id"  element={<ProtectedRoute><BrugerProfil /></ProtectedRoute>} />
            <Route path="/beskeder"    element={<ProtectedRoute><Beskeder /></ProtectedRoute>} />
            <Route path="/invitationer" element={<ProtectedRoute><Invitationer /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* ChatBar + flydende vinduer — vises på alle beskyttede sider */}
          <ChatUI />
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
