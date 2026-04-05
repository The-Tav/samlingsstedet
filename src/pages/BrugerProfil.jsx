import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { UserPlus, UserCheck, Clock, MessageCircle, X, Check, Globe, Lock } from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../contexts/ChatContext'

export default function BrugerProfil() {
  const { id } = useParams()
  const { user } = useAuth()
  const { åbnDM } = useChat()
  const navigate = useNavigate()

  const [profil, setProfil] = useState(null)
  const [fællesGrupper, setFællesGrupper] = useState([])
  const [venskab, setVenskab] = useState(null) // null | { id, status, requester_id }
  const [loading, setLoading] = useState(true)
  const [arbejder, setArbejder] = useState(false)

  // Redirect til egen profil
  useEffect(() => {
    if (id === user?.id) navigate('/profil', { replace: true })
  }, [id, user])

  useEffect(() => {
    if (id && id !== user?.id) hentData()
  }, [id])

  async function hentData() {
    setLoading(true)
    const [{ data: profilData }, { data: venskabData }, { data: gruppeData }] = await Promise.all([
      // Profil
      supabase.from('ss_profiles').select('id, full_name, avatar_url').eq('id', id).single(),
      // Venskabsstatus
      supabase.from('ss_friendships')
        .select('id, status, requester_id, addressee_id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`)
        .maybeSingle(),
      // Fælles grupper
      supabase.from('ss_group_members')
        .select('group_id, ss_groups(id, name, is_public)')
        .eq('user_id', id)
        .eq('status', 'approved'),
    ])

    if (!profilData) { navigate('/'); return }
    setProfil(profilData)
    setVenskab(venskabData)

    // Find fælles grupper: grupper brugeren er i OG jeg er i
    if (gruppeData?.length) {
      const deresGruppeIds = gruppeData.map((m) => m.group_id)
      const { data: mineGrupper } = await supabase
        .from('ss_group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .in('group_id', deresGruppeIds)

      const mineIds = new Set(mineGrupper?.map((m) => m.group_id) ?? [])
      setFællesGrupper(gruppeData.filter((m) => mineIds.has(m.group_id)).map((m) => m.ss_groups))
    }
    setLoading(false)
  }

  async function tilføjVen() {
    setArbejder(true)
    await supabase.from('ss_friendships').insert({ requester_id: user.id, addressee_id: id })
    await hentData()
    setArbejder(false)
  }

  async function annullerForespørgsel() {
    setArbejder(true)
    await supabase.from('ss_friendships').delete().eq('id', venskab.id)
    setVenskab(null)
    setArbejder(false)
  }

  async function besvarForespørgsel(accepter) {
    setArbejder(true)
    if (accepter) {
      await supabase.from('ss_friendships').update({ status: 'accepted' }).eq('id', venskab.id)
    } else {
      await supabase.from('ss_friendships').delete().eq('id', venskab.id)
    }
    await hentData()
    setArbejder(false)
  }

  async function fjernVen() {
    setArbejder(true)
    await supabase.from('ss_friendships').delete().eq('id', venskab.id)
    setVenskab(null)
    setArbejder(false)
  }

  function handleÅbnDM() {
    åbnDM(profil.id, profil.full_name, profil.avatar_url)
  }

  if (loading) return <Layout><p className="text-sm text-gray-400">Indlæser profil...</p></Layout>

  // Udled venskabsstatus
  const erAccepteret   = venskab?.status === 'accepted'
  const jegSendte      = venskab?.status === 'pending' && venskab?.requester_id === user.id
  const deSendte       = venskab?.status === 'pending' && venskab?.requester_id === id

  return (
    <Layout>
      <div className="max-w-lg">
        {/* Profil-header */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-5">
            <Avatar name={profil.full_name} avatarUrl={profil.avatar_url} className="w-20 h-20" tekstKlasse="text-2xl" />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900">{profil.full_name}</h2>

              {/* Venneknapper */}
              <div className="flex flex-wrap gap-2 mt-3">
                {!venskab && (
                  <button onClick={tilføjVen} disabled={arbejder}
                    className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
                    <UserPlus size={15} /> Tilføj ven
                  </button>
                )}

                {jegSendte && (
                  <button onClick={annullerForespørgsel} disabled={arbejder}
                    className="flex items-center gap-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                    <Clock size={15} /> Venter på svar · Annuller
                  </button>
                )}

                {deSendte && (
                  <>
                    <button onClick={() => besvarForespørgsel(true)} disabled={arbejder}
                      className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
                      <Check size={15} /> Accepter
                    </button>
                    <button onClick={() => besvarForespørgsel(false)} disabled={arbejder}
                      className="flex items-center gap-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                      <X size={15} /> Afvis
                    </button>
                  </>
                )}

                {erAccepteret && (
                  <>
                    <button onClick={handleÅbnDM}
                      className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                      <MessageCircle size={15} /> Send besked
                    </button>
                    <button onClick={fjernVen} disabled={arbejder}
                      className="flex items-center gap-1.5 text-sm font-medium bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg transition-colors">
                      <UserCheck size={15} /> Venner · Fjern
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fælles grupper */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Fælles grupper ({fællesGrupper.length})
          </h3>
          {fællesGrupper.length === 0 ? (
            <p className="text-sm text-gray-400">Ingen fælles grupper.</p>
          ) : (
            <div className="space-y-2">
              {fællesGrupper.map((g) => (
                <Link key={g.id} to={`/grupper/${g.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {g.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-800 flex-1">{g.name}</span>
                  {g.is_public ? <Globe size={13} className="text-gray-400" /> : <Lock size={13} className="text-gray-400" />}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
