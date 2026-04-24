import { useEffect, useState } from 'react'
import api from '../utils/api'
import { Shield, AlertTriangle, Globe, FileText, Users, Activity, Cpu, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

const safeNumber = (v) => { const n = Number(v); return isNaN(n) ? 0 : n }
const COLORS = ['#ff6b6b', '#f6c90e', '#00f0ff', '#a78bfa', '#f97316', '#44d17a']
const tipStyle = { background: '#111116', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#e6eef8' }

const statCards = (data) => [
  { label: 'Total Attacks', value: data.attacks ?? 0, icon: <Shield size={20} />, color: '#ff6b6b' },
  { label: 'Total Alerts', value: data.alerts ?? 0, icon: <AlertTriangle size={20} />, color: '#f6c90e' },
  { label: 'Suspicious IPs', value: data.suspiciousIPs ?? 0, icon: <Globe size={20} />, color: '#00f0ff' },
  { label: 'Total Logs', value: data.logs ?? 0, icon: <FileText size={20} />, color: '#a78bfa' },
  { label: 'Total Users', value: data.users ?? 0, icon: <Users size={20} />, color: '#44d17a' },
  { label: 'Active Honeypots', value: 3, icon: <Activity size={20} />, color: '#f97316' },
]

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'var(--card-strong)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
      padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(12px)'
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, background: `${color}18`,
        border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{String(value)}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

function ProgressBar({ label, value, max, unit, color }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{value}{unit} / {max}{unit} ({percent}%)</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%', borderRadius: 4, width: `${percent}%`,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          boxShadow: `0 0 10px ${color}44`, transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  )
}

export default function Overview() {
  const [stats, setStats] = useState({})
  const [logs, setLogs] = useState([])
  const [serverStats, setServerStats] = useState(null)
  const [fail2ban, setFail2ban] = useState([])
  const [modsec, setModsec] = useState([])
  const [cowrie, setCowrie] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [a, b, c, d, e, f] = await Promise.all([
          api.get('/server/real-stats'), api.get('/dashboard/logs'),
          api.get('/server/server-stats'), api.get('/server/fail2ban'),
          api.get('/server/modsec'), api.get('/server/cowrie'),
        ])
        setStats(a.data || {}); setLogs(b.data || []); setServerStats(c.data || {})
        setFail2ban(d.data || []); setModsec(e.data || []); setCowrie(f.data || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const f2bData = fail2ban.map(j => ({ name: j.jail, banned: safeNumber(j.currentlyBanned), total: safeNumber(j.totalBanned) }))

  const attackSources = (() => {
    const c = {}
    ;[...cowrie, ...modsec].forEach(l => { if (l?.ip && l.ip !== 'Unknown') c[l.ip] = (c[l.ip] || 0) + 1 })
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value: safeNumber(value) }))
  })()

  const cowrieEvents = (() => {
    const e = { connect: 0, failed: 0, success: 0 }
    cowrie.forEach(l => {
      if (l.event?.includes('connect')) e.connect++
      else if (l.event?.includes('failed')) e.failed++
      else if (l.event?.includes('success')) e.success++
    })
    return Object.entries(e).map(([name, value]) => ({ name, value }))
  })()

  const hourly = (() => {
    const h = {}
    for (let i = 0; i < 24; i++) h[i] = { hour: `${i}:00`, modsec: 0, cowrie: 0 }
    modsec.forEach(l => { const m = l.time?.match(/(\d{2}):\d{2}:\d{2}/); if (m) { const hr = safeNumber(m[1]); if (hr >= 0 && hr < 24) h[hr].modsec++ } })
    cowrie.forEach(l => { const m = l.time?.match(/T(\d{2})/); if (m) { const hr = safeNumber(m[1]); if (hr >= 0 && hr < 24) h[hr].cowrie++ } })
    return Object.values(h)
  })()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 14, color: '#00f0ff', marginBottom: 8 }}>LOADING...</div>
        <div style={{ fontSize: 13 }}>Fetching security data</div>
      </div>
    </div>
  )

  const mem = serverStats?.memory || {}
  const disk = serverStats?.disk || {}

  return (
    <div style={{ display: 'grid', gap: 24 }}>

      {/* Title */}
      <div>
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 22, background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>Overview</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Live security stats — auto refreshes every 30 seconds</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {statCards(stats).map((c, i) => <StatCard key={i} {...c} />)}
      </div>

      {/* Server Health + Fail2Ban */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Server Health */}
        <div style={{ background: 'var(--card-strong)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 24 }}>
          <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 14, color: 'var(--text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={16} color="#00f0ff" /> Server Health
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', borderRadius: 12, background: 'rgba(68,209,122,0.08)', border: '1px solid rgba(68,209,122,0.2)' }}>
            <Clock size={14} color="#44d17a" />
            <span style={{ fontSize: 13, color: '#44d17a' }}>{serverStats?.uptime || 'unknown'}</span>
          </div>
          <ProgressBar label="CPU Usage" value={safeNumber(serverStats?.cpu)} max={100} unit="%" color="#00f0ff" />
          <ProgressBar label="RAM Usage" value={safeNumber(mem.used)} max={safeNumber(mem.total) || 1} unit="MB" color="#a78bfa" />
          <ProgressBar label="Disk Usage" value={safeNumber(parseFloat(disk.used))} max={safeNumber(parseFloat(disk.total)) || 1} unit="G" color="#f97316" />
        </div>

        {/* Fail2Ban Chart */}
        <div style={{ background: 'var(--card-strong)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 24 }}>
          <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 14, color: 'var(--text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} color="#ff6b6b" /> Fail2Ban Bans
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={f2bData}>
              <XAxis dataKey="name" tick={{ fill: '#9fb1c7', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <YAxis tick={{ fill: '#9fb1c7', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="total" fill="#ff6b6b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="banned" fill="#00f0ff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Activity + Attack Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--card-strong)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 24 }}>
          <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 14, color: 'var(--text)', marginBottom: 20 }}>Hourly Attack Activity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hourly}>
              <XAxis dataKey="hour" tick={{ fill: '#9fb1c7', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <YAxis tick={{ fill: '#9fb1c7', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <Tooltip contentStyle={tipStyle} />
              <Area type="monotone" dataKey="modsec" stroke="#00f0ff" fill="#00f0ff22" strokeWidth={2} name="ModSecurity" />
              <Area type="monotone" dataKey="cowrie" stroke="#a78bfa" fill="#a78bfa22" strokeWidth={2} name="Cowrie" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--card-strong)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 24 }}>
          <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 14, color: 'var(--text)', marginBottom: 20 }}>Top Attack Sources</h3>
          {attackSources.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No data yet</div> : (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={attackSources} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {attackSources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                {attackSources.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                      <span style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{s.name}</span>
                    </div>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cowrie Events + Recent Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <div style={{ background: 'var(--card-strong)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 24 }}>
          <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 14, color: 'var(--text)', marginBottom: 20 }}>SSH Honeypot Events</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={cowrieEvents} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                <Cell fill="#f6c90e" /><Cell fill="#ff6b6b" /><Cell fill="#44d17a" />
              </Pie>
              <Tooltip contentStyle={tipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {[{ l: 'Connections', c: '#f6c90e' }, { l: 'Failed Logins', c: '#ff6b6b' }, { l: 'Successful', c: '#44d17a' }].map((x, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} />
                <span style={{ color: 'var(--muted)' }}>{x.l}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600, marginLeft: 'auto' }}>{cowrieEvents[i]?.value || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card-strong)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 24 }}>
          <h3 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>Recent Attack Logs</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['IP', 'Endpoint', 'Attack', 'Severity', 'Status', 'Time'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No logs found</td></tr>
                ) : logs.slice(0, 8).map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace' }}>{log.ip}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.endpoint}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>{log.attackType}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: `${({ LOW: '#44d17a', MEDIUM: '#f6c90e', HIGH: '#f97316', CRITICAL: '#ff6b6b' })[log.severity]}22`,
                        color: ({ LOW: '#44d17a', MEDIUM: '#f6c90e', HIGH: '#f97316', CRITICAL: '#ff6b6b' })[log.severity]
                      }}>{log.severity}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: log.status === 'BLOCKED' ? '#ff6b6b22' : '#44d17a22',
                        color: log.status === 'BLOCKED' ? '#ff6b6b' : '#44d17a'
                      }}>{log.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>{new Date(log.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
