import { useAuth } from '../../../context/AuthContext'

function AdminDashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-bold text-slate-900">
              MCCTEST Portal
            </h1>

            <p className="text-sm text-slate-500">
              Welcome, {user?.firstName}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <h2 className="text-2xl font-bold">
          Admin Dashboard
        </h2>
      </main>
    </div>
  )
}

export default AdminDashboard