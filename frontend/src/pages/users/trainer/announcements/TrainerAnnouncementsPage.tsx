import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'
import Announcements from '../../../../components/Announcements/Announcements'

export default function TrainerAnnouncementsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="trainer" />
        <main className="min-w-0 flex-1 border-b border-slate-200 bg-slate-50">
          <section>
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                  Communications
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                  Announcements
                </h1>
                <p className="mt-2 text-slate-600">
                  Publish notices for your programs and batches.
                </p>
              </div>
              <Announcements
                canPostGlobal={false}
                canPostProgram
                canPostBatch
                canEdit
                manageAll
              />
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  )
}
