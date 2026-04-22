import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DashboardLayout from './layouts/DashboardLayout'
import Overview from './pages/Overview'
import AttackLogs from './pages/AttackLogs'
import Alerts from './pages/Alerts'
import SuspiciousIPs from './pages/SuspiciousIPs'
import Honeypot from './pages/Honeypot'
import Users from './pages/Users'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('aegix_token')
  return token ? children : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Overview /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/logs" element={<ProtectedRoute><DashboardLayout><AttackLogs /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/alerts" element={<ProtectedRoute><DashboardLayout><Alerts /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/ips" element={<ProtectedRoute><DashboardLayout><SuspiciousIPs /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/honeypot" element={<ProtectedRoute><DashboardLayout><Honeypot /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/users" element={<ProtectedRoute><DashboardLayout><Users /></DashboardLayout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App