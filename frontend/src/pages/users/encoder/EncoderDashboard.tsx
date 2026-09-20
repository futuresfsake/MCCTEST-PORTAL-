import Header from '../../../components/layout/Header'
import Sidebar from '../../../components/layout/Sidebar'
import Footer from '../../../components/layout/Footer'

function EncoderDashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="flex flex-1">
        <Sidebar variant="encoder" />
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Encoder Dashboard
          </h1>
          <p className="mt-2 text-slate-600">
            The Encoder dashboard is being prepared.
          </p>
        </main>
      </div>
      <Footer />
    </div>
  )
}

export default EncoderDashboard
