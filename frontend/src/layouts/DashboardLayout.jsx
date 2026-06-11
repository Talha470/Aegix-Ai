import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard, Shield, AlertTriangle,
  Globe, Terminal, Users, LogOut, Menu, X, Activity, Clock,
  Brain, Settings, ShieldOff, Zap, RefreshCw, ShieldCheck, Award, Radio
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    title: 'MONITORING',
    items: [
      { path: '/dashboard',             icon: <LayoutDashboard size={16} />, label: 'Overview' },
      { path: '/dashboard/logs',        icon: <Shield size={16} />,          label: 'Attack Logs' },
      { path: '/dashboard/alerts',      icon: <AlertTriangle size={16} />,   label: 'Alerts' },
      { path: '/dashboard/ips',         icon: <Globe size={16} />,           label: 'Suspicious IPs' },
      { path: '/dashboard/honeypot',    icon: <Terminal size={16} />,        label: 'Honeypot' },
    ]
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { path: '/dashboard/ml',          icon: <Brain size={16} />,           label: 'ML Detection' },
      { path: '/dashboard/zero-day',    icon: <Zap size={16} />,             label: 'Zero-Day Engine', accent: '#ff3b3b' },
      { path: '/dashboard/threat-intel',icon: <Radio size={16} />,           label: 'Threat Intel',    accent: '#f59e0b' },
    ]
  },
  {
    title: 'DEFENSE',
    items: [
      { path: '/dashboard/blocked-ips', icon: <ShieldOff size={16} />,       label: 'Blocked IPs' },
      { path: '/dashboard/morpheus',    icon: <RefreshCw size={16} />,       label: 'MORPHEUS',        accent: '#a78bfa' },
      { path: '/dashboard/helix',       icon: <ShieldCheck size={16} />,     label: 'HELIX + NEXUS',   accent: '#44d17a' },
    ]
  },
  {
    title: 'COMPLIANCE',
    items: [
      { path: '/dashboard/compliance',  icon: <Award size={16} />,           label: 'Compliance',      accent: '#a78bfa' },
    ]
  },
  {
    title: 'ADMIN',
    items: [
      { path: '/dashboard/users',       icon: <Users size={16} />,           label: 'Users' },
      { path: '/dashboard/settings',    icon: <Settings size={16} />,        label: 'Settings' },
    ]
  },
]

export default function DashboardLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [serverTime, setServerTime] = useState(new Date().toUTCString())
  const user = JSON.parse(localStorage.getItem('aegix_user') || '{}')

  useEffect(() => {
    const interval = setInterval(() => setServerTime(new Date().toUTCString()), 1000)
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
        width: sidebarOpen ? '224px' : '60px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0d1117 0%, #0a0e1a 100%)',
        borderRight: '1px solid rgba(0,240,255,0.08)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden', flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
        boxShadow: '4px 0 24px rgba(0,0,0,0.3)'
      }}>

        {/* Logo */}
        <div style={{
          padding: '16px 12px',
          borderBottom: '1px solid rgba(0,240,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,240,255,0.02)'
        }}>
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #00f0ff, #0066ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 10px rgba(0,240,255,0.3)', flexShrink: 0
              }}>
                <Activity size={14} color="white" />
              </div>
              <span style={{
                fontFamily: 'Orbitron, sans-serif', fontSize: '13px',
                background: 'linear-gradient(90deg, #00f0ff, #0066ff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                fontWeight: '700', whiteSpace: 'nowrap'
              }}>AEGIX AI</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '7px', color: 'var(--muted)', cursor: 'pointer', padding: '5px',
              display: 'flex', alignItems: 'center', flexShrink: 0
            }}>
            {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.title} style={{ marginBottom: '4px' }}>
              {sidebarOpen && (
                <div style={{
                  fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.2)',
                  letterSpacing: '0.12em', padding: '8px 12px 4px',
                }}>
                  {section.title}
                </div>
              )}
              {section.items.map(item => {
                const active = location.pathname === item.path
                const accent = item.accent || '#00f0ff'
                return (
                  <Link key={item.path} to={item.path}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 10px', borderRadius: '10px',
                      color: active ? accent : 'var(--muted)',
                      background: active
                        ? `linear-gradient(90deg, ${accent}18, ${accent}08)`
                        : 'transparent',
                      border: active ? `1px solid ${accent}25` : '1px solid transparent',
                      fontSize: '12px', fontWeight: active ? '600' : '400',
                      textDecoration: 'none', whiteSpace: 'nowrap',
                      transition: 'all 0.18s ease',
                      boxShadow: active ? `0 0 10px ${accent}0a` : 'none',
                      marginBottom: '1px',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text)' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' } }}
                  >
                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                    {sidebarOpen && item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '8px 6px', borderTop: '1px solid rgba(0,240,255,0.07)', display: 'grid', gap: '6px' }}>
          {sidebarOpen && (
            <div style={{ padding: '9px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>{user?.name || 'Admin'}</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#44d17a', boxShadow: '0 0 5px #44d17a', display: 'inline-block' }} />
                {user?.role || 'user'}
              </div>
            </div>
          )}
          <button onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 10px', borderRadius: '10px',
              background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.12)',
              color: '#ff6b6b', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
              whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,107,0.05)'}>
            <LogOut size={14} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>
        {/* Header */}
        <header style={{
          padding: '12px 24px',
          borderBottom: '1px solid rgba(0,240,255,0.07)',
          background: 'linear-gradient(90deg, #0d1117, #0a0e1a)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10,
          backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <div>
            <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: 'var(--text)', margin: 0, letterSpacing: '0.05em' }}>
              Security Dashboard
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              Real-time monitoring & threat detection
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(68,209,122,0.07)', border: '1px solid rgba(68,209,122,0.18)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#44d17a', boxShadow: '0 0 7px #44d17a', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '10px', color: '#44d17a', fontWeight: '700', letterSpacing: '0.08em' }}>LIVE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.18)' }}>
              <Clock size={12} color="#00f0ff" />
              <span style={{ fontSize: '10px', color: '#00f0ff', fontWeight: '600', fontFamily: 'monospace' }}>{serverTime}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '24px', overflow: 'auto', background: 'radial-gradient(ellipse at top left, rgba(0,240,255,0.025) 0%, transparent 50%), var(--bg-1)' }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 7px #44d17a; }
          50% { opacity: 0.5; box-shadow: 0 0 3px #44d17a; }
        }
        nav::-webkit-scrollbar { width: 3px; }
        nav::-webkit-scrollbar-track { background: transparent; }
        nav::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.15); border-radius: 3px; }
      `}</style>
    </div>
  )
}
