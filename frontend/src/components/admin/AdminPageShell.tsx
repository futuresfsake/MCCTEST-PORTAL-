import type { ReactNode } from 'react'
import Header from '../layout/Header'
import Sidebar from '../layout/Sidebar'
import Footer from '../layout/Footer'

interface AdminPageShellProps {
  /** Fallback sidebar menu. The sidebar normally follows the logged-in user's role. */
  variant?: 'admin' | 'registrar'
  /** Small uppercase label above the title, e.g. "Finance" */
  eyebrow: string
  title: string
  description: string
  /** Page content; when omitted an empty "nothing here yet" panel is shown */
  children?: ReactNode
}

/**
 * Common layout for admin pages: header, admin sidebar, page title and
 * footer. Pages that are not built yet render it without children.
 */
export default function AdminPageShell({
  variant = 'admin',
  eyebrow,
  title,
  description,
  children,
}: AdminPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant={variant} />
        <main className="min-w-0 flex-1 border-b border-slate-200 bg-slate-50">
          <section>
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                  {eyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                  {title}
                </h1>
                <p className="mt-2 text-slate-600">
                  {description}
                </p>
              </div>

              {children ?? (
                // Placeholder until the page's module is built
                <div className="border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Nothing here yet
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    This section is still being built.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  )
}
