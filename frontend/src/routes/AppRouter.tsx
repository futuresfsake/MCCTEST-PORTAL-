import { Navigate, Route, Routes } from 'react-router-dom'

import LandingPage from '../pages/public/LandingPage'

import AdminDashboard from '../pages/users/admin/AdminDashboard'
import AdminRecords from '../pages/users/admin/AdminRecords'
import AdminPrograms from '../pages/users/admin/programs/AdminProgramsPage'
import { AdminStaffAccountsPage } from '../pages/users/admin/staff-accounts/AdminStaffAccountsPage'

import TrainerDashboard from '../pages/users/trainer/TrainerDashboard'
import TraineeDashboard from '../pages/users/trainee/TraineeDashboard'
import EncoderDashboard from '../pages/users/encoder/EncoderDashboard'
import RegistrarDashboard from '../pages/users/registrar/RegistrarDashboard'

import ProtectedRoute from '../components/auth/ProtectedRoute'
import PublicOnlyRoute from '../components/auth/PublicOnlyRoute'
import BatchManagement from '../pages/users/registrar/batches/BatchManagement'
//import path from 'path/win32';

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

  <Route
  path="/admin/records"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminRecords />
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

<Route
  path="/admin/staff-accounts/AdminStaffAccountsPage"
  element={
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AdminStaffAccountsPage />
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
    path="/registrar/batches/BatchManagement"
    element={
      <ProtectedRoute allowedRoles={['REGISTRAR', 'ADMIN']}>
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
