import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function NulstilKodeord() {
  const navigate = useNavigate()
  const [kodeord, setKodeord] = useState('')
  const [bekræft, setBekræft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // 'afventer' → 'klar' (recovery session oprettet) | 'ugyldig' (link udløbet)
  const [status, setStatus] = useState('afventer')

  useEffect(() => {
    // Supabase behandler automatisk hash-fragmentet i URL'en.
    // Vi lytter på PASSWORD_RECOVERY-eventet som bekræftelse.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(fallback)
        setStatus('klar')
      }
    })

    // Fallback: hvis eventet ikke ankommer inden 1,5 sek, tjek session direkte
    const fallback = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setStatus(session ? 'klar' : 'ugyldig')
      })
    }, 1500)

    return () => {
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (kodeord.length < 6) {
      setError('Kodeordet skal være mindst 6 tegn.')
      return
    }
    if (kodeord !== bekræft) {
      setError('Kodeordene stemmer ikke overens.')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password: kodeord })
    if (error) {
      setError('Noget gik galt. Prøv at anmode om et nyt link.')
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  if (status === 'afventer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Indlæser...</p>
      </div>
    )
  }

  if (status === 'ugyldig') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Linket er udløbet</h1>
          <p className="text-sm text-gray-500 mb-6">
            Nulstillingslinket er ugyldigt eller udløbet. Anmod om et nyt.
          </p>
          <Link to="/glemt-kodeord" className="text-indigo-600 hover:underline text-sm font-medium">
            Anmod om nyt link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Vælg nyt kodeord</h1>
        <p className="text-gray-500 mb-6 text-sm">Vælg et nyt kodeord til din konto.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nyt kodeord</label>
            <input
              type="password"
              required
              value={kodeord}
              onChange={(e) => setKodeord(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Mindst 6 tegn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bekræft kodeord</label>
            <input
              type="password"
              required
              value={bekræft}
              onChange={(e) => setBekræft(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Gentag kodeord"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {loading ? 'Gemmer...' : 'Gem nyt kodeord'}
          </button>
        </form>
      </div>
    </div>
  )
}
