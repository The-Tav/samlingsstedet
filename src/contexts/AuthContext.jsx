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
    // Synkroniser full_name fra auth-metadata hvis det er sat
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

  // Opdater navn og/eller avatar_url
  async function opdaterProfil({ fullName, avatarUrl } = {}) {
    const opdatering = {}
    if (fullName !== undefined) opdatering.full_name = fullName.trim()
    if (avatarUrl !== undefined) opdatering.avatar_url = avatarUrl

    const { data, error } = await supabase
      .from('ss_profiles')
      .update(opdatering)
      .eq('id', user.id)
      .select()
      .single()

    if (!error) setProfile(data)
    return { error }
  }

  // Skift adgangskode (kræver at brugeren er logget ind)
  async function skiftKodeord(nytKodeord) {
    const { error } = await supabase.auth.updateUser({ password: nytKodeord })
    return { error }
  }

  async function register(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    // session er null når e-mailbekræftelse er påkrævet
    return { error, bekræftelsesPåkrævet: !error && !data?.session }
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, register, login, logout, opdaterProfil, skiftKodeord }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
