import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import LandingPage from '../pages/public/LandingPage'

import AdminDashboard from '../pages/users/admin/AdminDashboard'
import AdminRecords from '../pages/users/admin/AdminRecords'
import AdminPrograms from '../pages/users/admin/programs/AdminProgramsPage'
import AdminStaffAccountsPage from '../pages/users/admin/staff-accounts/AdminStaffAccountsPage'
import RegistrarDashboard from '../pages/users/registrar/RegistrarDashboard'
import RegistrarEnrollment from '../pages/users/registrar/RegistrarEnrollment'
import AdminBatchConfiguration from '../pages/users/admin/batches/AdminBatchConfiguration'
import AdminAnnouncementsPage from '../pages/users/admin/announcements/AdminAnnouncementsPage'
import AdminEnrollmentPage from '../pages/users/admin/enrollment/AdminEnrollmentPage'
import AdminInventoryPage from '../pages/users/admin/inventory/AdminInventoryPage'
import AdminReportsPage from '../pages/users/admin/reports/AdminReportsPage'
import AdminImportDataPage from '../pages/users/admin/import-data/AdminImportDataPage'

import TrainerDashboard from '../pages/users/trainer/TrainerDashboard'
import TrainerAnnouncementsPage from '../pages/users/trainer/announcements/TrainerAnnouncementsPage'

import TraineeDashboard from '../pages/users/trainee/TraineeDashboard'
import EncoderDashboard from '../pages/users/encoder/EncoderDashboard'
import EncoderAnnouncementsPage from '../pages/users/encoder/announcements/EncoderAnnouncementsPage'

import RegistrarAnnouncementsPage from '../pages/users/registrar/announcements/RegistrarAnnouncementsPage'
const AdminPaymentsPage = lazy(() => import('../pages/users/admin/AdminPaymentsPage'))
const RegistrarPaymentsPage = lazy(() => import('../pages/users/registrar/RegistrarPaymentsPage'))

import ProtectedRoute from '../components/auth/ProtectedRoute'
import PublicOnlyRoute from '../components/auth/PublicOnlyRoute'
import BatchManagement from '../pages/users/registrar/batches/BatchManagement'
import AdminTraineesPage from '../pages/users/admin/trainee-information/AdminTraineesPage'
import AdminTraineeProfilePage from '../pages/users/admin/trainee-information/AdminTraineeProfilePage'
import RegistrarTraineesPage from '../pages/users/registrar/trainee-information/RegistrarTraineesPage'
import RegistrarTraineeProfilePage from '../pages/users/registrar/trainee-information/RegistrarTraineeProfilePage'

function AppRouter() {
return ( <Routes>

  {/* ==========================================================
      PUBLIC / GUEST ONLY
  ========================================================== */}

  <Route
    path="/"
    element={
      <PublicOnlyRoute>
        <LandingPage />
      </PublicOnlyRoute>
    }
  />

  <Route
    path="/landing"
    element={
      <PublicOnlyRoute>
        <LandingPage />
      </PublicOnlyRoute>
    }
  />

  {/* ==========================================================
      ADMIN
  ========================================================== */}

  <Route
    path="/admin/dashboard"
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminDashboard />
      </ProtectedRoute>
    }
  />

  <Route
    path="/admin/records"
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminRecords />
      </ProtectedRoute>
    }
  />

  <Route
    path="/admin/payments"
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading payments...</div>}>
          <AdminPaymentsPage />
        </Suspense>
      </ProtectedRoute>
    }
  />

  <Route
    path="/admin/programs"
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminPrograms />
      </ProtectedRoute>
    }
  />

  {/* ==========================================================
    REGISTRAR
========================================================== */}

<Route
  path="/registrar/dashboard"
  element={
    <ProtectedRoute allowedRoles={['REGISTRAR']}>
      <RegistrarDashboard />
    </ProtectedRoute>
  }
/>
<Route
    path="/registrar/announcements"
    element={
      <ProtectedRoute allowedRoles={['REGISTRAR']}>
        <RegistrarAnnouncementsPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/registrar/batches/BatchManagement"
    element={
      <ProtectedRoute allowedRoles={['REGISTRAR']}>
        <BatchManagement />
      </ProtectedRoute>
    }
  />  

<Route
  path="/admin/batches"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminBatchConfiguration />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/enrollment"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminEnrollmentPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/inventory"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminInventoryPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/reports"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminReportsPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/import-data"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminImportDataPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/announcements"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminAnnouncementsPage />
    </ProtectedRoute>
  }
/>


<Route
  path="/admin/staff-accounts/AdminStaffAccountsPage"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminStaffAccountsPage />
    </ProtectedRoute>
  }
/>


  <Route
    path="/registrar/enrollment"
    element={
      <ProtectedRoute allowedRoles={['REGISTRAR']}>
        <RegistrarEnrollment />
      </ProtectedRoute>
    }
  />

  <Route
    path="/registrar/payments"
    element={
      <ProtectedRoute allowedRoles={['REGISTRAR']}>
        <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading payments...</div>}>
          <RegistrarPaymentsPage />
        </Suspense>
      </ProtectedRoute>
    }
  />

  {/* Trainee Information (MP-24): shared, read-only */}
  <Route
    path="/admin/trainees"
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminTraineesPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/admin/trainees/:id"
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminTraineeProfilePage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/registrar/trainees"
    element={
      <ProtectedRoute allowedRoles={['REGISTRAR']}>
        <RegistrarTraineesPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/registrar/trainees/:id"
    element={
      <ProtectedRoute allowedRoles={['REGISTRAR']}>
        <RegistrarTraineeProfilePage />
      </ProtectedRoute>
    }
  />
  {/* ==========================================================
      TRAINER
  ========================================================== */}

  <Route
    path="/trainer/dashboard"
    element={
      <ProtectedRoute allowedRoles={['TRAINER']}>
        <TrainerDashboard />
      </ProtectedRoute>
    }
  />

  <Route
    path="/trainer/announcements"
    element={
      <ProtectedRoute allowedRoles={['TRAINER']}>
        <TrainerAnnouncementsPage />
      </ProtectedRoute>
    }
  />

  {/* ==========================================================
      TRAINEE
  ========================================================== */}

  <Route
    path="/trainee/dashboard"
    element={
      <ProtectedRoute allowedRoles={['TRAINEE']}>
        <TraineeDashboard />
      </ProtectedRoute>
    }
  />

  {/* ==========================================================
      REGISTRAR
  ========================================================== */}

  <Route
    path="/registrar"
    element={
      <ProtectedRoute allowedRoles={['REGISTRAR']}>
        <RegistrarDashboard />
      </ProtectedRoute>
    }
  />

  <Route
    path="/registrar/dashboard"
    element={
      <ProtectedRoute allowedRoles={['REGISTRAR']}>
        <RegistrarDashboard />
      </ProtectedRoute>
    }
  />

  <Route
    path="/encoder"
    element={
      <ProtectedRoute allowedRoles={['ENCODER']}>
        <EncoderDashboard />
      </ProtectedRoute>
    }
  />

  <Route
    path="/encoder/dashboard"
    element={
      <ProtectedRoute allowedRoles={['ENCODER']}>
        <EncoderDashboard />
      </ProtectedRoute>
    }
  />

  <Route
    path="/encoder/announcements"
    element={
      <ProtectedRoute allowedRoles={['ENCODER']}>
        <EncoderAnnouncementsPage />
      </ProtectedRoute>
    }
  />

  <Route
    path="/403"
    element={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
          <p className="mt-2 text-slate-600">You do not have permission to view this page.</p>
        </div>
      </div>
    }
  />

  {/* ==========================================================
      FALLBACK
  ========================================================== */}

  <Route
    path="*"
    element={<Navigate to="/" replace />}
  />

</Routes>

)
}

export default AppRouter
