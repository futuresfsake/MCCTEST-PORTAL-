import { useAuth } from '../../context/AuthContext'
import mcctestLogo from '../../assets/mcctest-logo.png'

function Header() {
  const { isAuthenticated, logout, user } = useAuth()

  const handleSignOut = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-yellow-500/30 bg-yellow-400">
      <div className="flex h-20 w-full items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo, Brand, and Role */}
        <div className="flex items-center gap-4">
          <a href="#home" className="flex flex-row items-center gap-3">
            <img
              src={mcctestLogo}
              alt="MCCTEST"
              className="h-12 w-12 object-contain"
            />

            <div className="flex flex-col">
              <p className="text-lg font-bold leading-none text-slate-950">
                MCCTEST
              </p>

              <p className="mt-1 text-[11px] font-medium tracking-[0.15em] text-slate-700">
                PORTAL
              </p>
            </div>
          </a>

          {isAuthenticated && user?.role && (
            <span className="rounded-full bg-slate-950/10 px-3 py-1 text-xs font-semibold tracking-wider text-slate-900 uppercase">
              {user.role}
            </span>
          )}
        </div>

        {/* Authentication */}
        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="border border-slate-950 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-950 hover:text-white"
          >
            Sign Out
          </button>
        ) : (
          <a
            href="#home"
            className="border border-slate-950 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-950 hover:text-white"
          >
            Sign In
          </a>
        )}
      </div>
    </header>
  )
}

export default Header