import { useEffect, useRef, useState } from 'react'
import { Minus, X } from 'lucide-react'
import Avatar from '../Avatar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useChat } from '../../contexts/ChatContext'
import { Link } from 'react-router-dom'

export default function ChatVindue({ vindue, position }) {
  const { user } = useAuth()
  const { lukVindue, togglMinimer } = useChat()
  const { id, type, navn, avatarUrl, minimeret } = vindue

  const [beskeder, setBeskeder] = useState([])
  const [loading, setLoading] = useState(true)
  const [indhold, setIndhold] = useState('')
  const [sender, setSender] = useState(false)
  const bundenRef = useRef(null)

  useEffect(() => {
    hentBeskeder()
    const kanal = opretRealtime()
    return () => supabase.removeChannel(kanal)
  }, [id, type])

  useEffect(() => {
    if (!minimeret) bundenRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [beskeder, minimeret])

  async function hentBeskeder() {
    setLoading(true)
    if (type === 'dm') {
      const { data } = await supabase
        .from('ss_direct_messages')
        .select('id, content, created_at, sender_id, ss_profiles!sender_id(full_name, avatar_url)')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100)
      setBeskeder(data ?? [])
    } else {
      const { data } = await supabase
        .from('ss_messages')
        .select('id, content, created_at, author_id, ss_profiles!author_id(full_name, avatar_url)')
        .eq('group_id', id)
        .order('created_at', { ascending: true })
        .limit(100)
      setBeskeder(data ?? [])
    }
    setLoading(false)
  }

  function opretRealtime() {
    if (type === 'dm') {
      return supabase
        .channel(`dm-vindue-${id}-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'ss_direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        }, async (payload) => {
          if (payload.new.sender_id !== id) return
          const { data } = await supabase
            .from('ss_direct_messages')
            .select('id, content, created_at, sender_id, ss_profiles!sender_id(full_name, avatar_url)')
            .eq('id', payload.new.id).single()
          if (data) setBeskeder((prev) => [...prev, data])
        })
        .subscribe()
    } else {
      return supabase
        .channel(`gruppe-vindue-${id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'ss_messages',
          filter: `group_id=eq.${id}`,
        }, async (payload) => {
          const { data } = await supabase
            .from('ss_messages')
            .select('id, content, created_at, author_id, ss_profiles!author_id(full_name, avatar_url)')
            .eq('id', payload.new.id).single()
          if (data) setBeskeder((prev) => [...prev, data])
        })
        .subscribe()
    }
  }

  async function send(e) {
    e?.preventDefault()
    if (!indhold.trim() || sender) return
    setSender(true)
    const tekst = indhold.trim()
    setIndhold('')
    if (type === 'dm') {
      await supabase.from('ss_direct_messages').insert({ sender_id: user.id, receiver_id: id, content: tekst })
      // Tilføj egen besked optimistisk
      setBeskeder((prev) => [...prev, {
        id: crypto.randomUUID(), content: tekst, created_at: new Date().toISOString(),
        sender_id: user.id, ss_profiles: { full_name: '', avatar_url: null }
      }])
    } else {
      await supabase.from('ss_messages').insert({ group_id: id, author_id: user.id, content: tekst })
    }
    setSender(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function formatTid(iso) {
    return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
  }

  const senderId  = (b) => type === 'dm' ? b.sender_id   : b.author_id
  const profil    = (b) => type === 'dm' ? b.ss_profiles : b.ss_profiles

  // Positionering: stacker fra højre
  const højre = 16 + position * 336

  return (
    <div
      className="fixed bottom-0 z-50 w-80 flex flex-col shadow-2xl rounded-t-xl overflow-hidden border border-gray-200 bg-white"
      style={{ right: `${højre}px` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 bg-white border-b border-gray-200 cursor-pointer select-none"
        onClick={() => togglMinimer(id)}
      >
        {type === 'gruppe' ? (
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
            {navn[0]?.toUpperCase()}
          </div>
        ) : (
          <Avatar name={navn} avatarUrl={avatarUrl} className="w-7 h-7" />
        )}
        <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{navn}</span>
        <button
          onClick={(e) => { e.stopPropagation(); togglMinimer(id) }}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); lukVindue(id) }}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Beskedliste + input — skjules hvis minimeret */}
      {!minimeret && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5 bg-gray-50" style={{ height: '340px' }}>
            {loading ? (
              <p className="text-xs text-gray-400 text-center pt-10">Indlæser...</p>
            ) : beskeder.length === 0 ? (
              <p className="text-xs text-gray-400 text-center pt-10">Ingen beskeder endnu.</p>
            ) : (
              <>
                {beskeder.map((b, i) => {
                  const erMig = senderId(b) === user.id
                  const forrige = beskeder[i - 1]
                  const sammeAfs = senderId(forrige) === senderId(b)
                  const p = profil(b)
                  return (
                    <div key={b.id} className={`flex items-end gap-1.5 ${erMig ? 'flex-row-reverse' : ''} ${sammeAfs ? 'mt-0.5' : 'mt-3'}`}>
                      {!erMig && (
                        <Link to={`/bruger/${senderId(b)}`} onClick={(e) => e.stopPropagation()} className={sammeAfs ? 'invisible w-6 h-6 shrink-0' : ''}>
                          <Avatar name={p?.full_name} avatarUrl={p?.avatar_url} className="w-6 h-6" />
                        </Link>
                      )}
                      <div className={`max-w-[75%] flex flex-col ${erMig ? 'items-end' : 'items-start'}`}>
                        {!sammeAfs && (
                          <span className={`text-[10px] text-gray-400 mb-0.5 ${erMig ? 'text-right' : ''}`}>
                            {erMig ? 'Dig' : p?.full_name} · {formatTid(b.created_at)}
                          </span>
                        )}
                        <div className={`px-2.5 py-1.5 rounded-2xl text-xs whitespace-pre-wrap break-words ${
                          erMig ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                        }`}>
                          {b.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bundenRef} />
              </>
            )}
          </div>

          <form onSubmit={send} className="flex items-end gap-1.5 p-2 border-t border-gray-200 bg-white">
            <textarea
              value={indhold}
              onChange={(e) => setIndhold(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv en besked…"
              rows={1}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-gray-50"
              style={{ maxHeight: '80px', overflowY: 'auto' }}
            />
            <button
              type="submit"
              disabled={!indhold.trim() || sender}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full w-7 h-7 flex items-center justify-center transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 rotate-90">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </form>
        </>
      )}
    </div>
  )
}
