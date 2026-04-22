import { useEffect, useState } from 'react'
import api from '../utils/api'
import { Shield, AlertTriangle, Globe, FileText, Users, Activity } from 'lucide-react'

const statCards = (data) => [
  { label: 'Total Attacks', value: data.attacks ?? 0, icon: <Shield size={20} />, color: '#ff6b6b' },
  { label: 'Total Alerts', value: data.alerts ?? 0, icon: <AlertTriangle size={20} />, color: '#f6c90e' },
  { label: 'Suspicious IPs', value: data.suspiciousIPs ?? 0, icon: <Globe size={20} />, color: '#00f0ff' },
  { label: 'Total Logs', value: data.logs ?? 0, icon: <FileText size={20} />, color: '#a78bfa' },
  { label: 'Total Users', value: data.users ?? 0, icon: <Users size={20} />, color: '#44d17a' },
  { label: 'Active Honeypots', value: data.activeHoneypots ?? 0, icon: <Activity size={20} />, color: '#f97316' },
]

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'var(--card-strong)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius)',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      backdropFilter: 'blur(12px)',
      transition: 'all 0.2s ease',
      cursor: 'default'
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 20px ${color}33`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '14px',
        background: `${color}18`,
        border: `1px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text)' }}>
          {String(value)}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
          {label}
        </div>
      </div>
    </div>
  )
}

function RecentLogs({ logs }) {
  const severityColor = {
    LOW: '#44d17a',
    MEDIUM: '#f6c90e',
    HIGH: '#f97316',
    CRITICAL: '#ff6b6b'
  }

  return (
    <div style={{
      background: 'var(--card-strong)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius)',
      padding: '24px',
      backdropFilter: 'blur(12px)'
    }}>
      <h3 style={{
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '14px',
        color: 'var(--text)',
        marginBottom: '16px'
      }}>
        Recent Attack Logs
      </h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['IP', 'Endpoint', 'Attack Type', 'Severity', 'Status', 'Time'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                  No logs found
                </td>
              </tr>
            ) : (
              logs.slice(0, 10).map((log, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace' }}>{log.ip}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.endpoint}</td>
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
                  <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '12px' }}>
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Overview() {
  const [stats, setStats] = useState({})
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, logsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/logs'),
        ])
        setStats(statsRes.data)
        setLogs(logsRes.data)
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px', color: '#00f0ff', marginBottom: '8px' }}>
          LOADING...
        </div>
        <div style={{ fontSize: '13px' }}>Fetching security data</div>
      </div>
    </div>
  )

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
          Overview
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Live security stats — auto refreshes every 30 seconds
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {statCards(stats).map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      <RecentLogs logs={logs} />
    </div>
  )
}