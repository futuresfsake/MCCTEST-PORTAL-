import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
children: ReactNode
allowedRoles: string[]
}

function ProtectedRoute({
children,
allowedRoles,
}: ProtectedRouteProps) {
const {
user,
isAuthenticated,
isLoading,
} = useAuth()

const location = useLocation()

/*

* Wait until AuthContext finishes restoring
* the authentication state.
  */
  if (isLoading) {
  return (

   <div className="flex min-h-screen items-center justify-center bg-slate-50">
     <p className="text-sm text-slate-500">
       Loading...
     </p>
   </div>

)

}

/*

* User is not logged in.
  */
  if (!isAuthenticated || !user) {
  return (
  <Navigate
  to="/LandingPage"
  replace
  state={{ from: location.pathname}}
  />
  )
  }

/*

* User is logged in but does not have
* permission for this role.
  */
  if (!allowedRoles.includes(user.role)) {
  return <Navigate to="/403" replace />
  }

return <>{children}</>
}

export default ProtectedRoute
