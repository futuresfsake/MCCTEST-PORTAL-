import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface SignOutButtonProps {
  className?: string
  label?: string
}

function SignOutButton({
  className = 'border border-blue-900 px-5 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-900 hover:text-white',
  label = 'Sign Out',
}: SignOutButtonProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={className}
    >
      {label}
    </button>
  )
}

export default SignOutButton
