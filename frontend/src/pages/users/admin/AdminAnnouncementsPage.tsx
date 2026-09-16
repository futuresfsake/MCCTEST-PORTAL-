import Header from '../../../components/layout/Header'
import Sidebar from '../../../components/layout/Sidebar'
import Footer from '../../../components/layout/Footer'
import AdminAnnouncements from '../../../components/announcements/AdminAnnouncements'

function AdminAnnouncementsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="admin" />
        <main className="min-w-0 flex-1">
          <AdminAnnouncements />
        </main>
      </div>
      <Footer />
    </div>
  )
}

export default AdminAnnouncementsPage
