import { useEffect, useState } from 'react'
import api from '../utils/api'

const severityColor = {
  LOW: '#44d17a',
  MEDIUM: '#f6c90e',
  HIGH: '#f97316',
  CRITICAL: '#ff6b6b'
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await api.get('/dashboard/alerts')
        setAlerts(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.severity === filter)

  return (
    <div style={{ display: 'grid', gap: '24px' }}>

      <div>
        <h1 style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '22px',
          background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '4px'
        }}>
          Alerts
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Last 50 alerts — auto refreshes every 30 seconds
        </p>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              borderRadius: '999px',
              border: `1px solid ${filter === f ? (severityColor[f] || '#00f0ff') : 'var(--line)'}`,
              background: filter === f ? `${severityColor[f] || '#00f0ff'}22` : 'transparent',
              color: filter === f ? (severityColor[f] || '#00f0ff') : 'var(--muted)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '700'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{
        background: 'var(--card-strong)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: '24px',
        backdropFilter: 'blur(12px)'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['IP', 'Type', 'Severity', 'Score', 'Count', 'Message', 'Last Seen'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                      No alerts found
                    </td>
                  </tr>
                ) : (
                  filtered.map((alert, i) => (
                    <tr key={i}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{alert.ip}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{alert.type}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: `${severityColor[alert.severity]}22`,
                          color: severityColor[alert.severity],
                          border: `1px solid ${severityColor[alert.severity]}44`
                        }}>
                          {alert.severity}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{alert.score}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{alert.count}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.message}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(alert.lastSeen).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}