import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { MemberProfile, UserRole } from '@/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: MemberProfile | null
  role: UserRole
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: UserRole | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [role, setRole] = useState<UserRole>('member')
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string, userMetadata?: User): Promise<UserRole> => {
    const adminRole = userMetadata?.app_metadata?.['role']
    if (adminRole === 'admin') {
      setRole('admin')
      const { data, error } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) {
        console.error('Error fetching profile:', error)
      } else {
        setProfile(data as MemberProfile | null)
      }
      return 'admin'
    }

    const { data, error } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
    } else {
      setProfile(data as MemberProfile | null)
    }

    const { data: strategistData } = await supabase
      .from('strategist_assignments')
      .select('id')
      .eq('strategist_id', userId)
      .eq('is_active', true)
      .limit(1)

    let determinedRole: UserRole = 'member'
    if ((data as MemberProfile | null)?.is_strategist || (strategistData && strategistData.length > 0)) {
      determinedRole = 'strategist'
    }
    setRole(determinedRole)
    return determinedRole
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id, session.user)
        } else {
          setProfile(null)
          setRole('member')
        }
        setLoading(false)
      })()
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message, role: null }

    setUser(data.user)
    setSession(data.session)
    setLoading(false)
    const adminRole = data.user?.app_metadata?.['role']
    const determinedRole: UserRole = adminRole === 'admin' ? 'admin' : 'member'
    setRole(determinedRole)
    return { error: null, role: determinedRole }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setRole('member')
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user)
    }
  }

  return (
    <AuthContext.Provider
      value={{ session, user, profile, role, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
