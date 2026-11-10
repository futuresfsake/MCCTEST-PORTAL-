import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

interface User {
  id: string
  systemId: string
  role: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  sessionToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (accessToken: string, sessionToken: string, user: User) => void
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch {
          localStorage.removeItem('user')
          setUser(null)
        }
      }
      setAccessToken(localStorage.getItem('accessToken'))
      setSessionToken(localStorage.getItem('sessionToken'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = (newAccessToken: string, newSessionToken: string, newUser: User) => {
    localStorage.setItem('accessToken', newAccessToken)
    localStorage.setItem('sessionToken', newSessionToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setAccessToken(newAccessToken)
    setSessionToken(newSessionToken)
    setUser(newUser)
  }

  const logout = async () => {
    try {
      if (sessionToken) {
        await fetch(`${apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken ?? ''}`,
            'X-Session-Token': sessionToken,
          },
        })
      }
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('user')
      setUser(null)
      setAccessToken(null)
      setSessionToken(null)
    }
  }

  const updateUser = (updates: Partial<User>) => {
    setUser((current) => {
      if (!current) return current
      const updated = { ...current, ...updates }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        sessionToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
