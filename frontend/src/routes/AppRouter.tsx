// What: Defines all your app's URL routes and who can access them.

// routes/
// └── AppRouter.tsx    ← maps URLs to pages + applies ProtectedRoute
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from '@/pages/public/LandingPage'
import AdminDashboard from '@/pages/users/admin/AdminDashboard'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter