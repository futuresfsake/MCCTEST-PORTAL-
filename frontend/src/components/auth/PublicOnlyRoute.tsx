import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'

interface PublicOnlyRouteProps {
children: ReactNode
}

function getDashboardPath(role: string) {
switch (role) {
case 'ADMIN':
return '/admin'

case 'REGISTRAR':
  return '/registrar'

case 'TRAINER':
  return '/trainer'

case 'TRAINEE':
  return '/trainee'

case 'ENCODER':
  return '/encoder'

default:
  return '/landing'

}
}

function PublicOnlyRoute({
children,
}: PublicOnlyRouteProps) {
const { user, isAuthenticated, isLoading } = useAuth()

/*

* Wait until AuthContext has finished restoring
* the session from localStorage.
  */
  if (isLoading) {
  return (

   <div className="flex min-h-screen items-center justify-center bg-white">
     <p className="text-sm text-slate-500">
       Loading...
     </p>
   </div>

)

}

/*

* If the user is already authenticated,
* they should NEVER see the public landing/login page.
*
* Send them back to their own dashboard.
  */
  if (isAuthenticated && user) {
  return ( <Navigate
  to={getDashboardPath(user.role)}
  replace
  />
  )
  }

/*

* User is not authenticated,
* so the public page can be displayed.
  */
  return <>{children}</>
  }

export default PublicOnlyRoute
