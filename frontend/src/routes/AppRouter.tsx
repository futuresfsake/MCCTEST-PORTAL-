import { Navigate, Route, Routes } from 'react-router-dom'

import LandingPage from '../pages/public/LandingPage'

import AdminDashboard from '../pages/users/admin/AdminDashboard'
import AdminRecords from '../pages/users/admin/AdminRecords'

import RegistrarDashboard from '../pages/users/registrar/RegistrarDashboard'
import RegistrarEnrollment from '../pages/users/registrar/RegistrarEnrollment'

import TrainerDashboard from '../pages/users/trainer/TrainerDashboard'

import TraineeDashboard from '../pages/users/trainee/TraineeDashboard'


import ProtectedRoute from '../components/auth/ProtectedRoute'
import PublicOnlyRoute from '../components/auth/PublicOnlyRoute'

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
    path="/trainer"
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
    path="/trainee"
    element={
      <ProtectedRoute allowedRoles={['TRAINEE']}>
        <TraineeDashboard />
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
