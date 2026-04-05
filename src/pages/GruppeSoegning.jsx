import { useEffect, useState } from 'react'
import { Search, Globe, Users, CheckCircle, Clock } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function GruppeSoegning() {
  const { user } = useAuth()
  const [soegeTekst, setSoegeTekst] = useState('')
  const [grupper, setGrupper] = useState([])
  const [mitMedlemskab, setMitMedlemskab] = useState({}) // { group_id: status }
  const [loading, setLoading] = useState(true)
  const [ansøgerFor, setAnsøgerFor] = useState(null)

  useEffect(() => {
    hentGrupper()
  }, [])

  async function hentGrupper() {
    setLoading(true)

    const { data: gruppeData } = await supabase
      .from('ss_groups')
      .select('id, name, description')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    const { data: medlemskabData } = await supabase
      .from('ss_group_members')
      .select('group_id, status')
      .eq('user_id', user.id)

    const statusMap = {}
    for (const m of (medlemskabData ?? [])) {
      statusMap[m.group_id] = m.status
    }

    setGrupper(gruppeData ?? [])
    setMitMedlemskab(statusMap)
    setLoading(false)
  }

  async function ansøgOmMedlemskab(gruppeId) {
    setAnsøgerFor(gruppeId)
    const { error } = await supabase
      .from('ss_group_members')
      .insert({ group_id: gruppeId, user_id: user.id, role: 'member', status: 'pending' })

    if (!error) {
      setMitMedlemskab((prev) => ({ ...prev, [gruppeId]: 'pending' }))
    }
    setAnsøgerFor(null)
  }

  const filtrerede = grupper.filter((g) =>
    g.name.toLowerCase().includes(soegeTekst.toLowerCase()) ||
    g.description.toLowerCase().includes(soegeTekst.toLowerCase())
  )

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Find grupper</h2>
          <p className="text-sm text-gray-500 mt-0.5">Søg blandt alle offentlige grupper</p>
        </div>

        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={soegeTekst}
            onChange={(e) => setSoegeTekst(e.target.value)}
            placeholder="Søg efter gruppenavn eller beskrivelse..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Indlæser grupper...</p>
        ) : filtrerede.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-500 text-sm">Ingen grupper fundet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrerede.map((gruppe) => {
              const status = mitMedlemskab[gruppe.id]
              return (
                <div
                  key={gruppe.id}
                  className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-base font-bold shrink-0">
                    {gruppe.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">{gruppe.name}</span>
                      <Globe size={13} className="text-gray-400 shrink-0" />
                    </div>
                    {gruppe.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{gruppe.description}</p>
                    )}
                  </div>

                  {status === 'approved' ? (
                    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium shrink-0">
                      <CheckCircle size={14} />
                      Medlem
                    </span>
                  ) : status === 'pending' ? (
                    <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium shrink-0">
                      <Clock size={14} />
                      Afventer
                    </span>
                  ) : (
                    <button
                      onClick={() => ansøgOmMedlemskab(gruppe.id)}
                      disabled={ansøgerFor === gruppe.id}
                      className="shrink-0 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {ansøgerFor === gruppe.id ? '...' : 'Ansøg'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
