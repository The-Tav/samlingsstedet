import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Home, Search, LogOut, Calendar, Pencil, Check, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const NAV_LINKS = [
  { to: '/', end: true, ikon: Home, label: 'Mit feed' },
  { to: '/kalender', end: false, ikon: Calendar, label: 'Min kalender' },
  { to: '/grupper', end: false, ikon: Search, label: 'Find grupper' },
]

export default function Layout({ children }) {
  const { profile, logout, opdaterProfil } = useAuth()
  const navigate = useNavigate()
  const [redigerer, setRedigerer] = useState(false)
  const [nytNavn, setNytNavn] = useState('')
  const [gemmer, setGemmer] = useState(false)

  function startRediger() {
    setNytNavn(profile?.full_name ?? '')
    setRedigerer(true)
  }

  async function gemNavn(e) {
    e.preventDefault()
    if (!nytNavn.trim()) return
    setGemmer(true)
    await opdaterProfil(nytNavn)
    setRedigerer(false)
    setGemmer(false)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — kun synlig på desktop */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col fixed h-full z-10">
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="text-base font-bold text-indigo-600">Samlingsstedet</h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_LINKS.map(({ to, end, ikon: Ikon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Ikon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          {redigerer ? (
            <form onSubmit={gemNavn} className="px-3 py-2 mb-1">
              <input
                autoFocus
                value={nytNavn}
                onChange={(e) => setNytNavn(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-1.5"
                placeholder="Dit navn"
              />
              <div className="flex gap-1.5">
                <button type="submit" disabled={gemmer || !nytNavn.trim()} className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-medium py-1.5 rounded-lg transition-colors">
                  <Check size={13} />{gemmer ? 'Gemmer...' : 'Gem'}
                </button>
                <button type="button" onClick={() => setRedigerer(false)} className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium py-1.5 rounded-lg transition-colors">
                  <X size={13} />Annuller
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2 mb-1 group">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-sm text-gray-700 font-medium truncate flex-1">{profile?.full_name}</span>
              <button onClick={startRediger} className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-gray-600 transition-all" title="Rediger navn">
                <Pencil size={13} />
              </button>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <LogOut size={16} />
            Log ud
          </button>
        </div>
      </aside>

      {/* Topbar — kun synlig på mobil */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 px-4 h-12 flex items-center justify-between">
        <h1 className="text-sm font-bold text-indigo-600">Samlingsstedet</h1>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            title="Log ud"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Indhold */}
      <main className="flex-1 md:ml-56 pt-12 md:pt-0 pb-16 md:pb-0 p-4 md:p-8">
        {children}
      </main>

      {/* Bundnavigation — kun synlig på mobil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 flex">
        {NAV_LINKS.map(({ to, end, ikon: Ikon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-400'
              }`
            }
          >
            <Ikon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
