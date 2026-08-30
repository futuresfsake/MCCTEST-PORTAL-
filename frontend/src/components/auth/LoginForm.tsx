import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function LoginForm() {
  const [systemId, setSystemId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemId,
            password,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials')
      }

      // Store authentication data
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('sessionToken', data.sessionToken)
      localStorage.setItem('user', JSON.stringify(data.user))

      console.log('Login successful:', data)

      // Redirect based on role
      switch (data.user.role) {
        case 'ADMIN':
            console.log(data.user.role)
            console.log('Redirecting to /admin')
            navigate('/admin', { replace: true })
            break

        case 'TRAINER':
            navigate('/trainer')
            break

        case 'TRAINEE':
            navigate('/trainee')
            break

        default:
            throw new Error('Unknown user role')
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md border-t-4 border-blue-900 bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-yellow-600">
          Portal Access
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Welcome back
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Sign in to access your MCCTEST account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="systemId"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            ID
          </label>

          <input
            id="systemId"
            name="systemId"
            type="text"
            value={systemId}
            onChange={(event) => setSystemId(event.target.value)}
            placeholder="MCCTP-26-001"
            required
            className="w-full border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-800 focus:ring-1 focus:ring-blue-800"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            className="w-full border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-800 focus:ring-1 focus:ring-blue-800"
          />
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

export default LoginForm