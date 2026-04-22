import { useEffect, useState } from 'react'
import api from '../utils/api'

const severityColor = {
  LOW: '#44d17a',
  MEDIUM: '#f6c90e',
  HIGH: '#f97316',
  CRITICAL: '#ff6b6b'
}

export default function AttackLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api.get('/dashboard/logs')
        setLogs(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [])

  const filtered = filter === 'ALL' ? logs : logs.filter(l => l.severity === filter)

  return (
    <div style={{ display: 'grid', gap: '24px' }}>

      {/* Title */}
      <div>
        <h1 style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '22px',
          background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '4px'
        }}>
          Attack Logs
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Last 50 requests — auto refreshes every 30 seconds
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

      {/* Table */}
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
                  {['IP', 'Method', 'Endpoint', 'Attack Type', 'Severity', 'Score', 'Status', 'Time'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filtered.map((log, i) => (
                    <tr key={i}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{log.ip}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{log.method}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.endpoint}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{log.attackType}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: `${severityColor[log.severity]}22`,
                          color: severityColor[log.severity],
                          border: `1px solid ${severityColor[log.severity]}44`
                        }}>
                          {log.severity}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{log.score}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: log.status === 'BLOCKED' ? '#ff6b6b22' : log.status === 'FLAGGED' ? '#f6c90e22' : '#44d17a22',
                          color: log.status === 'BLOCKED' ? '#ff6b6b' : log.status === 'FLAGGED' ? '#f6c90e' : '#44d17a',
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
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