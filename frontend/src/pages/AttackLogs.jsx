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
  const [modsec, setModsec] = useState([])
  const [suricata, setSuricata] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('modsec')

  useEffect(() => {
    async function fetchData() {
      try {
        const [logsRes, modsecRes, suricataRes] = await Promise.all([
          api.get('/dashboard/logs'),
          api.get('/server/modsec'),
          api.get('/server/suricata'),
        ])
        setLogs(logsRes.data)
        setModsec(modsecRes.data)
        setSuricata(suricataRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const tabs = [
    { id: 'modsec', label: 'ModSecurity WAF', color: '#00f0ff' },
    { id: 'suricata', label: 'Suricata IDS', color: '#a78bfa' },
    { id: 'backend', label: 'Backend Detect', color: '#f97316' },
  ]

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div>
        <h1 style={{
          fontFamily: 'Orbitron, sans-serif', fontSize: '22px',
          background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px'
        }}>Attack Logs</h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Real-time logs from all security layers</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: '999px',
            border: `1px solid ${tab === t.id ? t.color : 'var(--line)'}`,
            background: tab === t.id ? `${t.color}22` : 'transparent',
            color: tab === t.id ? t.color : 'var(--muted)',
            cursor: 'pointer', fontSize: '12px', fontWeight: '700'
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{
        background: 'var(--card-strong)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius)', padding: '24px', backdropFilter: 'blur(12px)'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Loading...</div>
        ) : tab === 'modsec' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['IP', 'Method', 'URI', 'Time', 'Source'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modsec.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>No ModSecurity logs</td></tr>
                ) : modsec.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace' }}>{log.ip}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{log.method}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.uri}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>{log.time}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: '#00f0ff22', color: '#00f0ff' }}>WAF</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'suricata' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Source IP', 'Dest IP', 'Alert Message', 'Time', 'Source'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suricata.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>No Suricata alerts</td></tr>
                ) : suricata.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace' }}>{log.sourceIP}</td>
                    <td style={{ padding: '10px 12px', color: '#f97316', fontFamily: 'monospace' }}>{log.destIP}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>{log.time}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: '#a78bfa22', color: '#a78bfa' }}>IDS</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['IP', 'Method', 'Endpoint', 'Attack Type', 'Severity', 'Score', 'Status', 'Time'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>No backend logs</td></tr>
                ) : logs.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{log.ip}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{log.method}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.endpoint}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{log.attackType}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                        background: `${severityColor[log.severity]}22`, color: severityColor[log.severity],
                        border: `1px solid ${severityColor[log.severity]}44`
                      }}>{log.severity}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{log.score}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                        background: log.status === 'BLOCKED' ? '#ff6b6b22' : log.status === 'FLAGGED' ? '#f6c90e22' : '#44d17a22',
                        color: log.status === 'BLOCKED' ? '#ff6b6b' : log.status === 'FLAGGED' ? '#f6c90e' : '#44d17a',
                      }}>{log.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
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
