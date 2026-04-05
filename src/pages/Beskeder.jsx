import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useChat } from '../contexts/ChatContext'

export default function Beskeder() {
  const { user } = useAuth()
  const { venner, åbnGruppeChat } = useChat()
  const navigate = useNavigate()

  const [dmSamtaler, setDmSamtaler] = useState([])   // { ven, senestebesked }
  const [gruppeChats, setGruppeChats] = useState([]) // { gruppe, senestebesked }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hentBeskeder()
  }, [venner])

  async function hentBeskeder() {
    // DM-samtaler: for hver ven, find seneste besked
    const dmListe = await Promise.all(
      venner.map(async (ven) => {
        const { data } = await supabase
          .from('ss_direct_messages')
          .select('content, created_at')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${ven.id}),and(sender_id.eq.${ven.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return { ven, senestebesked: data }
      })
    )

    // Gruppe-chats: hent grupper + seneste besked
    const { data: gruppeData } = await supabase
      .from('ss_group_members')
      .select('group_id, ss_groups(id, name)')
      .eq('user_id', user.id)
      .eq('status', 'approved')

    const gruppeListe = await Promise.all(
      (gruppeData ?? []).map(async ({ ss_groups: g }) => {
        const { data } = await supabase
          .from('ss_messages')
          .select('content, created_at')
          .eq('group_id', g.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return { gruppe: g, senestebesked: data }
      })
    )

    // Sorter begge lister efter seneste aktivitet
    setDmSamtaler(
      dmListe.sort((a, b) => {
        const at = a.senestebesked?.created_at ?? ''
        const bt = b.senestebesked?.created_at ?? ''
        return bt.localeCompare(at)
      })
    )
    setGruppeChats(
      gruppeListe.sort((a, b) => {
        const at = a.senestebesked?.created_at ?? ''
        const bt = b.senestebesked?.created_at ?? ''
        return bt.localeCompare(at)
      })
    )
    setLoading(false)
  }

  function formatTid(iso) {
    if (!iso) return ''
    const dato = new Date(iso)
    const nu = new Date()
    const sammedag = dato.toDateString() === nu.toDateString()
    return sammedag
      ? dato.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
      : dato.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
  }

  return (
    <Layout>
      <div className="max-w-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Beskeder</h2>

        {loading ? (
          <p className="text-sm text-gray-400">Indlæser samtaler...</p>
        ) : (
          <div className="space-y-6">
            {/* Direkte beskeder */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Direkte beskeder
              </h3>
              {dmSamtaler.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                  <MessageSquare size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Ingen direkte beskeder endnu.</p>
                  <p className="text-xs text-gray-400 mt-1">Besøg en brugers profil for at tilføje dem som ven og starte en samtale.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {dmSamtaler.map(({ ven, senestebesked }) => (
                    <Link
                      key={ven.id}
                      to={`/bruger/${ven.id}`}
                      className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                    >
                      <Avatar name={ven.full_name} avatarUrl={ven.avatar_url} className="w-10 h-10 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-900">{ven.full_name}</span>
                        {senestebesked && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{senestebesked.content}</p>
                        )}
                      </div>
                      {senestebesked && (
                        <span className="text-xs text-gray-400 shrink-0">{formatTid(senestebesked.created_at)}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Gruppe-chats */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Gruppe-chats
              </h3>
              {gruppeChats.length === 0 ? (
                <p className="text-sm text-gray-400">Du er ikke medlem af nogen grupper.</p>
              ) : (
                <div className="space-y-1">
                  {gruppeChats.map(({ gruppe, senestebesked }) => (
                    <Link
                      key={gruppe.id}
                      to={`/grupper/${gruppe.id}`}
                      className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-base font-bold shrink-0">
                        {gruppe.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-900">{gruppe.name}</span>
                        {senestebesked && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{senestebesked.content}</p>
                        )}
                      </div>
                      {senestebesked && (
                        <span className="text-xs text-gray-400 shrink-0">{formatTid(senestebesked.created_at)}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
