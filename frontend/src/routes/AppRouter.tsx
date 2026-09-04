import { Navigate, Route, Routes } from 'react-router-dom'

import LandingPage from '../pages/public/LandingPage'

import AdminDashboard from '../pages/users/admin/AdminDashboard'
import AdminRecords from '../pages/users/admin/AdminRecords'

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
    path="/admin/AdminDashboard"
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
