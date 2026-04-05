import { useEffect, useState } from 'react'
import { Bell, BellOff, Save, Check } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const PRÆFERENCE_FELTER = [
  { key: 'nye_opslag',          label: 'Nye opslag i grupper',          beskrivelse: 'Når nogen slår noget op i en gruppe du er med i' },
  { key: 'nye_begivenheder',    label: 'Nye arrangementer i grupper',    beskrivelse: 'Når der oprettes et nyt arrangement i en gruppe' },
  { key: 'nye_beskeder',        label: 'Direkte beskeder',               beskrivelse: 'Når du modtager en privat besked' },
  { key: 'venneforspørgsler',   label: 'Venneanmodninger',               beskrivelse: 'Når nogen sender dig en venneanmodning eller accepterer din' },
  { key: 'gruppe_invitationer', label: 'Gruppe-invitationer',            beskrivelse: 'Når du inviteres til en gruppe' },
]

const DEFAULT_PREFS = {
  alle_slaaet_til:     true,
  nye_opslag:          true,
  nye_begivenheder:    true,
  nye_beskeder:        true,
  venneforspørgsler:   true,
  gruppe_invitationer: true,
}

export default function Indstillinger() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [gemmer, setGemmer] = useState(false)
  const [gemt, setGemt] = useState(false)

  useEffect(() => {
    hentPræferencer()
  }, [])

  async function hentPræferencer() {
    const { data } = await supabase
      .from('ss_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) setPrefs(data)
    setLoading(false)
  }

  async function gem() {
    setGemmer(true)
    await supabase
      .from('ss_notification_preferences')
      .upsert({ ...prefs, user_id: user.id }, { onConflict: 'user_id' })
    setGemmer(false)
    setGemt(true)
    setTimeout(() => setGemt(false), 2000)
  }

  function toggl(key) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) return <Layout><p className="text-sm text-gray-400">Indlæser indstillinger...</p></Layout>

  return (
    <Layout>
      <div className="max-w-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Indstillinger</h2>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* Global toggle */}
          <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 ${prefs.alle_slaaet_til ? '' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3">
              {prefs.alle_slaaet_til
                ? <Bell size={18} className="text-indigo-600 shrink-0" />
                : <BellOff size={18} className="text-gray-400 shrink-0" />}
              <div>
                <p className="text-sm font-semibold text-gray-900">Notifikationer</p>
                <p className="text-xs text-gray-500">Slå alle notifikationer til eller fra</p>
              </div>
            </div>
            <Toggle
              aktiv={prefs.alle_slaaet_til}
              onClick={() => toggl('alle_slaaet_til')}
            />
          </div>

          {/* Individuelle toggles */}
          <div className={`transition-opacity ${prefs.alle_slaaet_til ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            {PRÆFERENCE_FELTER.map(({ key, label, beskrivelse }) => (
              <div key={key} className="flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{beskrivelse}</p>
                </div>
                <Toggle
                  aktiv={prefs[key]}
                  onClick={() => toggl(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Gem-knap */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={gem}
            disabled={gemmer || gemt}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              gemt
                ? 'bg-green-100 text-green-700'
                : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white'
            }`}
          >
            {gemt ? <><Check size={15} /> Gemt</> : gemmer ? 'Gemmer...' : <><Save size={15} /> Gem indstillinger</>}
          </button>
        </div>
      </div>
    </Layout>
  )
}

function Toggle({ aktiv, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex w-10 h-5.5 shrink-0 rounded-full transition-colors focus:outline-none ${
        aktiv ? 'bg-indigo-600' : 'bg-gray-200'
      }`}
      style={{ width: 40, height: 22 }}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-[3px] ${
          aktiv ? 'translate-x-[19px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}
