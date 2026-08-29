import mcctestLogo from '../../assets/mcctest-logo.png'

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">

        {/* Logo */}
        <a href="#home" className="flex items-center gap-3">
          <img
            src={mcctestLogo}
            alt="MCCTEST"
            className="h-12 w-12 object-contain"
          />

          <div className="hidden sm:block">
            <p className="text-lg font-bold leading-none text-blue-900">
              MCCTEST
            </p>

            <p className="mt-1 text-[11px] font-medium tracking-[0.15em] text-slate-500">
              PORTAL
            </p>
          </div>
        </a>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#about"
            className="text-sm font-medium text-slate-600 transition hover:text-blue-900"
          >
            About
          </a>

          <a
            href="#programs"
            className="text-sm font-medium text-slate-600 transition hover:text-blue-900"
          >
            Programs
          </a>

          <a
            href="#verification"
            className="text-sm font-medium text-slate-600 transition hover:text-blue-900"
          >
            Verify Certificate
          </a>

          <a
            href="#contact"
            className="text-sm font-medium text-slate-600 transition hover:text-blue-900"
          >
            Contact
          </a>
        </nav>

        {/* Sign In */}
        <a
          href="#home"
          className="border border-blue-900 px-5 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-900 hover:text-white"
        >
          Sign In
        </a>

      </div>
    </header>
  )
}

export default Header