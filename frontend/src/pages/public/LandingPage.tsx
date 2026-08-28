import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function LandingPage() {
  const navigate = useNavigate()

  const [systemId, setSystemId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError('')

    if (!systemId || !password) {
      setError('Please enter your System ID and password.')
      return
    }

    // Temporary redirect for Task 4
    // Backend authentication will be connected here.
    navigate('/admin/dashboard')
  }

  return (
    <main>
      <h1>MCCTEST Portal</h1>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="systemId">System ID</label>

          <input
            id="systemId"
            type="text"
            value={systemId}
            onChange={(event) => setSystemId(event.target.value)}
            placeholder="MCCTP-26-001"
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
          />
        </div>

        {error && <p>{error}</p>}

        <button type="submit">
          Login
        </button>
      </form>
    </main>
  )
}

export default LandingPage