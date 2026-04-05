import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, UserPlus, UserCheck, MessageCircle, FileText,
  Calendar, Mail, CheckCheck, Trash2,
} from 'lucide-react'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const IKON_MAP = {
  friend_request:   { ikon: UserPlus,      farve: 'text-indigo-600 bg-indigo-100' },
  friend_accepted:  { ikon: UserCheck,     farve: 'text-green-600  bg-green-100'  },
  new_dm:           { ikon: MessageCircle, farve: 'text-blue-600   bg-blue-100'   },
  new_post:         { ikon: FileText,      farve: 'text-orange-600 bg-orange-100' },
  new_event:        { ikon: Calendar,      farve: 'text-purple-600 bg-purple-100' },
  group_invitation: { ikon: Mail,          farve: 'text-pink-600   bg-pink-100'   },
}

function formatTid(iso) {
  const dato = new Date(iso)
  const nu = new Date()
  const diff = (nu - dato) / 1000
  if (diff < 60)    return 'Lige nu'
  if (diff < 3600)  return `${Math.floor(diff / 60)} min. siden`
  if (diff < 86400) return `${Math.floor(diff / 3600)} t. siden`
  return dato.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
}

export default function Notifikationer() {
  const { user } = useAuth()
  const [notifikationer, setNotifikationer] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hentNotifikationer()
  }, [])

  async function hentNotifikationer() {
    const { data } = await supabase
      .from('ss_notifications')
      .select('*, ss_profiles!actor_id(full_name, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60)
    setNotifikationer(data ?? [])
    setLoading(false)
  }

  async function markerLæst(id) {
    await supabase.from('ss_notifications').update({ read: true }).eq('id', id)
    setNotifikationer((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  async function markerAlleLæst() {
    const ulæsteIds = notifikationer.filter((n) => !n.read).map((n) => n.id)
    if (!ulæsteIds.length) return
    await supabase.from('ss_notifications').update({ read: true }).in('id', ulæsteIds)
    setNotifikationer((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function sletNotifikation(id, e) {
    e.preventDefault()
    e.stopPropagation()
    await supabase.from('ss_notifications').delete().eq('id', id)
    setNotifikationer((prev) => prev.filter((n) => n.id !== id))
  }

  async function sletAlle() {
    await supabase.from('ss_notifications').delete().eq('user_id', user.id)
    setNotifikationer([])
  }

  const antalUlæste = notifikationer.filter((n) => !n.read).length

  return (
    <Layout>
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Notifikationer</h2>
            {antalUlæste > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">{antalUlæste} ulæste</p>
            )}
          </div>
          {notifikationer.length > 0 && (
            <div className="flex items-center gap-2">
              {antalUlæste > 0 && (
                <button
                  onClick={markerAlleLæst}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <CheckCheck size={14} />
                  Marker alle som læst
                </button>
              )}
              <button
                onClick={sletAlle}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Ryd alle
              </button>
            </div>
          )}
        </div>

        {/* Liste */}
        {loading ? (
          <p className="text-sm text-gray-400">Indlæser notifikationer...</p>
        ) : notifikationer.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bell size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Ingen notifikationer.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifikationer.map((n) => {
              const { ikon: Ikon, farve } = IKON_MAP[n.type] ?? { ikon: Bell, farve: 'text-gray-600 bg-gray-100' }
              const profil = n['ss_profiles!actor_id'] ?? n.ss_profiles
              return (
                <Link
                  key={n.id}
                  to={n.link ?? '#'}
                  onClick={() => !n.read && markerLæst(n.id)}
                  className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-colors group ${
                    n.read
                      ? 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                      : 'bg-indigo-50 border-indigo-200 hover:border-indigo-300'
                  }`}
                >
                  {/* Type-ikon */}
                  <div className={`relative shrink-0 mt-0.5`}>
                    <Avatar
                      name={profil?.full_name}
                      avatarUrl={profil?.avatar_url}
                      className="w-9 h-9"
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center ${farve}`}
                      style={{ width: 18, height: 18 }}>
                      <Ikon size={10} />
                    </span>
                  </div>

                  {/* Tekst */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatTid(n.created_at)}</p>
                  </div>

                  {/* Ulæst prik + slet */}
                  <div className="flex items-center gap-2 shrink-0 self-center">
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                    <button
                      onClick={(e) => sletNotifikation(n.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
