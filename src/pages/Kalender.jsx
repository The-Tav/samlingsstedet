import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Kalender() {
  const { user } = useAuth()
  const [grupper, setGrupper] = useState([]) // [{ måned, arrangementer }]
  const [loading, setLoading] = useState(true)
  const [afmelder, setAfmelder] = useState(null)

  useEffect(() => {
    hentKalender()
  }, [user])

  async function hentKalender() {
    const { data } = await supabase
      .from('ss_event_participants')
      .select('event_id, ss_events(id, title, description, starts_at, ends_at, group_id, ss_groups(id, name))')
      .eq('user_id', user.id)

    // Sorter efter starts_at
    const sorterede = (data ?? [])
      .filter((d) => d.ss_events)
      .sort((a, b) => new Date(a.ss_events.starts_at) - new Date(b.ss_events.starts_at))

    // Gruppér efter måned
    const månedMap = {}
    for (const d of sorterede) {
      const dato = new Date(d.ss_events.starts_at)
      const nøgle = dato.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
      const nøgleKap = nøgle[0].toUpperCase() + nøgle.slice(1)
      if (!månedMap[nøgleKap]) månedMap[nøgleKap] = []
      månedMap[nøgleKap].push(d)
    }

    setGrupper(Object.entries(månedMap).map(([måned, items]) => ({ måned, items })))
    setLoading(false)
  }

  async function afmeld(eventId) {
    setAfmelder(eventId)
    await supabase
      .from('ss_event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id)
    await hentKalender()
    setAfmelder(null)
  }

  function formatDato(iso) {
    return new Date(iso).toLocaleString('da-DK', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Min kalender</h2>
          <p className="text-sm text-gray-500 mt-0.5">Arrangementer du har tilmeldt dig</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Indlæser kalender...</p>
        ) : grupper.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">Du har ikke tilmeldt dig nogen arrangementer endnu.</p>
            <p className="text-xs text-gray-400">Gå ind i en gruppe og klik "Deltag" på et arrangement.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grupper.map(({ måned, items }) => (
              <div key={måned}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{måned}</h3>
                <div className="space-y-3">
                  {items.map((d) => {
                    const a = d.ss_events
                    const erPasseret = new Date(a.starts_at) < new Date()
                    return (
                      <div
                        key={d.event_id}
                        className={`bg-white border rounded-xl px-4 py-4 ${erPasseret ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/grupper/${a.ss_groups?.id}`}
                              className="text-xs font-semibold text-indigo-500 hover:underline"
                            >
                              {a.ss_groups?.name}
                            </Link>
                            <h4 className="text-sm font-semibold text-gray-900 mt-0.5">{a.title}</h4>
                            <p className="text-xs text-indigo-600 mt-0.5 capitalize">{formatDato(a.starts_at)}</p>
                            {a.ends_at && (
                              <p className="text-xs text-gray-400">Slutter: {formatDato(a.ends_at)}</p>
                            )}
                            {a.description && (
                              <p className="text-sm text-gray-600 mt-1.5">{a.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => afmeld(d.event_id)}
                            disabled={afmelder === d.event_id}
                            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            {afmelder === d.event_id ? '...' : 'Afmeld'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
