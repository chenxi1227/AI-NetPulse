import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { api } from '../services/api'

interface AuthState {
  token: string | null
  username: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'))

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password)
    localStorage.setItem('token', res.access_token)
    localStorage.setItem('refresh_token', res.refresh_token)
    localStorage.setItem('username', username)
    setToken(res.access_token)
    setUsername(username)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('username')
    setToken(null)
    setUsername(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
