import React from 'react'
import Header from '../../../components/layout/Header2nd'
import Sidebar from '../../../components/layout/Sidebar'
import Footer from '../../../components/layout/Footer'

const AdminDashboard: React.FC = () => {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-slate-900">
      {/* Global Header */}
      <Header />

      {/* Main Viewport Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar variant="admin" />

        {/* Main Content Area - Flex column with min-h-full so footer drops down */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <main className="flex-1 p-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              this is the dashboard
            </h1>
            <p className="mt-2 text-slate-600">
              Welcome to the admin dashboard operational area.
            </p>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard