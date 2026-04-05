import { useRef, useState } from 'react'
import { Camera, Check } from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Profil() {
  const { user, profile, opdaterProfil, skiftKodeord } = useAuth()

  // Navn
  const [navn, setNavn] = useState(profile?.full_name ?? '')
  const [gemmerNavn, setGemmerNavn] = useState(false)
  const [navnGemt, setNavnGemt] = useState(false)

  // Avatar
  const [uploadProgress, setUploadProgress] = useState(null) // null | 'uploader' | 'fejl'
  const filInputRef = useRef(null)

  // Kodeord
  const [nytKodeord, setNytKodeord] = useState('')
  const [bekræftKodeord, setBekræftKodeord] = useState('')
  const [kodeordFejl, setKodeordFejl] = useState(null)
  const [gemmerKodeord, setGemmerKodeord] = useState(false)
  const [kodeordGemt, setKodeordGemt] = useState(false)

  // --- Navn ---
  async function handleGemNavn(e) {
    e.preventDefault()
    if (!navn.trim()) return
    setGemmerNavn(true)
    await opdaterProfil({ fullName: navn })
    setGemmerNavn(false)
    setNavnGemt(true)
    setTimeout(() => setNavnGemt(false), 2500)
  }

  // --- Avatar ---
  async function handleAvatarValgt(e) {
    const fil = e.target.files?.[0]
    if (!fil) return

    setUploadProgress('uploader')
    const filSti = `${user.id}/avatar`

    const { error: uploadFejl } = await supabase.storage
      .from('avatarer')
      .upload(filSti, fil, { upsert: true, contentType: fil.type })

    if (uploadFejl) {
      setUploadProgress('fejl')
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatarer')
      .getPublicUrl(filSti)

    // Tilføj cache-buster så browseren henter det nye billede
    const urlMedCacheBuster = `${publicUrl}?t=${Date.now()}`
    await opdaterProfil({ avatarUrl: urlMedCacheBuster })
    setUploadProgress(null)
    // Nulstil file input så samme fil kan uploades igen
    e.target.value = ''
  }

  // --- Kodeord ---
  async function handleGemKodeord(e) {
    e.preventDefault()
    setKodeordFejl(null)

    if (nytKodeord.length < 6) {
      setKodeordFejl('Adgangskoden skal være mindst 6 tegn.')
      return
    }
    if (nytKodeord !== bekræftKodeord) {
      setKodeordFejl('Adgangskoderne stemmer ikke overens.')
      return
    }

    setGemmerKodeord(true)
    const { error } = await skiftKodeord(nytKodeord)
    setGemmerKodeord(false)

    if (error) {
      setKodeordFejl('Noget gik galt. Prøv igen.')
    } else {
      setNytKodeord('')
      setBekræftKodeord('')
      setKodeordGemt(true)
      setTimeout(() => setKodeordGemt(false), 2500)
    }
  }

  return (
    <Layout>
      <div className="max-w-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Min profil</h2>

        {/* ── Avatar ─────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Profilbillede</h3>
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar
                name={profile?.full_name}
                avatarUrl={profile?.avatar_url}
                className="w-20 h-20"
                tekstKlasse="text-2xl"
              />
              <button
                onClick={() => filInputRef.current?.click()}
                disabled={uploadProgress === 'uploader'}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow transition-colors disabled:opacity-50"
                title="Skift billede"
              >
                <Camera size={13} />
              </button>
              <input
                ref={filInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarValgt}
              />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {uploadProgress === 'uploader' && 'Uploader billede...'}
                {uploadProgress === 'fejl' && <span className="text-red-500">Upload fejlede. Prøv igen.</span>}
                {!uploadProgress && 'Klik på kameraet for at skifte billede.'}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG eller WebP · Maks. 2 MB</p>
            </div>
          </div>
        </div>

        {/* ── Navn ───────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Visningsnavn</h3>
          <form onSubmit={handleGemNavn} className="flex gap-2">
            <input
              type="text"
              value={navn}
              onChange={(e) => { setNavn(e.target.value); setNavnGemt(false) }}
              placeholder="Dit navn"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={gemmerNavn || !navn.trim() || navn.trim() === profile?.full_name}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              {navnGemt ? <><Check size={14} />Gemt!</> : gemmerNavn ? 'Gemmer...' : 'Gem navn'}
            </button>
          </form>
        </div>

        {/* ── Kodeord ────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Skift adgangskode</h3>
          <form onSubmit={handleGemKodeord} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ny adgangskode</label>
              <input
                type="password"
                value={nytKodeord}
                onChange={(e) => { setNytKodeord(e.target.value); setKodeordFejl(null) }}
                placeholder="Mindst 6 tegn"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bekræft ny adgangskode</label>
              <input
                type="password"
                value={bekræftKodeord}
                onChange={(e) => { setBekræftKodeord(e.target.value); setKodeordFejl(null) }}
                placeholder="Gentag adgangskoden"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {kodeordFejl && (
              <p className="text-sm text-red-600">{kodeordFejl}</p>
            )}

            <button
              type="submit"
              disabled={gemmerKodeord || !nytKodeord || !bekræftKodeord}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {kodeordGemt ? <><Check size={14} />Gemt!</> : gemmerKodeord ? 'Gemmer...' : 'Gem adgangskode'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
