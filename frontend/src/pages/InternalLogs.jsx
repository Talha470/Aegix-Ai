import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { RefreshCw, Terminal } from 'lucide-react'

const SEV_COLORS = { CRITICAL: '#ff3b3b', HIGH: '#f59e0b', MEDIUM: '#00f0ff', LOW: '#44d17a' }

export default function InternalLogs() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const LIMIT = 50

  const fetchData = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const [logsRes, statsRes] = await Promise.allSettled([
        api.get(`/internal-logs?page=${pg}&limit=${LIMIT}`),
        api.get('/internal-logs/stats'),
      ])
      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value.data.data || [])
        setTotal(logsRes.value.data.total || 0)
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchData(page) }, [fetchData, page])

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: '#00f0ff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={20} /> Internal Logs
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Requests from localhost (::1 / 127.0.0.1) — HELIX self-tests & internal traffic
          </p>
        </div>
        <button onClick={() => fetchData(page)} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)', color: '#00f0ff', fontSize: '12px', fontWeight: '600' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '14px' }}>
          {[
            { label: 'Total Internal', value: stats.total, color: '#00f0ff' },
            { label: 'SQLi Detected', value: stats.sqli, color: '#ff3b3b' },
            { label: 'XSS Detected', value: stats.xss, color: '#f59e0b' },
            { label: 'Path Traversal', value: stats.traversal, color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card-strong)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: s.color, fontFamily: 'Orbitron, sans-serif' }}>{s.value ?? '—'}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--card-strong)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>Internal Requests</h3>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{total} total</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Time', 'IP', 'Method', 'Path', 'Attack Type', 'Severity', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600', fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  {loading ? 'Loading...' : 'No internal logs found.'}
                </td></tr>
              )}
              {logs.map((log, i) => (
                <tr key={log._id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 16px', color: 'var(--muted)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '11px' }}>
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#00f0ff' }}>{log.ip}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>{log.method || '—'}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: 'var(--text)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.path || log.endpoint || '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {log.attackType ? (
                      <span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', background: 'rgba(255,59,59,0.1)', color: '#ff3b3b' }}>
                        {log.attackType}
                      </span>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {log.severity ? (
                      <span style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', background: `${SEV_COLORS[log.severity] || '#888'}18`, color: SEV_COLORS[log.severity] || '#888' }}>
                        {log.severity}
                      </span>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 16px', color: log.statusCode >= 400 ? '#ff3b3b' : '#44d17a', fontFamily: 'monospace' }}>
                    {log.statusCode || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', fontSize: '12px' }}>
              Prev
            </button>
            <span style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--muted)' }}>
              Page {page} / {Math.ceil(total / LIMIT)}
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / LIMIT)}
              style={{ padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', fontSize: '12px' }}>
              Next
            </button>
          </div>
        )}
      </div>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
