import { useState } from 'react'
import { X, Globe, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function OpretGruppeModal({ onClose, onOprettet }) {
  const { user } = useAuth()
  const [navn, setNavn] = useState('')
  const [beskrivelse, setBeskrivelse] = useState('')
  const [erOffentlig, setErOffentlig] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase
      .from('ss_groups')
      .insert({ name: navn, description: beskrivelse, is_public: erOffentlig, created_by: user.id })
      .select()
      .single()

    if (error) {
      setError('Kunne ikke oprette gruppen. Prøv igen.')
      setLoading(false)
    } else {
      onOprettet(data)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Opret ny gruppe</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gruppenavn</label>
            <input
              type="text"
              required
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Hvad hedder gruppen?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
            <textarea
              value={beskrivelse}
              onChange={(e) => setBeskrivelse(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Hvad handler gruppen om?"
            />
          </div>

          {/* Synlighedstoggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Synlighed</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setErOffentlig(true)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  erOffentlig
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Globe size={16} />
                Offentlig
              </button>
              <button
                type="button"
                onClick={() => setErOffentlig(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  !erOffentlig
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Lock size={16} />
                Privat
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {erOffentlig
                ? 'Alle kan finde og ansøge om at blive medlem.'
                : 'Gruppen er skjult. Kun folk du inviterer kan blive membre.'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {loading ? 'Opretter...' : 'Opret gruppe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
