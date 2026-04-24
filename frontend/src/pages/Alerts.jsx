import { useEffect, useState } from 'react'
import api from '../utils/api'

const severityColor = { LOW: '#44d17a', MEDIUM: '#f6c90e', HIGH: '#f97316', CRITICAL: '#ff6b6b' }

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await api.get('/server/real-alerts')
        setAlerts(res.data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.severity === filter)

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 22, background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>Alerts</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Real alerts from all security layers — Cowrie, Suricata, HTTP Honeypot</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 999,
            border: `1px solid ${filter === f ? (severityColor[f] || '#00f0ff') : 'var(--line)'}`,
            background: filter === f ? `${severityColor[f] || '#00f0ff'}22` : 'transparent',
            color: filter === f ? (severityColor[f] || '#00f0ff') : 'var(--muted)',
            cursor: 'pointer', fontSize: 12, fontWeight: 700
          }}>{f}</button>
        ))}
      </div>

      <div style={{ background: 'var(--card-strong)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 24 }}>
        {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading...</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['IP', 'Type', 'Severity', 'Score', 'Count', 'Message', 'Source', 'Last Seen'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No alerts found</td></tr>
                ) : filtered.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{a.ip}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(0,240,255,0.1)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)' }}>{a.type}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${severityColor[a.severity]}22`, color: severityColor[a.severity], border: `1px solid ${severityColor[a.severity]}44` }}>{a.severity}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 600 }}>{a.score}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{a.count}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>{a.source}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{a.lastSeen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
