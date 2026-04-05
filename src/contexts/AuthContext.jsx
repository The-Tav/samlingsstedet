import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    // Hent navn fra auth metadata — opdater profil hvis metadata har et navn
    const metaNavn = (await supabase.auth.getUser()).data?.user?.user_metadata?.full_name
    if (metaNavn) {
      await supabase
        .from('ss_profiles')
        .upsert({ id: userId, full_name: metaNavn }, { onConflict: 'id' })
    }

    const { data } = await supabase
      .from('ss_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data)
    setLoading(false)
  }

  async function opdaterProfil(nytNavn) {
    const { data, error } = await supabase
      .from('ss_profiles')
      .update({ full_name: nytNavn.trim() })
      .eq('id', user.id)
      .select()
      .single()

    if (!error) setProfile(data)
    return { error }
  }

  async function register(email, password, fullName) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error }
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, register, login, logout, opdaterProfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
