import { useEffect, useState } from 'react'
import api from '../utils/api'

const severityColor = { LOW: '#44d17a', MEDIUM: '#f6c90e', HIGH: '#f97316', CRITICAL: '#ff6b6b' }

export default function SuspiciousIPs() {
  const [ips, setIps] = useState([])
  const [dbIps, setDbIps] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('real')

  useEffect(() => {
    async function fetchData() {
      try {
        const [realRes, dbRes] = await Promise.all([
          api.get('/server/real-ips'),
          api.get('/dashboard/suspicious-ips'),
        ])
        setIps(realRes.data)
        setDbIps(dbRes.data)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const tabs = [
    { id: 'real', label: 'All Sources (Live)', color: '#00f0ff' },
    { id: 'backend', label: 'Backend Detected', color: '#f97316' },
  ]

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 22, background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>Suspicious IPs</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>IPs from all security layers — Cowrie, Suricata, HTTP Honeypot, Backend</p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 999,
            border: `1px solid ${tab === t.id ? t.color : 'var(--line)'}`,
            background: tab === t.id ? `${t.color}22` : 'transparent',
            color: tab === t.id ? t.color : 'var(--muted)',
            cursor: 'pointer', fontSize: 12, fontWeight: 700
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ background: 'var(--card-strong)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 24 }}>
        {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading...</div> : tab === 'real' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['IP', 'Severity', 'Total Attacks', 'Last Attack', 'Sources'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ips.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No suspicious IPs</td></tr>
                ) : ips.map((ip, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{ip.ip}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${severityColor[ip.severity]}22`, color: severityColor[ip.severity] }}>{ip.severity}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 600 }}>{ip.totalAttacks}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>{ip.lastAttack}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {ip.sources?.map((s, j) => (
                          <span key={j} style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,240,255,0.1)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)' }}>{s}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['IP', 'Status', 'Severity', 'Total Attacks', 'Last Attack', 'First Seen', 'Last Seen'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dbIps.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No IPs detected by backend</td></tr>
                ) : dbIps.map((ip, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace' }}>{ip.ip}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: ip.status === 'BLOCKED' ? '#ff6b6b22' : '#44d17a22', color: ip.status === 'BLOCKED' ? '#ff6b6b' : '#44d17a' }}>{ip.status}</span></td>
                    <td style={{ padding: '10px 12px' }}><span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${severityColor[ip.currentSeverity]}22`, color: severityColor[ip.currentSeverity] }}>{ip.currentSeverity}</span></td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{ip.totalAttacks}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{ip.lastAttackType || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>{new Date(ip.firstSeen).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>{new Date(ip.lastSeen).toLocaleString()}</td>
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
