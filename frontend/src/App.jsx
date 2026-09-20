import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import RoleSelection from './pages/RoleSelection'
import Dashboard from './pages/Dashboard'
import ProjectGraph from './pages/ProjectGraph'
import ImpactSimulator from './pages/ImpactSimulator'
import DataTrust from './pages/DataTrust'
import ProjectMemory from './pages/ProjectMemory'
import AIChat from './components/AIChat'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { role, projectId } = useAuth()
  if (!role || !projectId) {
    return <Navigate to="/role" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/role" element={<RoleSelection />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="graph" element={<ProjectGraph />} />
        <Route path="simulator" element={<ImpactSimulator />} />
        <Route path="trust" element={<DataTrust />} />
        <Route path="memory" element={<ProjectMemory />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App