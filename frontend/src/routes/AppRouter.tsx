import { Navigate, Route, Routes } from 'react-router-dom'

import LandingPage from '../pages/public/LandingPage'

import AdminDashboard from '../pages/users/admin/AdminDashboard'
import AdminRecords from '../pages/users/admin/AdminRecords'

import RegistrarDashboard from '../pages/users/registrar/RegistrarDashboard'
import RegistrarEnrollment from '../pages/users/registrar/RegistrarEnrollment'
import AdminBatchConfiguration from '../pages/users/admin/batches/AdminBatchConfiguration'
import AdminAnnouncementsPage from '../pages/users/admin/announcements/AdminAnnouncementsPage'

import TrainerDashboard from '../pages/users/trainer/TrainerDashboard'

import TraineeDashboard from '../pages/users/trainee/TraineeDashboard'
import EncoderDashboard from '../pages/users/encoder/EncoderDashboard'

import RegistrarAnnouncementsPage from '../pages/users/registrar/announcements/RegistrarAnnouncementsPage'

import ProtectedRoute from '../components/auth/ProtectedRoute'
import PublicOnlyRoute from '../components/auth/PublicOnlyRoute'
import BatchManagement from '../pages/users/registrar/batches/BatchManagement'

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
  path="/admin/batches"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminBatchConfiguration />
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
