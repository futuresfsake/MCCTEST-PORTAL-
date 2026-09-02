import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/layout/Header'
import Sidebar from '../../../components/layout/Sidebar'

type Activity = {
  id: number
  title: string
  description: string
  time: string
  icon: string
  type: 'blue' | 'green' | 'orange' | 'purple'
}

type Batch = {
  id: string
  program: string
  trainer: string
  trainees: number
  capacity: number
  schedule: string
  status: 'Ongoing' | 'Starting Soon' | 'Completed'
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [activePeriod, setActivePeriod] = useState('This Month')

  /* =============================================================
     DASHBOARD DATA
  ============================================================= */

  const stats = [
    {
      title: 'Total Trainees',
      value: '248',
      change: '+12 this month',
      icon: 'fa-solid fa-users',
    },
    {
      title: 'Active Batches',
      value: '12',
      change: '3 starting soon',
      icon: 'fa-solid fa-layer-group',
    },
    {
      title: 'Active Trainers',
      value: '18',
      change: '2 currently unavailable',
      icon: 'fa-solid fa-chalkboard-user',
    },
    {
      title: 'Pending Applications',
      value: '23',
      change: '8 need verification',
      icon: 'fa-solid fa-file-circle-check',
    },
  ]

  const activities: Activity[] = [
    {
      id: 1,
      title: 'New trainee enrolled',
      description:
        'Juan Dela Cruz was enrolled in Electrical Installation & Maintenance NC II.',
      time: '12 min ago',
      icon: 'fa-solid fa-user-plus',
      type: 'blue',
    },
    {
      id: 2,
      title: 'Assessment result recorded',
      description:
        'Assessment results were updated for Batch B-2026-04.',
      time: '45 min ago',
      icon: 'fa-solid fa-clipboard-check',
      type: 'green',
    },
    {
      id: 3,
      title: 'Certificate verification requested',
      description:
        'Three trainee records require verification before certificate release.',
      time: '1 hr ago',
      icon: 'fa-solid fa-certificate',
      type: 'orange',
    },
    {
      id: 4,
      title: 'Inventory updated',
      description:
        'Uniform inventory was updated after the latest distribution.',
      time: '2 hrs ago',
      icon: 'fa-solid fa-boxes-stacked',
      type: 'purple',
    },
    {
      id: 5,
      title: 'Attendance submitted',
      description:
        'Batch B-2026-03 attendance records were submitted by the trainer.',
      time: '3 hrs ago',
      icon: 'fa-solid fa-calendar-check',
      type: 'blue',
    },
  ]

  const batches: Batch[] = [
    {
      id: 'B-2026-04',
      program: 'Cookery NC II',
      trainer: 'Maria Santos',
      trainees: 18,
      capacity: 20,
      schedule: 'Mon–Fri • 8:00 AM',
      status: 'Ongoing',
    },
    {
      id: 'B-2026-05',
      program: 'Electrical Installation & Maintenance NC II',
      trainer: 'Ramon Garcia',
      trainees: 15,
      capacity: 20,
      schedule: 'Mon–Fri • 1:00 PM',
      status: 'Ongoing',
    },
    {
      id: 'B-2026-06',
      program: 'Bread & Pastry Production NC II',
      trainer: 'Ana Reyes',
      trainees: 20,
      capacity: 20,
      schedule: 'Tue–Sat • 8:00 AM',
      status: 'Starting Soon',
    },
    {
      id: 'B-2026-02',
      program: 'Computer Systems Servicing NC II',
      trainer: 'John Villanueva',
      trainees: 17,
      capacity: 20,
      schedule: 'Mon–Fri • 2:00 PM',
      status: 'Completed',
    },
  ]

  const enrollmentData = useMemo(
    () => ({
      'This Week': [42, 58, 47, 72, 61, 84, 36],
      'This Month': [35, 51, 68, 54, 78, 65, 82],
      'This Year': [48, 62, 55, 73, 69, 87, 76],
    }),
    [],
  )

  const programs = [
    {
      name: 'Community-Based Programs',
      trainees: 61,
      percentage: 25,
    },
    {
      name: 'Cookery NC II',
      trainees: 58,
      percentage: 23,
    },
    {
      name: 'Electrical Installation & Maintenance',
      trainees: 46,
      percentage: 19,
    },
    {
      name: 'Bread & Pastry Production',
      trainees: 42,
      percentage: 17,
    },
    {
      name: 'Other Programs',
      trainees: 41,
      percentage: 16,
    },
  ]

  /* =============================================================
     HELPERS
  ============================================================= */

  const activityIconClass = (type: Activity['type']) => {
    switch (type) {
      case 'green':
        return 'bg-green-50 text-green-700'
      case 'orange':
        return 'bg-yellow-50 text-yellow-700'
      case 'purple':
        return 'bg-slate-100 text-slate-700'
      default:
        return 'bg-blue-50 text-blue-900'
    }
  }

  const statusClass = (status: Batch['status']) => {
    switch (status) {
      case 'Ongoing':
        return 'text-green-700'
      case 'Starting Soon':
        return 'text-yellow-700'
      case 'Completed':
        return 'text-slate-500'
      default:
        return 'text-slate-500'
    }
  }

  const currentEnrollment =
    enrollmentData[activePeriod as keyof typeof enrollmentData]

  /* =============================================================
     RENDER
  ============================================================= */

  return (
    <div className="h-screen overflow-hidden bg-white text-slate-900">

      {/* =========================================================
          GLOBAL HEADER
      ========================================================= */}

      <Header />

      {/* =========================================================
          FIXED VIEWPORT AREA
          
          Sidebar stays in place.
          Only the main content scrolls.
      ========================================================= */}

      <div className="flex h-[calc(100vh-5rem)] overflow-hidden">

        {/* =======================================================
            SIDEBAR

            This does NOT scroll.
        ======================================================= */}

        <Sidebar variant="admin" />

        {/* =======================================================
            MAIN CONTENT

            This is the ONLY scrolling area.
        ======================================================= */}

        <main className="min-w-0 flex-1 overflow-y-auto">

          {/* =====================================================
              ADMIN INTRO
          ===================================================== */}

          <section className="border-b border-slate-200 bg-white">

            <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">

              <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">

                <div>

                  <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                    Administration
                  </p>

                  <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 md:text-5xl">
                    MCCTEST
                    <span className="block text-blue-900">
                      Admin Dashboard
                    </span>
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                    Monitor trainees, training batches, enrollment,
                    certification, inventory, and other administrative
                    activities from one place.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-6">

                    <span className="border-l-4 border-yellow-400 pl-4 text-sm font-semibold text-slate-700">
                      Training
                    </span>

                    <span className="border-l-4 border-yellow-400 pl-4 text-sm font-semibold text-slate-700">
                      Records
                    </span>

                    <span className="border-l-4 border-yellow-400 pl-4 text-sm font-semibold text-slate-700">
                      Certification
                    </span>

                  </div>

                </div>

                <div className="border-l border-slate-200 pl-6 lg:ml-auto lg:max-w-sm">

                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                    Today
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    August 31, 2026
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Welcome back, Administrator. Here is the current
                    operational overview of MCCTEST.
                  </p>

                </div>

              </div>

            </div>

          </section>

          {/* =====================================================
              DASHBOARD BODY
          ===================================================== */}

          <section className="border-b border-slate-200 bg-slate-50">

            <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">

              {/* =================================================
                  KEY STATISTICS
              ================================================= */}

              <div className="mb-16">

                <div className="mb-8">

                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                    Overview
                  </p>

                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    What's happening today?
                  </h2>

                </div>

                <div className="grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">

                  {stats.map((stat) => (

                    <div
                      key={stat.title}
                      className="bg-white p-6 transition hover:bg-slate-50"
                    >

                      <div className="flex items-start justify-between">

                        <div>

                          <p className="text-sm font-medium text-slate-500">
                            {stat.title}
                          </p>

                          <p className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
                            {stat.value}
                          </p>

                          <p className="mt-3 text-xs font-medium text-slate-400">
                            {stat.change}
                          </p>

                        </div>

                        <i
                          className={`${stat.icon} text-lg text-blue-900`}
                        />

                      </div>

                    </div>

                  ))}

                </div>

              </div>

              {/* =================================================
                  QUICK ACTIONS
              ================================================= */}

              <div className="mb-16">

                <div className="mb-8">

                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                    Administration
                  </p>

                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    Quick access
                  </h2>

                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">

                  <button
                    onClick={() => navigate('/admin/trainees')}
                    className="group border border-slate-200 bg-white p-6 text-left transition hover:border-blue-900"
                  >

                    <i className="fa-solid fa-users text-lg text-blue-900" />

                    <h3 className="mt-5 text-base font-semibold text-slate-900">
                      Manage Trainees
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      View and manage trainee records and profiles.
                    </p>

                    <div className="mt-5 text-xs font-semibold text-blue-900">
                      Open section
                      <i className="fa-solid fa-arrow-right ml-2 text-[9px] transition group-hover:translate-x-1" />
                    </div>

                  </button>

                  <button
                    onClick={() => navigate('/admin/enrollment')}
                    className="group border border-slate-200 bg-white p-6 text-left transition hover:border-blue-900"
                  >

                    <i className="fa-solid fa-user-check text-lg text-blue-900" />

                    <h3 className="mt-5 text-base font-semibold text-slate-900">
                      Enrollment
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Review applications, requirements, and enrollment records.
                    </p>

                    <div className="mt-5 text-xs font-semibold text-blue-900">
                      Open section
                      <i className="fa-solid fa-arrow-right ml-2 text-[9px] transition group-hover:translate-x-1" />
                    </div>

                  </button>

                  <button
                    onClick={() => navigate('/admin/batches')}
                    className="group border border-slate-200 bg-white p-6 text-left transition hover:border-blue-900"
                  >

                    <i className="fa-solid fa-layer-group text-lg text-blue-900" />

                    <h3 className="mt-5 text-base font-semibold text-slate-900">
                      Training & Batches
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Monitor active batches, schedules, trainers, and capacity.
                    </p>

                    <div className="mt-5 text-xs font-semibold text-blue-900">
                      Open section
                      <i className="fa-solid fa-arrow-right ml-2 text-[9px] transition group-hover:translate-x-1" />
                    </div>

                  </button>

                  <button
                    onClick={() => navigate('/admin/reports')}
                    className="group border border-slate-200 bg-white p-6 text-left transition hover:border-blue-900"
                  >

                    <i className="fa-solid fa-chart-column text-lg text-blue-900" />

                    <h3 className="mt-5 text-base font-semibold text-slate-900">
                      Reports
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Access institutional and TESDA-related reports.
                    </p>

                    <div className="mt-5 text-xs font-semibold text-blue-900">
                      Open section
                      <i className="fa-solid fa-arrow-right ml-2 text-[9px] transition group-hover:translate-x-1" />
                    </div>

                  </button>

                </div>

              </div>

              {/* =================================================
                  ENROLLMENT + PROGRAMS
              ================================================= */}

              <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.3fr_0.7fr]">

                <div>

                  <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

                    <div>

                      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                        Enrollment
                      </p>

                      <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                        Enrollment activity
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        Overview of recent trainee enrollment activity.
                      </p>

                    </div>

                    <div className="flex gap-4 border-b border-slate-200">

                      {['This Week', 'This Month', 'This Year'].map(
                        (period) => (

                          <button
                            key={period}
                            onClick={() => setActivePeriod(period)}
                            className={`border-b-2 px-1 pb-3 text-xs font-semibold transition ${
                              activePeriod === period
                                ? 'border-blue-900 text-blue-900'
                                : 'border-transparent text-slate-400 hover:text-blue-900'
                            }`}
                          >
                            {period}
                          </button>

                        ),
                      )}

                    </div>

                  </div>

                  <div className="border border-slate-200 bg-white p-6">

                    <div className="flex h-64 items-end gap-3 border-b border-slate-200 sm:gap-6">

                      {currentEnrollment.map((value, index) => {

                        const days = [
                          'Mon',
                          'Tue',
                          'Wed',
                          'Thu',
                          'Fri',
                          'Sat',
                          'Sun',
                        ]

                        return (
                          <div
                            key={days[index]}
                            className="group flex h-full flex-1 flex-col items-center justify-end"
                          >

                            <div className="relative flex w-full justify-center">

                              <span className="absolute -top-6 text-[10px] font-semibold text-blue-900 opacity-0 transition group-hover:opacity-100">
                                {value}
                              </span>

                              <div
                                className="w-full max-w-10 bg-blue-900 transition group-hover:bg-blue-950"
                                style={{
                                  height: `${Math.max(value * 2, 12)}px`,
                                }}
                              />

                            </div>

                            <span className="mt-3 text-[10px] font-medium text-slate-400">
                              {days[index]}
                            </span>

                          </div>
                        )
                      })}

                    </div>

                    <div className="mt-5 flex items-center justify-between">

                      <div className="flex items-center gap-2">

                        <span className="h-2 w-2 bg-blue-900" />

                        <span className="text-xs text-slate-500">
                          New enrollments
                        </span>

                      </div>

                      <span className="text-xs text-slate-400">
                        {activePeriod}
                      </span>

                    </div>

                  </div>

                </div>

                <div>

                  <div className="mb-8">

                    <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                      Programs
                    </p>

                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                      Trainee distribution
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Current active trainees by program.
                    </p>

                  </div>

                  <div className="border border-slate-200 bg-white p-6">

                    <div className="mb-8 flex items-end gap-4">

                      <span className="text-5xl font-bold tracking-tight text-slate-950">
                        248
                      </span>

                      <span className="pb-2 text-sm text-slate-500">
                        active trainees
                      </span>

                    </div>

                    <div className="space-y-6">

                      {programs.map((program) => (

                        <div key={program.name}>

                          <div className="mb-2 flex justify-between gap-3">

                            <span className="text-xs font-medium text-slate-600">
                              {program.name}
                            </span>

                            <span className="text-xs font-semibold text-slate-900">
                              {program.trainees}
                            </span>

                          </div>

                          <div className="h-1 bg-slate-200">

                            <div
                              className="h-1 bg-blue-900"
                              style={{
                                width: `${program.percentage * 4}%`,
                              }}
                            />

                          </div>

                        </div>

                      ))}

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </section>

          {/* =====================================================
              BATCHES + ACTIVITY
          ===================================================== */}

          <section className="border-b border-slate-200 bg-white">

            <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

              <div className="mb-12">

                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                  Operations
                </p>

                <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  Training operations
                </h2>

                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Keep track of active batches, schedules, trainee capacity,
                  and the latest administrative activity.
                </p>

              </div>

              <div className="grid grid-cols-1 gap-12 xl:grid-cols-[1.35fr_0.65fr]">

                {/* =================================================
                    BATCH TABLE
                ================================================= */}

                <div>

                  <div className="mb-6 flex items-end justify-between">

                    <div>

                      <h3 className="text-xl font-bold text-slate-900">
                        Current batches
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Active and recently completed training batches.
                      </p>

                    </div>

                    <button
                      onClick={() => navigate('/admin/batches')}
                      className="hidden text-xs font-semibold text-blue-900 sm:block"
                    >
                      View all
                      <i className="fa-solid fa-arrow-right ml-2 text-[9px]" />
                    </button>

                  </div>

                  <div className="overflow-x-auto border-y border-slate-200">

                    <table className="w-full min-w-[700px]">

                      <thead>

                        <tr className="border-b border-slate-200">

                          <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Batch
                          </th>

                          <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Program
                          </th>

                          <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Trainer
                          </th>

                          <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Trainees
                          </th>

                          <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Status
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {batches.map((batch) => (

                          <tr
                            key={batch.id}
                            className="border-b border-slate-100 transition hover:bg-slate-50"
                          >

                            <td className="px-4 py-5">

                              <span className="text-xs font-semibold text-blue-900">
                                {batch.id}
                              </span>

                            </td>

                            <td className="px-4 py-5">

                              <p className="max-w-[230px] text-xs font-semibold text-slate-800">
                                {batch.program}
                              </p>

                              <p className="mt-1 text-[10px] text-slate-400">
                                {batch.schedule}
                              </p>

                            </td>

                            <td className="px-4 py-5 text-xs text-slate-600">
                              {batch.trainer}
                            </td>

                            <td className="px-4 py-5">

                              <span className="text-xs font-semibold text-slate-800">
                                {batch.trainees}
                              </span>

                              <span className="text-xs text-slate-400">
                                {' '}
                                / {batch.capacity}
                              </span>

                            </td>

                            <td className="px-4 py-5">

                              <span
                                className={`text-xs font-semibold ${statusClass(
                                  batch.status,
                                )}`}
                              >
                                {batch.status}
                              </span>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                </div>

                {/* =================================================
                    RECENT ACTIVITY
                ================================================= */}

                <div>

                  <div className="mb-6">

                    <h3 className="text-xl font-bold text-slate-900">
                      Recent activity
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Latest updates across the portal.
                    </p>

                  </div>

                  <div>

                    {activities.map((activity) => (

                      <div
                        key={activity.id}
                        className="flex gap-4 border-b border-slate-200 py-5 first:border-t"
                      >

                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center ${activityIconClass(
                            activity.type,
                          )}`}
                        >
                          <i className={`${activity.icon} text-xs`} />
                        </div>

                        <div className="min-w-0">

                          <p className="text-xs font-semibold text-slate-900">
                            {activity.title}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {activity.description}
                          </p>

                          <p className="mt-2 text-[10px] font-medium text-slate-400">
                            {activity.time}
                          </p>

                        </div>

                      </div>

                    ))}

                  </div>

                </div>

              </div>

            </div>

          </section>

          {/* =====================================================
              SYSTEM STATUS
          ===================================================== */}

          <section className="border-b border-slate-200 bg-slate-50">

            <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

              <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">

                <div>

                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                    System status
                  </p>

                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    A quick look at operations.
                  </h2>

                  <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
                    These indicators provide a quick overview of attendance,
                    assessment, certification, and inventory activities.
                  </p>

                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">

                  <div className="border-l-4 border-blue-900 bg-white p-6">

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Overall attendance
                    </p>

                    <p className="mt-3 text-3xl font-bold text-slate-950">
                      91.4%
                    </p>

                    <div className="mt-4 h-1 bg-slate-200">
                      <div className="h-1 w-[91.4%] bg-blue-900" />
                    </div>

                  </div>

                  <div className="border-l-4 border-yellow-400 bg-white p-6">

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Assessment success
                    </p>

                    <p className="mt-3 text-3xl font-bold text-slate-950">
                      86%
                    </p>

                    <div className="mt-4 h-1 bg-slate-200">
                      <div className="h-1 w-[86%] bg-blue-900" />
                    </div>

                  </div>

                  <div className="border-l-4 border-blue-900 bg-white p-6">

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Certificates
                    </p>

                    <p className="mt-3 text-3xl font-bold text-slate-950">
                      34
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      28 released · 6 pending
                    </p>

                  </div>

                  <div className="border-l-4 border-yellow-400 bg-white p-6">

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Inventory alerts
                    </p>

                    <p className="mt-3 text-3xl font-bold text-slate-950">
                      7
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Items require attention
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </section>

          {/* =====================================================
              ADMINISTRATIVE ALERT
          ===================================================== */}

          <section className="bg-white">

            <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

              <div className="border border-slate-200 bg-slate-50 p-8 md:p-10">

                <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto] md:items-center">

                  <div>

                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                      Attention required
                    </p>

                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                      Some administrative tasks need your attention.
                    </h2>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                      There are currently 23 pending applications, 6
                      certificates awaiting processing, and 7 inventory
                      items requiring attention.
                    </p>

                  </div>

                  <div className="flex flex-wrap gap-3">

                    <button
                      onClick={() => navigate('/admin/enrollment')}
                      className="border border-blue-900 bg-white px-5 py-3 text-xs font-semibold text-blue-900 transition hover:bg-blue-900 hover:text-white"
                    >
                      Review Applications
                    </button>

                    <button
                      onClick={() => navigate('/admin/records')}
                      className="bg-blue-900 px-5 py-3 text-xs font-semibold text-white transition hover:bg-blue-950"
                    >
                      Open Records
                    </button>

                  </div>

                </div>

              </div>

            </div>

          </section>

          {/* =====================================================
              FOOTER
          ===================================================== */}

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

        </main>

      </div>

    </div>
  )
}

export default AdminDashboard