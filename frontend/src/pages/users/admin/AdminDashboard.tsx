import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
  const [showNotifications, setShowNotifications] = useState(false)

  const stats = [
    {
      title: 'Total Trainees',
      value: '248',
      change: '+12 this month',
      icon: 'fa-solid fa-users',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Active Batches',
      value: '12',
      change: '3 starting soon',
      icon: 'fa-solid fa-layer-group',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Active Trainers',
      value: '18',
      change: '2 currently unavailable',
      icon: 'fa-solid fa-chalkboard-user',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Pending Applications',
      value: '23',
      change: '8 need verification',
      icon: 'fa-solid fa-file-circle-check',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ]

  const activities: Activity[] = [
    {
      id: 1,
      title: 'New trainee enrolled',
      description: 'Juan Dela Cruz was enrolled in Electrical Installation & Maintenance NC II.',
      time: '12 minutes ago',
      icon: 'fa-solid fa-user-plus',
      type: 'blue',
    },
    {
      id: 2,
      title: 'Assessment result recorded',
      description: 'Cookery NC II assessment results were updated for Batch 2026-04.',
      time: '45 minutes ago',
      icon: 'fa-solid fa-clipboard-check',
      type: 'green',
    },
    {
      id: 3,
      title: 'Certificate verification requested',
      description: 'Three historical trainee records require registrar verification.',
      time: '1 hour ago',
      icon: 'fa-solid fa-certificate',
      type: 'orange',
    },
    {
      id: 4,
      title: 'Inventory updated',
      description: 'Uniform inventory was updated after the latest batch distribution.',
      time: '2 hours ago',
      icon: 'fa-solid fa-boxes-stacked',
      type: 'purple',
    },
    {
      id: 5,
      title: 'Attendance records submitted',
      description: 'Batch 2026-03 attendance records have been submitted by the trainer.',
      time: '3 hours ago',
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
      program: 'Bread and Pastry Production NC II',
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
      schedule: 'Mon–Fri • 9:00 AM',
      status: 'Completed',
    },
  ]

  const programData = useMemo(
    () => [
      { name: 'Cookery NC II', count: 58, percentage: 23 },
      { name: 'EIM NC II', count: 46, percentage: 19 },
      { name: 'Bread & Pastry', count: 42, percentage: 17 },
      { name: 'Community-Based', count: 61, percentage: 25 },
      { name: 'Other Programs', count: 41, percentage: 16 },
    ],
    []
  )

  const activityColors = {
    blue: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  const statusStyles = {
    Ongoing: 'bg-emerald-50 text-emerald-700',
    'Starting Soon': 'bg-amber-50 text-amber-700',
    Completed: 'bg-gray-100 text-gray-600',
  }

  const quickActions = [
    {
      title: 'Add Trainee',
      description: 'Register a new trainee',
      icon: 'fa-solid fa-user-plus',
      onClick: () => navigate('/admin/trainees'),
    },
    {
      title: 'Manage Batches',
      description: 'View training batches',
      icon: 'fa-solid fa-layer-group',
      onClick: () => navigate('/admin/batches'),
    },
    {
      title: 'View Records',
      description: 'Search trainee records',
      icon: 'fa-solid fa-folder-open',
      onClick: () => navigate('/admin/records'),
    },
    {
      title: 'Generate Report',
      description: 'Create an institutional report',
      icon: 'fa-solid fa-file-chart-column',
      onClick: () => navigate('/admin/reports'),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">

      {/* =========================================================
          TOP NAVIGATION
      ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="flex h-16 items-center justify-between px-5 lg:px-8">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <i className="fa-solid fa-building-columns text-white" />
            </div>

            <div>
              <h1 className="text-sm font-bold tracking-tight text-gray-900">
                MCCTEST Portal
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Management Information System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">

            {/* Notification */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-indigo-600"
              >
                <i className="fa-regular fa-bell text-lg" />

                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Notifications
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        3 unread notifications
                      </p>
                    </div>

                    <button className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700">
                      Mark all read
                    </button>
                  </div>

                  <div className="divide-y divide-gray-100">
                    <div className="px-4 py-3 hover:bg-gray-50">
                      <p className="text-xs font-semibold text-gray-800">
                        Pending records need verification
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        8 trainee applications are waiting for review.
                      </p>
                    </div>

                    <div className="px-4 py-3 hover:bg-gray-50">
                      <p className="text-xs font-semibold text-gray-800">
                        Batch starting soon
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Bread & Pastry Production NC II is nearly full.
                      </p>
                    </div>

                    <div className="px-4 py-3 hover:bg-gray-50">
                      <p className="text-xs font-semibold text-gray-800">
                        Inventory alert
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Some uniform sizes are running low.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/admin/notifications')}
                    className="w-full border-t border-gray-100 px-4 py-3 text-center text-[11px] font-semibold text-indigo-600 hover:bg-gray-50"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-1 h-8 w-px bg-gray-200" />

            {/* Admin Profile */}
            <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-gray-50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
                <i className="fa-solid fa-user text-sm text-indigo-600" />
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-gray-800">
                  Administrator
                </p>
                <p className="text-[10px] text-gray-400">
                  System Administrator
                </p>
              </div>

              <i className="fa-solid fa-chevron-down ml-1 text-[9px] text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN LAYOUT
      ========================================================= */}
      <div className="flex">

        {/* =======================================================
            SIDEBAR
        ======================================================= */}
        <aside className="hidden min-h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-gray-200 bg-white lg:block">

          <nav className="px-3 py-5">

            <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Main
            </p>

            <button
              className="mb-1 flex w-full items-center gap-3 rounded-lg bg-indigo-50 px-3 py-2.5 text-left text-xs font-semibold text-indigo-700"
            >
              <i className="fa-solid fa-grid-2 w-4 text-center" />
              Dashboard
            </button>

            <button
              onClick={() => navigate('/admin/trainees')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-users w-4 text-center" />
              Trainees
            </button>

            <button
              onClick={() => navigate('/admin/enrollment')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-user-check w-4 text-center" />
              Enrollment
            </button>

            <button
              onClick={() => navigate('/admin/batches')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-layer-group w-4 text-center" />
              Training & Batches
            </button>

            <button
              onClick={() => navigate('/admin/attendance')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-calendar-check w-4 text-center" />
              Attendance
            </button>

            <button
              onClick={() => navigate('/admin/assessments')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-clipboard-check w-4 text-center" />
              Assessment
            </button>

            <button
              onClick={() => navigate('/admin/certification')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-certificate w-4 text-center" />
              Certification
            </button>

            <div className="my-5 border-t border-gray-100" />

            <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Management
            </p>

            <button
              onClick={() => navigate('/admin/records')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-folder-open w-4 text-center" />
              Records
            </button>

            <button
              onClick={() => navigate('/admin/payments')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-peso-sign w-4 text-center" />
              Payments
            </button>

            <button
              onClick={() => navigate('/admin/inventory')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-boxes-stacked w-4 text-center" />
              Inventory
            </button>

            <button
              onClick={() => navigate('/admin/reports')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-chart-column w-4 text-center" />
              Reports
            </button>

            <div className="my-5 border-t border-gray-100" />

            <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">
              System
            </p>

            <button
              onClick={() => navigate('/admin/users')}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-user-shield w-4 text-center" />
              User Management
            </button>

            <button
              onClick={() => navigate('/admin/settings')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-50 hover:text-indigo-600"
            >
              <i className="fa-solid fa-gear w-4 text-center" />
              Settings
            </button>
          </nav>

          {/* Sidebar footer */}
          <div className="mx-3 mt-4 rounded-xl bg-indigo-600 p-4">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <i className="fa-solid fa-shield-halved text-sm text-white" />
            </div>

            <p className="text-xs font-bold text-white">
              Administrator Access
            </p>

            <p className="mt-1 text-[10px] leading-relaxed text-indigo-100">
              You have full access to MCCTEST Portal management functions.
            </p>
          </div>
        </aside>

        {/* =======================================================
            CONTENT
        ======================================================= */}
        <main className="min-w-0 flex-1">

          <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">

            {/* Page Heading */}
            <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-medium text-gray-400">
                  <span>Home</span>
                  <i className="fa-solid fa-chevron-right text-[7px]" />
                  <span className="text-indigo-600">Dashboard</span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                  Good morning, Administrator
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Here's an overview of what's happening across MCCTEST today.
                </p>
              </div>

              <div className="flex items-center gap-2">

                <div className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-500 sm:flex">
                  <i className="fa-regular fa-calendar text-indigo-500" />
                  <span>August 30, 2026</span>
                </div>

                <button
                  onClick={() => navigate('/admin/reports')}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <i className="fa-solid fa-file-export" />
                  Reports
                </button>
              </div>
            </div>

            {/* ===================================================
                STAT CARDS
            =================================================== */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {stats.map((stat) => (
                <div
                  key={stat.title}
                  className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">

                    <div>
                      <p className="text-[11px] font-medium text-gray-500">
                        {stat.title}
                      </p>

                      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                        {stat.value}
                      </p>

                      <p className="mt-1 text-[10px] font-medium text-gray-400">
                        {stat.change}
                      </p>
                    </div>

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}
                    >
                      <i className={`${stat.icon} ${stat.iconColor} text-sm`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ===================================================
                QUICK ACTIONS
            =================================================== */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-900">
                  Quick Actions
                </h3>

                <p className="mt-0.5 text-[11px] text-gray-400">
                  Frequently used administrative functions
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {quickActions.map((action) => (
                  <button
                    key={action.title}
                    onClick={action.onClick}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-indigo-100 hover:bg-indigo-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                      <i className={`${action.icon} text-xs`} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800">
                        {action.title}
                      </p>

                      <p className="mt-0.5 truncate text-[10px] text-gray-400">
                        {action.description}
                      </p>
                    </div>

                    <i className="fa-solid fa-chevron-right ml-auto text-[8px] text-gray-300" />
                  </button>
                ))}
              </div>
            </div>

            {/* ===================================================
                CHART + PROGRAM DISTRIBUTION
            =================================================== */}
            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">

              {/* Enrollment Chart */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">

                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Enrollment Overview
                    </h3>

                    <p className="mt-0.5 text-[11px] text-gray-400">
                      Trainee enrollment activity
                    </p>
                  </div>

                  <div className="flex rounded-lg bg-gray-50 p-1">
                    {['This Week', 'This Month', 'This Year'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setActivePeriod(period)}
                        className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${
                          activePeriod === period
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fake chart using CSS bars */}
                <div className="flex h-64 items-end gap-2 border-b border-gray-100 px-2 sm:gap-4">

                  {[
                    { day: 'Mon', value: 42 },
                    { day: 'Tue', value: 58 },
                    { day: 'Wed', value: 47 },
                    { day: 'Thu', value: 72 },
                    { day: 'Fri', value: 61 },
                    { day: 'Sat', value: 84 },
                    { day: 'Sun', value: 36 },
                  ].map((item) => (
                    <div
                      key={item.day}
                      className="group flex h-full flex-1 flex-col items-center justify-end"
                    >
                      <div className="relative w-full max-w-10">
                        <div
                          className="w-full rounded-t-md bg-indigo-500/85 transition-all duration-300 group-hover:bg-indigo-600"
                          style={{
                            height: `${item.value * 2}px`,
                            maxHeight: '190px',
                          }}
                        />

                        <div className="absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-gray-900 px-1.5 py-1 text-[9px] font-semibold text-white group-hover:block">
                          {item.value}
                        </div>
                      </div>

                      <span className="mt-3 text-[9px] font-medium text-gray-400">
                        {item.day}
                      </span>
                    </div>
                  ))}

                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="text-[10px] text-gray-500">
                      New enrollments
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-400">
                    Peak: <span className="font-semibold text-gray-700">84</span> trainees
                  </p>
                </div>
              </div>

              {/* Program Distribution */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

                <div className="mb-5">
                  <h3 className="text-sm font-bold text-gray-900">
                    Trainees by Program
                  </h3>

                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Current active enrollment
                  </p>
                </div>

                <div className="mb-6 flex justify-center">
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[14px] border-indigo-500">
                    <div className="absolute inset-0 rounded-full border-[14px] border-transparent border-r-blue-400 border-b-purple-400 border-l-amber-400 rotate-45" />

                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">248</p>
                      <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                        Total
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {programData.map((program, index) => {
                    const dotColors = [
                      'bg-indigo-500',
                      'bg-blue-400',
                      'bg-purple-400',
                      'bg-amber-400',
                      'bg-gray-300',
                    ]

                    return (
                      <div key={program.name}>
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${dotColors[index]}`}
                            />

                            <span className="truncate text-[10px] font-medium text-gray-600">
                              {program.name}
                            </span>
                          </div>

                          <span className="text-[10px] font-bold text-gray-800">
                            {program.count}
                          </span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${dotColors[index]}`}
                            style={{ width: `${program.percentage * 4}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

              </div>
            </div>

            {/* ===================================================
                BATCHES + ACTIVITIES
            =================================================== */}
            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-5">

              {/* Active Batches */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm xl:col-span-3">

                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Training Batches
                    </h3>

                    <p className="mt-0.5 text-[11px] text-gray-400">
                      Current and upcoming batches
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/admin/batches')}
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View all
                    <i className="fa-solid fa-arrow-right ml-1 text-[8px]" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70">
                        <th className="px-5 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          Batch / Program
                        </th>

                        <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          Trainer
                        </th>

                        <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          Trainees
                        </th>

                        <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          Schedule
                        </th>

                        <th className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {batches.map((batch) => (
                        <tr
                          key={batch.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-5 py-3.5">
                            <div>
                              <p className="text-[10px] font-semibold text-indigo-600">
                                {batch.id}
                              </p>

                              <p className="mt-0.5 max-w-[210px] text-xs font-semibold text-gray-800">
                                {batch.program}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-[10px] text-gray-600">
                            {batch.trainer}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-gray-700">
                                {batch.trainees}/{batch.capacity}
                              </span>

                              <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-gray-100 sm:block">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{
                                    width: `${
                                      (batch.trainees / batch.capacity) * 100
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-[10px] text-gray-500">
                            {batch.schedule}
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${statusStyles[batch.status]}`}
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

              {/* Recent Activity */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm xl:col-span-2">

                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Recent Activity
                    </h3>

                    <p className="mt-0.5 text-[11px] text-gray-400">
                      Latest system activities
                    </p>
                  </div>

                  <button className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700">
                    View history
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-3 px-5 py-3.5 transition hover:bg-gray-50"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activityColors[activity.type]}`}
                      >
                        <i className={`${activity.icon} text-[11px]`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] font-semibold text-gray-800">
                            {activity.title}
                          </p>

                          <span className="shrink-0 text-[9px] text-gray-400">
                            {activity.time}
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ===================================================
                STATUS OVERVIEW
            =================================================== */}
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

              {/* Attendance */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">
                      Attendance
                    </p>

                    <p className="mt-1 text-lg font-bold text-gray-900">
                      91.4%
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                    <i className="fa-solid fa-calendar-check text-xs text-emerald-600" />
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full w-[91.4%] rounded-full bg-emerald-500" />
                </div>

                <p className="mt-2 text-[10px] text-gray-400">
                  Overall attendance rate
                </p>
              </div>

              {/* Assessment */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">
                      Assessments
                    </p>

                    <p className="mt-1 text-lg font-bold text-gray-900">
                      86%
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <i className="fa-solid fa-clipboard-check text-xs text-blue-600" />
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full w-[86%] rounded-full bg-blue-500" />
                </div>

                <p className="mt-2 text-[10px] text-gray-400">
                  Successful assessment rate
                </p>
              </div>

              {/* Certification */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">
                      Certification
                    </p>

                    <p className="mt-1 text-lg font-bold text-gray-900">
                      34
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                    <i className="fa-solid fa-certificate text-xs text-purple-600" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-purple-600">
                    28 released
                  </span>

                  <span className="text-[10px] text-gray-300">•</span>

                  <span className="text-[10px] text-gray-500">
                    6 pending
                  </span>
                </div>

                <p className="mt-2 text-[10px] text-gray-400">
                  Certificates processed this month
                </p>
              </div>

              {/* Inventory */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">
                      Inventory
                    </p>

                    <p className="mt-1 text-lg font-bold text-gray-900">
                      7
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                    <i className="fa-solid fa-boxes-stacked text-xs text-amber-600" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
                    Low Stock
                  </span>

                  <span className="text-[10px] text-gray-400">
                    items need attention
                  </span>
                </div>

                <p className="mt-2 text-[10px] text-gray-400">
                  Uniforms and training equipment
                </p>
              </div>
            </div>

            {/* ===================================================
                ADMINISTRATIVE ALERTS
            =================================================== */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                    <i className="fa-solid fa-circle-info text-xs text-indigo-600" />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-indigo-900">
                      Administrative Attention Required
                    </h3>

                    <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-indigo-700">
                      There are currently 23 pending applications, 6
                      certificates awaiting processing, and 7 inventory items
                      requiring attention.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => navigate('/admin/enrollment')}
                    className="rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-100"
                  >
                    Review Applications
                  </button>

                  <button
                    onClick={() => navigate('/admin/records')}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Open Records
                  </button>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="mt-7 flex flex-col items-center justify-between gap-2 border-t border-gray-200 pt-5 text-[9px] text-gray-400 sm:flex-row">
              <p>
                MCCTEST Portal • Management Information System
              </p>

              <p>
                Administrative Dashboard • v1.0
              </p>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard