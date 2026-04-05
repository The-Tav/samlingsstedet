import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function GlemtKodeord() {
  const [email, setEmail] = useState('')
  const [sendt, setSendt] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nulstil-kodeord`,
    })

    if (error) {
      setError('Noget gik galt. Prøv igen.')
    } else {
      setSendt(true)
    }
    setLoading(false)
  }

  if (sendt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="text-green-600" size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Tjek din indbakke</h1>
          <p className="text-sm text-gray-500 mb-6">
            Vi har sendt et link til <strong>{email}</strong>.<br />
            Klik på linket i mailen for at vælge et nyt kodeord.
          </p>
          <Link to="/login" className="text-indigo-600 hover:underline text-sm font-medium">
            Tilbage til log ind
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Glemt kodeord?</h1>
        <p className="text-gray-500 mb-6 text-sm">Indtast din e-mail, så sender vi dig et nulstillingslink.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="din@email.dk"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {loading ? 'Sender...' : 'Send nulstillingslink'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">
            Tilbage til log ind
          </Link>
        </p>
      </div>
    </div>
  )
}
