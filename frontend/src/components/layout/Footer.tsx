function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>
          © {new Date().getFullYear()} MCCTEST Portal
        </p>

        <p>
          Training. Assessment. Certification.
        </p>
      </div>
    </footer>
  )
}

export default Footer