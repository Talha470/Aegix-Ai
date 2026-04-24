import { useEffect, useState } from 'react'
import api from '../utils/api'
import { Terminal, Shield, Database } from 'lucide-react'

const honeypots = [
  { name: 'Cowrie SSH', icon: <Terminal size={20} />, port: 'Port 22', color: '#00f0ff', description: 'Fake SSH — captures brute force & credentials' },
  { name: 'Dionaea', icon: <Database size={20} />, port: 'Ports 21,23,445,1433,3306', color: '#a78bfa', description: 'Multi-protocol malware trap' },
  { name: 'HTTP Honeypot', icon: <Shield size={20} />, port: 'Port 443', color: '#f97316', description: 'Fake wp-login, admin, phpmyadmin, .env' },
]

const httpTraps = [
  { path: '/wp-login.php', desc: 'Fake WordPress Login' },
  { path: '/wp-admin', desc: 'Fake WordPress Admin' },
  { path: '/admin', desc: 'Fake Admin Panel' },
  { path: '/phpmyadmin', desc: 'Fake phpMyAdmin' },
  { path: '/.env', desc: 'Fake Environment File' },
]

export default function Honeypot() {
  const [cowrie, setCowrie] = useState([])
  const [httpLogs, setHttpLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [cowrieRes, httpRes] = await Promise.all([
          api.get('/server/cowrie'),
          api.get('/server/honeypot'),
        ])
        setCowrie(cowrieRes.data)
        setHttpLogs(httpRes.data)
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

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div>
        <h1 style={{
          fontFamily: 'Orbitron, sans-serif', fontSize: '22px',
          background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px'
        }}>Honeypot Monitor</h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Active deception systems catching real attackers</p>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {honeypots.map((h, i) => (
          <div key={i} style={{
            background: 'var(--card-strong)', border: `1px solid ${h.color}33`,
            borderRadius: 'var(--radius)', padding: '24px', backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: `${h.color}18`, border: `1px solid ${h.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: h.color
              }}>{h.icon}</div>
              <span style={{
                padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                background: '#44d17a22', color: '#44d17a', border: '1px solid #44d17a44'
              }}>ACTIVE</span>
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>{h.name}</h3>
            <div style={{ fontSize: '12px', color: h.color, marginBottom: '8px', fontFamily: 'monospace' }}>{h.port}</div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>{h.description}</p>
          </div>
        ))}
      </div>

      {/* HTTP Trap Endpoints */}
      <div style={{
        background: 'var(--card-strong)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius)', padding: '24px', backdropFilter: 'blur(12px)'
      }}>
        <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: 'var(--text)', marginBottom: '16px' }}>
          HTTP Trap Endpoints
        </h3>
        <div style={{ display: 'grid', gap: '8px' }}>
          {httpTraps.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)'
            }}>
              <span style={{ fontFamily: 'monospace', color: '#00f0ff', fontSize: '13px' }}>{t.path}</span>
              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{t.desc}</span>
              <span style={{
                padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                background: '#44d17a22', color: '#44d17a', border: '1px solid #44d17a44'
              }}>ACTIVE</span>
            </div>
          ))}
        </div>
      </div>

{/* Cowrie SSH Logs */}
      <div style={{
        background: 'var(--card-strong)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius)', padding: '24px', backdropFilter: 'blur(12px)'
      }}>
        <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: 'var(--text)', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <Terminal size={16} color="#00f0ff" /> Cowrie SSH Logs (Live)
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Loading...</div>
        ) : cowrie.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No SSH attacks captured yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['IP', 'Event', 'Username', 'Password', 'Message', 'Time'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cowrie.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{log.ip}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                        background: log.event?.includes('failed') ? '#ff6b6b22' : log.event?.includes('connect') ? '#f6c90e22' : '#44d17a22',
                        color: log.event?.includes('failed') ? '#ff6b6b' : log.event?.includes('connect') ? '#f6c90e' : '#44d17a',
                      }}>{log.event?.split('.').pop()}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#f97316', fontFamily: 'monospace' }}>{log.username || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#ff6b6b', fontFamily: 'monospace' }}>{log.password || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>{log.time?.substring(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* HTTP Honeypot Logs */}
      <div style={{
        background: 'var(--card-strong)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius)', padding: '24px', backdropFilter: 'blur(12px)'
      }}>
        <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: 'var(--text)', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <Shield size={16} color="#f97316" /> HTTP Honeypot Logs (Live)
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Loading...</div>
        ) : httpLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No HTTP trap hits yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['IP', 'Method', 'Path', 'Time', 'User Agent'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {httpLogs.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{log.ip}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{log.method}</td>
                    <td style={{ padding: '10px 12px', color: '#f97316', fontFamily: 'monospace' }}>{log.path}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>{log.time}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '11px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.userAgent}</td>
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
