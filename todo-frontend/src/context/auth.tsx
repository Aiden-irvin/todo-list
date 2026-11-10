import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, tokenStore, type AuthResponse } from '../services/api'

interface AuthState {
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(() => tokenStore.get() !== null)

  useEffect(() => tokenStore.onUnauthorized(() => setAuthenticated(false)), [])

  const value = useMemo<AuthState>(() => {
    const start = async (pending: Promise<AuthResponse>) => {
      tokenStore.set((await pending).access_token)
      setAuthenticated(true)
    }
    return {
      isAuthenticated,
      signIn: (email, password) => start(api.login(email, password)),
      register: (name, email, password) => start(api.register(name, email, password)),
      signOut: () => {
        tokenStore.clear()
        setAuthenticated(false)
      },
    }
  }, [isAuthenticated])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
