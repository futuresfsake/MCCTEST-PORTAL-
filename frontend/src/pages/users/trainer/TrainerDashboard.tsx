import Header from '../../../components/layout/Header'
import Sidebar from '../../../components/layout/Sidebar'
import Footer from '../../../components/layout/Footer'
import AnnouncementWidget from '../../../components/Announcements/AnnouncementWidget'

function TrainerDashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="flex flex-1">
        <Sidebar variant="trainer" />
        <main className="flex-1 p-8">
          <AnnouncementWidget />
          <h1 className="text-3xl font-bold text-slate-900">
            Trainer Dashboard
          </h1>

          <p className="mt-2 text-slate-600">
            Welcome to the MCCTEST Portal, Trainer.
          </p>
        </main>
      </div>
      <Footer />
    </div>
  )
}

export default TrainerDashboard