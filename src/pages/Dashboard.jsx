import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Globe, Lock, ChevronRight, Eye, EyeOff, Rss, Users } from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import OpretGruppeModal from '../components/OpretGruppeModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const FANER = [
  { id: 'feed', label: 'Feed', ikon: Rss },
  { id: 'grupper', label: 'Mine grupper', ikon: Users },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [aktivFane, setAktivFane] = useState('feed')
  const [visModal, setVisModal] = useState(false)
  const [grupper, setGrupper] = useState([])
  const [præferencer, setPræferencer] = useState({}) // { group_id: show_in_feed }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hentData()
  }, [user])

  async function hentData() {
    const [{ data: gruppeData }, { data: præfData }] = await Promise.all([
      supabase
        .from('ss_group_members')
        .select('group_id, role, status, ss_groups(id, name, description, is_public)')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
      supabase
        .from('ss_user_feed_preferences')
        .select('group_id, show_in_feed')
        .eq('user_id', user.id),
    ])

    setGrupper(gruppeData ?? [])

    // Byg map — grupper uden præference-række = show_in_feed: true (default)
    const map = {}
    præfData?.forEach((p) => { map[p.group_id] = p.show_in_feed })
    setPræferencer(map)
    setLoading(false)
  }

  function erIFeed(groupId) {
    // Ingen præference-række = true som default
    return præferencer[groupId] !== false
  }

  async function togglFeed(groupId, e) {
    e.preventDefault()
    e.stopPropagation()
    const nuværende = erIFeed(groupId)
    const nyVærdi = !nuværende

    // Optimistisk opdatering
    setPræferencer((prev) => ({ ...prev, [groupId]: nyVærdi }))

    const { error } = await supabase
      .from('ss_user_feed_preferences')
      .upsert(
        { user_id: user.id, group_id: groupId, show_in_feed: nyVærdi },
        { onConflict: 'user_id,group_id' }
      )

    if (error) {
      // Fortryd ved fejl
      setPræferencer((prev) => ({ ...prev, [groupId]: nuværende }))
    }
  }

  function handleGruppeOprettet() {
    setVisModal(false)
    hentData()
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        {/* Fane-navigation */}
        <div className="flex border-b border-gray-200 mb-6 gap-1">
          {FANER.map(({ id: faneId, label, ikon: Ikon }) => (
            <button
              key={faneId}
              onClick={() => setAktivFane(faneId)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                aktivFane === faneId
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Ikon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className={aktivFane !== 'feed' ? 'hidden' : ''}>
          <GlobaltFeed user={user} grupper={grupper} præferencer={præferencer} loading={loading} />
        </div>
        <div className={aktivFane !== 'grupper' ? 'hidden' : ''}>
          <GruppeListe
            grupper={grupper}
            loading={loading}
            erIFeed={erIFeed}
            togglFeed={togglFeed}
            visModal={visModal}
            setVisModal={setVisModal}
          />
        </div>
      </div>

      {visModal && (
        <OpretGruppeModal
          onClose={() => setVisModal(false)}
          onOprettet={handleGruppeOprettet}
        />
      )}
    </Layout>
  )
}

function GlobaltFeed({ user, grupper, præferencer, loading }) {
  const [opslag, setOpslag] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)

  useEffect(() => {
    if (!loading) hentFeed()
  }, [loading, præferencer])

  async function hentFeed() {
    setFeedLoading(true)

    // Find grupper der er slået til i feed
    const aktivGruppeIds = grupper
      .map((m) => m.group_id)
      .filter((id) => præferencer[id] !== false)

    if (aktivGruppeIds.length === 0) {
      setOpslag([])
      setFeedLoading(false)
      return
    }

    const { data } = await supabase
      .from('ss_posts')
      .select('id, content, created_at, group_id, author_id, ss_groups(id, name), ss_profiles!author_id(full_name, avatar_url)')
      .in('group_id', aktivGruppeIds)
      .order('created_at', { ascending: false })
      .limit(50)

    setOpslag(data ?? [])
    setFeedLoading(false)
  }

  if (loading || feedLoading) {
    return <p className="text-sm text-gray-400">Indlæser feed...</p>
  }

  if (opslag.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
        <p className="text-gray-500 text-sm mb-1">Ingen opslag endnu.</p>
        <p className="text-gray-400 text-xs">
          Gå til <button onClick={() => {}} className="text-indigo-500 hover:underline">Mine grupper</button> og sørg for at mindst én gruppe er slået til i feed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {opslag.map((o) => (
        <div key={o.id} className="bg-white border border-gray-200 rounded-xl px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`/grupper/${o.ss_groups?.id}`}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              {o.ss_groups?.name}
            </Link>
          </div>
          <div className="flex items-center gap-2.5 mb-2">
            <Link to={`/bruger/${o.author_id}`}><Avatar name={o.ss_profiles?.full_name} avatarUrl={o.ss_profiles?.avatar_url} className="w-7 h-7" /></Link>
            <Link to={`/bruger/${o.author_id}`} className="text-sm font-medium text-gray-800 hover:underline">{o.ss_profiles?.full_name}</Link>
            <span className="text-xs text-gray-400 ml-auto">
              {new Date(o.created_at).toLocaleDateString('da-DK', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{o.content}</p>
        </div>
      ))}
    </div>
  )
}

function GruppeListe({ grupper, loading, erIFeed, togglFeed, visModal, setVisModal }) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mine grupper</h2>
          <p className="text-sm text-gray-500 mt-0.5">Brug øje-ikonet til at styre feed-synlighed</p>
        </div>
        <button
          onClick={() => setVisModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Ny gruppe
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Indlæser grupper...</p>
      ) : grupper.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-gray-500 text-sm mb-3">Du er ikke medlem af nogen grupper endnu.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setVisModal(true)}
              className="text-sm text-indigo-600 hover:underline"
            >
              Opret en gruppe
            </button>
            <span className="text-gray-300">eller</span>
            <Link to="/grupper" className="text-sm text-indigo-600 hover:underline">
              Find en gruppe
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {grupper.map(({ group_id, role, ss_groups: gruppe }) => (
            <Link
              key={group_id}
              to={`/grupper/${gruppe.id}`}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-base font-bold shrink-0">
                {gruppe.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{gruppe.name}</span>
                  {gruppe.is_public
                    ? <Globe size={13} className="text-gray-400 shrink-0" />
                    : <Lock size={13} className="text-gray-400 shrink-0" />}
                  {role === 'admin' && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">Admin</span>
                  )}
                </div>
                {gruppe.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{gruppe.description}</p>
                )}
              </div>
              <button
                onClick={(e) => togglFeed(group_id, e)}
                title={erIFeed(group_id) ? 'Skjul fra feed' : 'Vis i feed'}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                  erIFeed(group_id)
                    ? 'text-indigo-500 hover:bg-indigo-50'
                    : 'text-gray-300 hover:bg-gray-100'
                }`}
              >
                {erIFeed(group_id) ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
