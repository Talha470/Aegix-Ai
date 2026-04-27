import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard, Shield, AlertTriangle,
  Globe, Terminal, Users, LogOut, Menu, X, Activity, Clock, Brain, Settings
} from 'lucide-react'
const navItems = [
  { path: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Overview' },
  { path: '/dashboard/ml', icon: <Brain size={18} />, label: 'ML Detection' },
  { path: '/dashboard/logs', icon: <Shield size={18} />, label: 'Attack Logs' },
  { path: '/dashboard/alerts', icon: <AlertTriangle size={18} />, label: 'Alerts' },
  { path: '/dashboard/ips', icon: <Globe size={18} />, label: 'Suspicious IPs' },
  { path: '/dashboard/honeypot', icon: <Terminal size={18} />, label: 'Honeypot' },
  { path: '/dashboard/users', icon: <Users size={18} />, label: 'Users' },
  { path: '/dashboard/settings', icon: <Settings size={18} />, label: 'Settings' },
]

export default function DashboardLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [serverTime, setServerTime] = useState(new Date().toUTCString())
  const user = JSON.parse(localStorage.getItem('aegix_user') || '{}')

  useEffect(() => {
    const interval = setInterval(() => {
      setServerTime(new Date().toUTCString())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  function handleLogout() {
    localStorage.removeItem('aegix_token')
    localStorage.removeItem('aegix_user')
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-1)' }}>

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '240px' : '68px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0d1117 0%, #0a0e1a 100%)',
        borderRight: '1px solid rgba(0,240,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxShadow: '4px 0 24px rgba(0,0,0,0.3)'
      }}>

        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(0,240,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'rgba(0,240,255,0.03)'
        }}>
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00f0ff, #0066ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(0,240,255,0.4)',
                flexShrink: 0
              }}>
                <Activity size={16} color="white" />
              </div>
              <span style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '14px',
                background: 'linear-gradient(90deg, #00f0ff, #0066ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                whiteSpace: 'nowrap',
                fontWeight: '700'
              }}>
                AEGIX AI
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'grid', gap: '2px', alignContent: 'start' }}>
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 12px',
                  borderRadius: '12px',
                  color: active ? '#00f0ff' : 'var(--muted)',
                  background: active
                    ? 'linear-gradient(90deg, rgba(0,240,255,0.12), rgba(0,102,255,0.06))'
                    : 'transparent',
                  border: active ? '1px solid rgba(0,240,255,0.2)' : '1px solid transparent',
                  fontSize: '13px',
                  fontWeight: active ? '600' : '400',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 0 12px rgba(0,240,255,0.08)' : 'none'
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = 'var(--text)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--muted)'
                  }
                }}
              >
                {item.icon}
                {sidebarOpen && item.label}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid rgba(0,240,255,0.08)',
          display: 'grid',
          gap: '8px'
        }}>
          {sidebarOpen && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                {user?.name || 'Admin'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#44d17a',
                  boxShadow: '0 0 6px #44d17a',
                  display: 'inline-block'
                }} />
                {user?.role || 'user'}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(255,107,107,0.06)',
              border: '1px solid rgba(255,107,107,0.15)',
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,107,0.06)'}
          >
            <LogOut size={16} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>

        {/* Top Header */}
        <header style={{
          padding: '14px 28px',
          borderBottom: '1px solid rgba(0,240,255,0.08)',
          background: 'linear-gradient(90deg, #0d1117, #0a0e1a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
        }}>
          <div>
            <h2 style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '15px',
              color: 'var(--text)',
              margin: 0,
              letterSpacing: '0.05em'
            }}>
              Security Dashboard
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              Real-time monitoring & threat detection
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Live indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 14px',
              borderRadius: '999px',
              background: 'rgba(68,209,122,0.08)',
              border: '1px solid rgba(68,209,122,0.2)'
            }}>
              <div style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#44d17a',
                boxShadow: '0 0 8px #44d17a',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ fontSize: '11px', color: '#44d17a', fontWeight: '700', letterSpacing: '0.08em' }}>
                LIVE
              </span>
            </div>

            {/* Server Time */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 14px',
              borderRadius: '999px',
              background: 'rgba(0,240,255,0.08)',
              border: '1px solid rgba(0,240,255,0.2)'
            }}>
              <Clock size={14} color="#00f0ff" />
              <span style={{ 
                fontSize: '11px', 
                color: '#00f0ff', 
                fontWeight: '600', 
                fontFamily: 'monospace',
                letterSpacing: '0.03em'
              }}>
                {serverTime}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{
          flex: 1,
          padding: '28px',
          overflow: 'auto',
          background: 'radial-gradient(ellipse at top left, rgba(0,240,255,0.03) 0%, transparent 50%), var(--bg-1)'
        }}>
          {children}
        </main>

      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; box-shadow: 0 0 8px #44d17a; }
          50% { opacity: 0.5; box-shadow: 0 0 3px #44d17a; }
          100% { opacity: 1; box-shadow: 0 0 8px #44d17a; }
        }
      `}</style>
    </div>
  )
}
