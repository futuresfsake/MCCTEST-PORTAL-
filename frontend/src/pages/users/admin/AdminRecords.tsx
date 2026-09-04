import React from 'react'
import Header from '../../../components/layout/Header'
import Sidebar from '../../../components/layout/Sidebar'
import Footer from '../../../components/layout/Footer'

const AdminRecords: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">

      {/* =========================================================
          HEADER
      ========================================================= */}

      <Header />

      {/* =========================================================
          MAIN APPLICATION AREA

          flex-1 makes this area occupy the remaining viewport
          height between the Header and Footer.
      ========================================================= */}

      <div className="relative flex min-h-0 flex-1">

        {/* =======================================================
            SIDEBAR
        ======================================================= */}

        <Sidebar variant="admin" />

        {/* =======================================================
            MAIN CONTENT
        ======================================================= */}

        <main className="min-w-0 flex-1">

          {/* =====================================================
              ADMIN INTRO
          ===================================================== */}

          <section className="flex min-h-full items-center border-b border-slate-200 bg-white">

            <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-8">

              <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">

                {/* =================================================
                    INTRODUCTION
                ================================================= */}
                
                <div>

                  <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                    Administration
                  </p>

                  <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">

                    MCCTEST

                    <span className="block text-blue-900">
                      Admin Records
                    </span>

                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                    Monitor trainees, training batches, enrollment,
                    certification, inventory, and other administrative
                    activities from one place.
                  </p>
 
                </div>
                
                
                {/* =================================================
                    WELCOME INFORMATION
                ================================================= */}

                <div className="border-l border-slate-200 pl-6 lg:ml-auto lg:max-w-sm">

                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                    Administration Portal
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    Welcome, Administrator
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Use the navigation menu to access the administrative
                    sections of the MCCTEST Portal.
                  </p>
                  

                </div>
                  
              </div>

            </div>

          </section>

        </main>
                  
      </div>

      {/* =========================================================
          FOOTER

          Because this is outside the sidebar/main row, it spans
          the entire viewport width.
      ========================================================= */}

      <Footer />

    </div>
  )
}

export default AdminRecords