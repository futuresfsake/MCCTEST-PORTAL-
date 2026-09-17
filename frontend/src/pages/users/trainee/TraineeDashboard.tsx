import React from 'react'
import Header from '../../../components/layout/Header'
import Sidebar from '../../../components/layout/Sidebar'
import Footer from '../../../components/layout/Footer'

const TraineeDashboard: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />

      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="trainee" />

        <main className="min-w-0 flex-1">
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div>
                  <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                    Trainee
                  </p>

                  <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 md:text-5xl">
                    MCCTEST
                    <span className="block text-blue-900">
                      Trainee Dashboard
                    </span>
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                    View your training progress, schedule, and records.
                  </p>
                </div>

                <div className="border-l border-slate-200 pl-6 lg:ml-auto lg:max-w-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                    Trainee Portal
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    MCCTP-26-002
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Welcome to your MCCTEST Trainee Portal.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-50">
            <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
              <div className="border border-slate-200 bg-white p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-yellow-600">
                  Trainee Dashboard
                </p>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">
                  Your training overview
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  Your training details, attendance, and assessment records will appear here.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  )
}

export default TraineeDashboard