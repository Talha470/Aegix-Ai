import { useEffect, useState } from 'react'
import api from '../utils/api'

const severityColor = {
  LOW: '#44d17a',
  MEDIUM: '#f6c90e',
  HIGH: '#f97316',
  CRITICAL: '#ff6b6b'
}

export default function SuspiciousIPs() {
  const [ips, setIps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchIPs() {
      try {
        const res = await api.get('/dashboard/suspicious-ips')
        setIps(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchIPs()
    const interval = setInterval(fetchIPs, 30000)
    return () => clearInterval(interval)
  }, [])

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
          Suspicious IPs
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Top 50 suspicious IPs — auto refreshes every 30 seconds
        </p>
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
                  {['IP', 'Status', 'Severity', 'Total Attacks', 'Total Alerts', 'Last Attack', 'First Seen', 'Last Seen'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ips.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                      No suspicious IPs found
                    </td>
                  </tr>
                ) : (
                  ips.map((ip, i) => (
                    <tr key={i}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{ip.ip}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: ip.status === 'BLOCKED' ? '#ff6b6b22' : '#44d17a22',
                          color: ip.status === 'BLOCKED' ? '#ff6b6b' : '#44d17a',
                          border: `1px solid ${ip.status === 'BLOCKED' ? '#ff6b6b44' : '#44d17a44'}`
                        }}>
                          {ip.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: `${severityColor[ip.currentSeverity]}22`,
                          color: severityColor[ip.currentSeverity],
                          border: `1px solid ${severityColor[ip.currentSeverity]}44`
                        }}>
                          {ip.currentSeverity}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{ip.totalAttacks}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{ip.totalAlerts}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{ip.lastAttackType || '—'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(ip.firstSeen).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(ip.lastSeen).toLocaleString()}
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