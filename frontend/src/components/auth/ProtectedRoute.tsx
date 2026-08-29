import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: string[]
}

function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
        <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">
            Loading...
        </p>
        </div>
    )
    }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    switch (user.role) {
      case 'ADMIN':
        return <Navigate to="/admin" replace />

      case 'TRAINER':
        return <Navigate to="/trainer" replace />

      case 'TRAINEE':
        return <Navigate to="/trainee" replace />

      default:
        return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute