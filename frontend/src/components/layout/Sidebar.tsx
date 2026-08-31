import React from 'react'
import { NavLink } from 'react-router-dom'

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
            path: '/admin/dashboard',
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

const Sidebar: React.FC<SidebarProps> = ({ variant }) => {
  const config = sidebarConfig[variant]

  return (
    <aside className="hidden h-full w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">

      {/* ==========================================================
          NAVIGATION
      ========================================================== */}

      <nav className="flex-1 px-4 py-7">

        {config.sections.map((section, sectionIndex) => (
          <div
            key={section.title}
            className={sectionIndex > 0 ? 'mt-8' : ''}
          >

            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {section.title}
            </p>

            <div className="space-y-1">

              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      'group flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-medium transition',
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

      {/* ==========================================================
          ROLE INFORMATION
      ========================================================== */}

      <div className="border-t border-slate-200 p-4">

        <div className="border-l-4 border-yellow-400 bg-slate-50 p-4">

          <div className="flex items-start gap-3">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-blue-900 text-white">
              <i className={`${config.icon} text-xs`} />
            </div>

            <div className="min-w-0">

              <p className="text-xs font-semibold text-slate-900">
                {config.role}
              </p>

              <p className="mt-1 text-[10px] leading-5 text-slate-500">
                {config.description}
              </p>

            </div>

          </div>

        </div>

      </div>

    </aside>
  )
}

export default Sidebar