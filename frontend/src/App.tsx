import { BrowserRouter, Routes, Route } from 'react-router-dom'

import LandingPage from './pages/public/LandingPage'
import AdminDashboard from './pages/users/admin/AdminDashboard'
import TrainerDashboard from './pages/users/trainer/TrainerDashboard'
import TraineeDashboard from './pages/users/trainee/TraineeDashboard'

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Trainer */}
          <Route
            path="/trainer"
            element={
              <ProtectedRoute allowedRoles={['TRAINER']}>
                <TrainerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Trainee */}
          <Route
            path="/trainee"
            element={
              <ProtectedRoute allowedRoles={['TRAINEE']}>
                <TraineeDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App