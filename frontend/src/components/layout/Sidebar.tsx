import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import mcctestLogo from '../../assets/mcctest-logo.png'

export type SidebarVariant =
  | 'admin'
  | 'trainer'
  | 'trainee'
  | 'encoder'
  | 'registrar'

type SidebarItem = {
  label: string
  path: string
  icon: string
}

type SidebarSection = {
  title: string
  items: SidebarItem[]
}

type SidebarProps = {
  variant: SidebarVariant
}

const sidebarConfig: Record<
  SidebarVariant,
  {
    role: string
    description: string
    icon: string
    sections: SidebarSection[]
  }
> = {
  /* ============================================================
     ADMIN
  ============================================================ */
  admin: {
    role: 'Administrator',
    description: 'Full system management access.',
    icon: 'fa-solid fa-shield-halved',

    sections: [
      {
        title: 'Main',
        items: [
          {
            label: 'Dashboard',
            path: '/admin/AdminDashboard',
            icon: 'fa-solid fa-gauge-high',
          },
        ],
      },

      {
        title: 'Management',
        items: [
          {
            label: 'Trainees',
            path: '/admin/trainees',
            icon: 'fa-solid fa-users',
          },
          {
            label: 'Enrollment',
            path: '/admin/enrollment',
            icon: 'fa-solid fa-user-check',
          },
          {
            label: 'Training & Batches',
            path: '/admin/batches',
            icon: 'fa-solid fa-layer-group',
          },
          {
            label: 'Records',
            path: '/admin/records',
            icon: 'fa-solid fa-folder-open',
          },
          {
            label: 'Payments',
            path: '/admin/payments',
            icon: 'fa-solid fa-peso-sign',
          },
          {
            label: 'Inventory',
            path: '/admin/inventory',
            icon: 'fa-solid fa-boxes-stacked',
          },
          {
            label: 'Reports',
            path: '/admin/reports',
            icon: 'fa-solid fa-chart-column',
          },
        ],
      },

      {
        title: 'System',
        items: [
          {
            label: 'User Management',
            path: '/admin/users',
            icon: 'fa-solid fa-user-shield',
          },
          {
            label: 'Settings',
            path: '/admin/settings',
            icon: 'fa-solid fa-gear',
          },
        ],
      },
    ],
  },

  /* ============================================================
     TRAINER
  ============================================================ */
  trainer: {
    role: 'Trainer',
    description: 'Manage classes, attendance and trainee progress.',
    icon: 'fa-solid fa-chalkboard-user',

    sections: [
      {
        title: 'Main',
        items: [
          {
            label: 'Dashboard',
            path: '/trainer/dashboard',
            icon: 'fa-solid fa-gauge-high',
          },
        ],
      },

      {
        title: 'Training',
        items: [
          {
            label: 'My Batches',
            path: '/trainer/batches',
            icon: 'fa-solid fa-layer-group',
          },
          {
            label: 'Class Records',
            path: '/trainer/classes',
            icon: 'fa-solid fa-users-rectangle',
          },
          {
            label: 'Attendance',
            path: '/trainer/attendance',
            icon: 'fa-solid fa-calendar-check',
          },
          {
            label: 'Progress',
            path: '/trainer/progress',
            icon: 'fa-solid fa-chart-line',
          },
          {
            label: 'Grades & Competencies',
            path: '/trainer/grades',
            icon: 'fa-solid fa-clipboard-check',
          },
        ],
      },

      {
        title: 'Records',
        items: [
          {
            label: 'Trainee Records',
            path: '/trainer/records',
            icon: 'fa-solid fa-folder-open',
          },
          {
            label: 'Graduating List',
            path: '/trainer/graduating',
            icon: 'fa-solid fa-graduation-cap',
          },
        ],
      },
    ],
  },

  /* ============================================================
     TRAINEE
  ============================================================ */
  trainee: {
    role: 'Trainee',
    description: 'View your training, grades and certification.',
    icon: 'fa-solid fa-user-graduate',

    sections: [
      {
        title: 'Main',
        items: [
          {
            label: 'Dashboard',
            path: '/trainee/dashboard',
            icon: 'fa-solid fa-gauge-high',
          },
        ],
      },

      {
        title: 'My Training',
        items: [
          {
            label: 'My Enrollment',
            path: '/trainee/enrollment',
            icon: 'fa-solid fa-file-signature',
          },
          {
            label: 'My Training',
            path: '/trainee/training',
            icon: 'fa-solid fa-book-open',
          },
          {
            label: 'Attendance',
            path: '/trainee/attendance',
            icon: 'fa-solid fa-calendar-check',
          },
          {
            label: 'Grades & Progress',
            path: '/trainee/grades',
            icon: 'fa-solid fa-chart-line',
          },
        ],
      },

      {
        title: 'Certification',
        items: [
          {
            label: 'Clearance',
            path: '/trainee/clearance',
            icon: 'fa-solid fa-clipboard-check',
          },
          {
            label: 'Certificates',
            path: '/trainee/certificates',
            icon: 'fa-solid fa-certificate',
          },
          {
            label: 'Guidebook',
            path: '/trainee/guidebook',
            icon: 'fa-solid fa-book',
          },
        ],
      },
    ],
  },

  /* ============================================================
     ENCODER
  ============================================================ */
  encoder: {
    role: 'Encoder',
    description: 'Process clearances and certificate issuance.',
    icon: 'fa-solid fa-file-signature',

    sections: [
      {
        title: 'Main',
        items: [
          {
            label: 'Dashboard',
            path: '/encoder/dashboard',
            icon: 'fa-solid fa-gauge-high',
          },
        ],
      },

      {
        title: 'Certification',
        items: [
          {
            label: 'Clearance Verification',
            path: '/encoder/clearance',
            icon: 'fa-solid fa-clipboard-check',
          },
          {
            label: 'Certificate Issuance',
            path: '/encoder/certificates',
            icon: 'fa-solid fa-certificate',
          },
          {
            label: 'Distribution Logs',
            path: '/encoder/distribution',
            icon: 'fa-solid fa-box-open',
          },
        ],
      },

      {
        title: 'Records',
        items: [
          {
            label: 'Trainee Records',
            path: '/encoder/records',
            icon: 'fa-solid fa-folder-open',
          },
        ],
      },
    ],
  },

  /* ============================================================
     REGISTRAR
  ============================================================ */
  registrar: {
    role: 'Registrar',
    description: 'Manage enrollment, records and registration.',
    icon: 'fa-solid fa-building-columns',

    sections: [
      {
        title: 'Main',
        items: [
          {
            label: 'Dashboard',
            path: '/registrar/dashboard',
            icon: 'fa-solid fa-gauge-high',
          },
        ],
      },

      {
        title: 'Registration',
        items: [
          {
            label: 'Applicants',
            path: '/registrar/applicants',
            icon: 'fa-solid fa-user-plus',
          },
          {
            label: 'Enrollment',
            path: '/registrar/enrollment',
            icon: 'fa-solid fa-user-check',
          },
          {
            label: 'Re-enrollment',
            path: '/registrar/re-enrollment',
            icon: 'fa-solid fa-rotate',
          },
          {
            label: 'Batches & Schedules',
            path: '/registrar/batches',
            icon: 'fa-solid fa-layer-group',
          },
        ],
      },

      {
        title: 'Records',
        items: [
          {
            label: 'Trainee Records',
            path: '/registrar/records',
            icon: 'fa-solid fa-folder-open',
          },
          {
            label: 'Clearance',
            path: '/registrar/clearance',
            icon: 'fa-solid fa-clipboard-check',
          },
          {
            label: 'Inventory',
            path: '/registrar/inventory',
            icon: 'fa-solid fa-boxes-stacked',
          },
        ],
      },
    ],
  },
}

/* ==============================================================
   SHARED SIDEBAR CONTENT
   ============================================================== */

type SidebarContentProps = {
  config: (typeof sidebarConfig)[SidebarVariant]
  onNavigate?: () => void
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  config,
  onNavigate,
}) => {
  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* ========================================================
          NAVIGATION
      ======================================================== */}

      <nav 
        className="min-h-0 flex-1 overflow-y-auto px-4 py-7"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          nav::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {config.sections.map((section, sectionIndex) => (
          <div
            key={section.title}
            className={sectionIndex > 0 ? 'mt-8' : ''}
          >

            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {section.title}
            </p>

            <div className="space-y-1">

              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [
                      'group flex items-center gap-2.5 border-l-2 px-2 py-1.5 text-sm font-medium transition',
                      isActive
                        ? 'border-blue-900 bg-slate-50 text-blue-900'
                        : 'border-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-blue-900',
                    ].join(' ')
                  }
                >

                  <i
                    className={`${item.icon} w-4 text-center text-xs`}
                  />

                  <span>{item.label}</span>

                </NavLink>
              ))}

            </div>
          </div>
        ))}

      </nav>

    </div>
  )
}

/* ==============================================================
   SIDEBAR
   ============================================================== */

const Sidebar: React.FC<SidebarProps> = ({ variant }) => {
  const config = sidebarConfig[variant]

  const [isMobileOpen, setIsMobileOpen] = useState(false)

  /* ============================================================
     PREVENT BODY SCROLL WHEN MOBILE MENU IS OPEN
  ============================================================ */

  useEffect(() => {
    if (!isMobileOpen) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  /* ============================================================
     CLOSE MOBILE MENU WHEN WINDOW BECOMES DESKTOP
  ============================================================ */

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <>
      {/* ========================================================
          DESKTOP SIDEBAR
          Visible on lg screens and above.
      ======================================================== */}

      <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-64 shrink-0 self-start border-r border-slate-200 bg-white lg:flex lg:flex-col">

        <SidebarContent config={config} />

      </aside>

      {/* ========================================================
          MOBILE MENU BUTTON
          Visible below lg breakpoint.
      ======================================================== */}

      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isMobileOpen}
        className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-md transition hover:shadow-lg focus:outline-none lg:hidden"
      >
        <div className="flex flex-col gap-1">
          <div className="h-0.5 w-6 bg-black"></div>
          <div className="h-0.5 w-6 bg-black"></div>
          <div className="h-0.5 w-6 bg-black"></div>
        </div>
      </button>

      {/* ========================================================
          MOBILE OVERLAY
      ======================================================== */}

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* ========================================================
          MOBILE SIDEBAR
      ======================================================== */}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(20rem,85vw)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden',
          isMobileOpen
            ? 'translate-x-0'
            : '-translate-x-full',
        ].join(' ')}
      >

        {/* ======================================================
            MOBILE SIDEBAR HEADER
        ====================================================== */}

        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">

          <div className="flex items-center gap-3">

            <img src={mcctestLogo} alt="MCCTEST Logo" className="h-8 w-8" />

            <div>
              <p className="text-xs font-bold text-slate-900">
                MCCTEST
              </p>

              <p className="text-[10px] text-slate-400">
                {config.role}
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>

        </div>

        {/* ======================================================
            MOBILE SIDEBAR CONTENT
        ====================================================== */}

        <div className="min-h-0 flex-1">

          <SidebarContent
            config={config}
            onNavigate={() => setIsMobileOpen(false)}
          />

        </div>

      </aside>
    </>
  )
}

export default Sidebar
