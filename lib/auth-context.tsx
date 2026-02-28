"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { authApi, setToken, clearToken, type User, type UserRole } from "./api"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // On mount, re-validate stored token
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hms_token") : null
    if (token) {
      authApi.me()
        .then((user) => setAuth({ user: user as unknown as User, isAuthenticated: true, isLoading: false }))
        .catch(() => {
          clearToken()
          setAuth({ user: null, isAuthenticated: false, isLoading: false })
        })
    } else {
      setAuth({ user: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password)
    setToken(token)
    setAuth({ user: user as unknown as User, isAuthenticated: true, isLoading: false })
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setAuth({ user: null, isAuthenticated: false, isLoading: false })
  }, [])

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!auth.user) return false
      return roles.includes(auth.user.role)
    },
    [auth.user]
  )

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
