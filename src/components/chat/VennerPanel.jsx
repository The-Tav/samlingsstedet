import { Check, X } from 'lucide-react'
import Avatar from '../Avatar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useChat } from '../../contexts/ChatContext'

export default function VennerPanel({ onLuk }) {
  const { user } = useAuth()
  const { venner, ventende, åbnDM, hentVenner, hentVentende } = useChat()

  async function accepter(forespørgselId) {
    await supabase.from('ss_friendships').update({ status: 'accepted' }).eq('id', forespørgselId)
    hentVenner(); hentVentende()
  }

  async function afvis(forespørgselId) {
    await supabase.from('ss_friendships').delete().eq('id', forespørgselId)
    hentVentende()
  }

  function åbnChat(ven) {
    åbnDM(ven.id, ven.full_name, ven.avatar_url)
    onLuk()
  }

  return (
    <div className="absolute bottom-12 right-0 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Venneforespørgsler */}
      {ventende.length > 0 && (
        <div className="border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 pt-3 pb-1">
            Forespørgsler ({ventende.length})
          </p>
          {ventende.map((f) => {
            const p = f['ss_profiles!ss_friendships_requester_id_fkey'] ?? f.ss_profiles
            return (
              <div key={f.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <Avatar name={p?.full_name} avatarUrl={p?.avatar_url} className="w-8 h-8 shrink-0" />
                <span className="flex-1 text-sm text-gray-800 truncate">{p?.full_name}</span>
                <button onClick={() => accepter(f.id)} className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors" title="Accepter"><Check size={13} /></button>
                <button onClick={() => afvis(f.id)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors" title="Afvis"><X size={13} /></button>
              </div>
            )
          })}
        </div>
      )}

      {/* Venneliste */}
      <div className="max-h-72 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 pt-3 pb-1">
          Venner ({venner.length})
        </p>
        {venner.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 pb-4">Ingen venner endnu. Besøg en brugers profil for at tilføje dem.</p>
        ) : (
          venner.map((v) => (
            <button
              key={v.id}
              onClick={() => åbnChat(v)}
              className="flex items-center gap-2.5 px-4 py-2.5 w-full hover:bg-gray-50 transition-colors text-left"
            >
              <Avatar name={v.full_name} avatarUrl={v.avatar_url} className="w-8 h-8 shrink-0" />
              <span className="text-sm text-gray-800 truncate">{v.full_name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
