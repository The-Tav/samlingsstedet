import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const [vinduer, setVinduer] = useState([])       // åbne + minimerede chatvinduer
  const [venner, setVenner] = useState([])          // accepterede venner
  const [ventende, setVentende] = useState([])      // indgående forespørgsler
  const [ulæste, setUlæste] = useState({})          // { vindueId: antal }

  // ── Hent venner + ventende ──────────────────────────────────────────────
  const hentVenner = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('ss_friendships')
      .select('id, requester_id, addressee_id, status, ss_profiles!ss_friendships_requester_id_fkey(id, full_name, avatar_url), ss_profiles!ss_friendships_addressee_id_fkey(id, full_name, avatar_url)')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    const liste = (data ?? []).map((f) => {
      const erRequester = f.requester_id === user.id
      return erRequester
        ? { ...f.ss_profiles_addressee_id_fkey, friendshipId: f.id }
        : { ...f.ss_profiles_requester_id_fkey, friendshipId: f.id }
    })
    setVenner(liste)
  }, [user])

  const hentVentende = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('ss_friendships')
      .select('id, requester_id, ss_profiles!ss_friendships_requester_id_fkey(id, full_name, avatar_url)')
      .eq('addressee_id', user.id)
      .eq('status', 'pending')

    setVentende(data ?? [])
  }, [user])

  useEffect(() => {
    if (!user) return
    hentVenner()
    hentVentende()

    // Realtime: nye indgående DM-beskeder → ulæst-tæller
    const kanal = supabase
      .channel(`dm-indgaaende-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ss_direct_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const senderId = payload.new.sender_id
        // Marker som ulæst hvis vinduet ikke er aktivt/åbent
        setUlæste((prev) => {
          const aktivt = vinduer.find((v) => v.id === senderId && !v.minimeret)
          if (aktivt) return prev
          return { ...prev, [senderId]: (prev[senderId] ?? 0) + 1 }
        })
      })
      .subscribe()

    return () => supabase.removeChannel(kanal)
  }, [user])

  // ── Vindues-håndtering ──────────────────────────────────────────────────
  function åbnDM(userId, navn, avatarUrl) {
    setVinduer((prev) => {
      const eksisterer = prev.find((v) => v.id === userId && v.type === 'dm')
      if (eksisterer) {
        // Fokusér: fjern minimering
        return prev.map((v) =>
          v.id === userId && v.type === 'dm' ? { ...v, minimeret: false } : v
        )
      }
      const nyt = { id: userId, type: 'dm', navn, avatarUrl, minimeret: false }
      return [...prev.slice(-2), nyt] // max 3 vinduer
    })
    // Nulstil ulæste for denne ven
    setUlæste((prev) => { const n = { ...prev }; delete n[userId]; return n })
  }

  function åbnGruppeChat(gruppeId, gruppeNavn) {
    setVinduer((prev) => {
      const eksisterer = prev.find((v) => v.id === gruppeId && v.type === 'gruppe')
      if (eksisterer) {
        return prev.map((v) =>
          v.id === gruppeId && v.type === 'gruppe' ? { ...v, minimeret: false } : v
        )
      }
      const nyt = { id: gruppeId, type: 'gruppe', navn: gruppeNavn, avatarUrl: null, minimeret: false }
      return [...prev.slice(-2), nyt]
    })
  }

  function lukVindue(id) {
    setVinduer((prev) => prev.filter((v) => v.id !== id))
  }

  function togglMinimer(id) {
    setVinduer((prev) =>
      prev.map((v) => (v.id === id ? { ...v, minimeret: !v.minimeret } : v))
    )
  }

  const antalVentende = ventende.length
  const antalUlæste = Object.values(ulæste).reduce((s, n) => s + n, 0)

  return (
    <ChatContext.Provider value={{
      vinduer, venner, ventende, ulæste,
      antalVentende, antalUlæste,
      åbnDM, åbnGruppeChat, lukVindue, togglMinimer,
      hentVenner, hentVentende,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  return useContext(ChatContext)
}
