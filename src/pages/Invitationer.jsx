import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Clock, Check, X } from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Invitationer() {
  const { user } = useAuth()
  const [invitationer, setInvitationer] = useState([])
  const [loading, setLoading] = useState(true)
  const [behandler, setBehandler] = useState(null) // invitation id under behandling

  useEffect(() => {
    hentInvitationer()
  }, [])

  async function hentInvitationer() {
    const { data } = await supabase
      .from('ss_group_invitations')
      .select(`
        id, email, status, created_at, expires_at,
        ss_groups(id, name, description, is_public),
        ss_profiles!invited_by(full_name, avatar_url)
      `)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    setInvitationer(data ?? [])
    setLoading(false)
  }

  async function accepter(inv) {
    setBehandler(inv.id)
    // Opret medlemskab direkte som godkendt (invitation = direkte adgang)
    const { error: medlemError } = await supabase
      .from('ss_group_members')
      .insert({ group_id: inv.ss_groups.id, user_id: user.id, role: 'member', status: 'approved' })

    if (medlemError && medlemError.code !== '23505') {
      // 23505 = allerede medlem, det er OK
      setBehandler(null)
      return
    }

    await supabase
      .from('ss_group_invitations')
      .update({ status: 'accepted' })
      .eq('id', inv.id)

    await hentInvitationer()
    setBehandler(null)
  }

  async function afvis(invId) {
    setBehandler(invId)
    await supabase
      .from('ss_group_invitations')
      .update({ status: 'declined' })
      .eq('id', invId)
    await hentInvitationer()
    setBehandler(null)
  }

  function formatDato(iso) {
    return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Invitationer</h2>

        {loading ? (
          <p className="text-sm text-gray-400">Indlæser invitationer...</p>
        ) : invitationer.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Du har ingen aktive invitationer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitationer.map((inv) => (
              <div key={inv.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  {/* Gruppe-ikon */}
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                    {inv.ss_groups?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{inv.ss_groups?.name}</h3>
                    {inv.ss_groups?.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{inv.ss_groups.description}</p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <Avatar
                        name={inv['ss_profiles!invited_by']?.full_name ?? inv.ss_profiles?.full_name}
                        avatarUrl={inv['ss_profiles!invited_by']?.avatar_url ?? inv.ss_profiles?.avatar_url}
                        className="w-5 h-5"
                        tekstKlasse="text-[9px]"
                      />
                      <span className="text-xs text-gray-500">
                        Inviteret af{' '}
                        <span className="font-medium text-gray-700">
                          {inv['ss_profiles!invited_by']?.full_name ?? inv.ss_profiles?.full_name ?? 'Ukendt'}
                        </span>
                      </span>
                      <span className="text-gray-300">·</span>
                      <Clock size={12} className="text-gray-300 shrink-0" />
                      <span className="text-xs text-gray-400">{formatDato(inv.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Handlingsknapper */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => accepter(inv)}
                    disabled={behandler === inv.id}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Check size={15} />
                    {behandler === inv.id ? 'Behandler...' : 'Accepter'}
                  </button>
                  <button
                    onClick={() => afvis(inv.id)}
                    disabled={behandler === inv.id}
                    className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <X size={15} />
                    Afvis
                  </button>
                  <Link
                    to={`/grupper/${inv.ss_groups?.id}`}
                    className="ml-auto text-xs text-gray-400 hover:text-indigo-600 self-center transition-colors"
                  >
                    Se gruppe
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
