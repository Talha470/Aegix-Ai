import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Settings from './pages/Settings'
import DashboardLayout from './layouts/DashboardLayout'
import Overview from './pages/Overview'
import AttackLogs from './pages/AttackLogs'
import Alerts from './pages/Alerts'
import MLDashboard from './pages/MLDashboard'
import SuspiciousIPs from './pages/SuspiciousIPs'
import Honeypot from './pages/Honeypot'
import Users from './pages/Users'
import BlockedIPs from './pages/BlockedIPs'
import ZeroDay from './pages/ZeroDay'
import Morpheus from './pages/Morpheus'
import HelixNexus from './pages/HelixNexus'
import Compliance from './pages/Compliance'
import ThreatIntel from './pages/ThreatIntel'
import AlertToast from './components/AlertToast'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('aegix_token')
  return token ? children : <Navigate to="/login" />
}

function App() {
  return (
    <>
      <AlertToast />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />

        {/* Dashboard routes */}
        <Route path="/dashboard"                 element={<ProtectedRoute><DashboardLayout><Overview /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/logs"            element={<ProtectedRoute><DashboardLayout><AttackLogs /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/alerts"          element={<ProtectedRoute><DashboardLayout><Alerts /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/ips"             element={<ProtectedRoute><DashboardLayout><SuspiciousIPs /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/honeypot"        element={<ProtectedRoute><DashboardLayout><Honeypot /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/users"           element={<ProtectedRoute><DashboardLayout><Users /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/settings"        element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/ml"              element={<ProtectedRoute><DashboardLayout><MLDashboard /></DashboardLayout></ProtectedRoute>} />

        {/* Upgrade routes */}
        <Route path="/dashboard/blocked-ips"     element={<ProtectedRoute><DashboardLayout><BlockedIPs /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/zero-day"        element={<ProtectedRoute><DashboardLayout><ZeroDay /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/morpheus"        element={<ProtectedRoute><DashboardLayout><Morpheus /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/helix"           element={<ProtectedRoute><DashboardLayout><HelixNexus /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/compliance"      element={<ProtectedRoute><DashboardLayout><Compliance /></DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/threat-intel"    element={<ProtectedRoute><DashboardLayout><ThreatIntel /></DashboardLayout></ProtectedRoute>} />
      </Routes>
    </>
  )
}

export default App
