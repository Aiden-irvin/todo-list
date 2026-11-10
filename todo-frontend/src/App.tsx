import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/auth'
import SignInPage from './pages/SignInPage'
import TaskDetailPage from './pages/TaskDetailPage'
import TasksPage from './pages/TasksPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  return useAuth().isAuthenticated ? children : <Navigate to="/signin" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/" element={<RequireAuth><TasksPage /></RequireAuth>} />
        <Route path="/tasks/:id" element={<RequireAuth><TaskDetailPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
