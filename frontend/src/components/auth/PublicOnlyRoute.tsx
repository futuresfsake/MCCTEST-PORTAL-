import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'

interface PublicOnlyRouteProps {
children: ReactNode
}

function getDashboardPath(role: string) {
switch (role) {
case 'ADMIN':
return '/admin/dashboard'

case 'REGISTRAR':
  return '/registrar/dashboard'

case 'TRAINER':
return '/trainer/dashboard'

case 'TRAINEE':
return '/trainee/dashboard'

case 'ENCODER':
  return '/encoder/dashboard'

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
