import { useState, useEffect } from 'react'
import { getSocket } from '../utils/socket'
import { X, Zap, AlertTriangle, ShieldAlert, ShieldOff } from 'lucide-react'

const SEV_CONFIG = {
  CRITICAL:   { color: '#ff3b3b', icon: <Zap size={14} /> },
  HIGH:       { color: '#f59e0b', icon: <AlertTriangle size={14} /> },
  MEDIUM:     { color: '#00f0ff', icon: <ShieldAlert size={14} /> },
  LOW:        { color: '#44d17a', icon: <ShieldAlert size={14} /> },
  IP_BLOCKED: { color: '#a78bfa', icon: <ShieldOff size={14} /> },
}

export default function AlertToast() {
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('aegix_token')
    if (!token) return

    const socket = getSocket()
    socket.emit('authenticate', token)

    function addAlert(alert) {
      const id = Date.now() + Math.random()
      setAlerts(prev => [...prev.slice(-4), { ...alert, id }])
      setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 8000)
    }

    socket.on('new_alert', addAlert)
    socket.on('ip_blocked', (data) => addAlert({
      severity: 'IP_BLOCKED',
      type: 'IP BLOCKED',
      ip: data.ip,
      message: data.reason || 'Blocked by ' + (data.blockedBy || 'system'),
    }))

    return () => { socket.off('new_alert'); socket.off('ip_blocked') }
  }, [])

  if (alerts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      zIndex: 9999, maxWidth: '340px',
    }}>
      {alerts.map(alert => {
        const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.MEDIUM
        return (
          <div key={alert.id} style={{
            padding: '14px 16px', borderRadius: '14px',
            background: '#0d1117', border: `1px solid ${cfg.color}40`,
            boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 12px ${cfg.color}18`,
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            animation: 'slideIn 0.3s ease',
          }}>
            <span style={{ color: cfg.color, marginTop: '1px', flexShrink: 0 }}>{cfg.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: cfg.color, marginBottom: '2px' }}>
                {alert.type || alert.attackType || 'ALERT'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {alert.ip && <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{alert.ip}</span>}
                {alert.message && <span> — {alert.message}</span>}
              </div>
            </div>
            <button onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px', flexShrink: 0 }}>
              <X size={12} />
            </button>
          </div>
        )
      })}
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  )
}
