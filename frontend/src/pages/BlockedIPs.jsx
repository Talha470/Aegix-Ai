import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { ShieldOff, Plus, Trash2, Search, RefreshCw, Download, AlertTriangle, CheckCircle, Globe } from 'lucide-react'

const SOURCE_COLORS = {
  MANUAL: '#00f0ff',
  ABUSEIPDB: '#f59e0b',
  AUTO_ML: '#a78bfa',
  FAIL2BAN: '#34d399'
}

export default function BlockedIPs() {
  const [ips, setIPs] = useState([])
  const [stats, setStats] = useState({ total: 0, manual: 0, abuseipdb: 0, autoMl: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 20

  // Add IP modal state
  const [showAdd, setShowAdd] = useState(false)
  const [newIP, setNewIP] = useState('')
  const [newReason, setNewReason] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addMsg, setAddMsg] = useState(null)

  // AbuseIPDB check state
  const [checkIP, setCheckIP] = useState('')
  const [checkResult, setCheckResult] = useState(null)
  const [checkLoading, setCheckLoading] = useState(false)

  // Fetch blacklist from AbuseIPDB
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchResult, setFetchResult] = useState(null)

  const fetchIPs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      if (search) params.search = search
      if (sourceFilter) params.source = sourceFilter
      const { data } = await api.get('/blocked-ips', { params })
      setIPs(data.data)
      setTotal(data.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, search, sourceFilter])

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/blocked-ips/stats')
      setStats(data.data)
    } catch (e) {}
  }, [])

  useEffect(() => { fetchIPs(); fetchStats() }, [fetchIPs, fetchStats])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newIP.trim()) return
    setAddLoading(true); setAddMsg(null)
    try {
      await api.post('/blocked-ips', { ip: newIP.trim(), reason: newReason || 'Manual block' })
      setAddMsg({ type: 'success', text: `IP ${newIP} blocked successfully` })
      setNewIP(''); setNewReason('')
      fetchIPs(); fetchStats()
    } catch (err) {
      setAddMsg({ type: 'error', text: err.response?.data?.message || 'Failed to block IP' })
    } finally {
      setAddLoading(false)
    }
  }

  async function handleRemove(id, ip) {
    if (!confirm(`Unblock IP: ${ip}?`)) return
    try {
      await api.delete(`/blocked-ips/${id}`)
      fetchIPs(); fetchStats()
    } catch (e) {
      alert('Failed to remove: ' + (e.response?.data?.message || e.message))
    }
  }

  async function handleCheck(e) {
    e.preventDefault()
    if (!checkIP.trim()) return
    setCheckLoading(true); setCheckResult(null)
    try {
      const { data } = await api.post('/blocked-ips/check-abuseipdb', { ip: checkIP.trim() })
      setCheckResult(data.data)
    } catch (err) {
      setCheckResult({ error: err.response?.data?.message || 'Check failed' })
    } finally {
      setCheckLoading(false)
    }
  }

  async function handleFetchAbuseIPDB() {
    if (!confirm('Fetch top malicious IPs from AbuseIPDB and auto-block them?')) return
    setFetchLoading(true); setFetchResult(null)
    try {
      const { data } = await api.post('/blocked-ips/fetch-abuseipdb', { confidenceMin: 90, limit: 100 })
      setFetchResult(data)
      fetchIPs(); fetchStats()
    } catch (err) {
      setFetchResult({ error: err.response?.data?.message || 'Fetch failed' })
    } finally {
      setFetchLoading(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ display: 'grid', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: 'var(--text)', margin: 0 }}>
            Blocked IP List
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Manage blocked IPs — manual, AbuseIPDB, and ML-detected threats
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => { fetchIPs(); fetchStats() }}
            style={btnStyle('rgba(0,240,255,0.1)', '#00f0ff')}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleFetchAbuseIPDB} disabled={fetchLoading}
            style={btnStyle('rgba(245,158,11,0.1)', '#f59e0b')}>
            <Download size={14} /> {fetchLoading ? 'Fetching...' : 'Fetch AbuseIPDB'}
          </button>
          <button onClick={() => { setShowAdd(!showAdd); setAddMsg(null) }}
            style={btnStyle('rgba(0,240,255,0.15)', '#00f0ff', true)}>
            <Plus size={14} /> Block IP
          </button>
        </div>
      </div>

      {/* Fetch result banner */}
      {fetchResult && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px',
          background: fetchResult.error ? 'rgba(255,107,107,0.1)' : 'rgba(68,209,122,0.1)',
          border: `1px solid ${fetchResult.error ? 'rgba(255,107,107,0.3)' : 'rgba(68,209,122,0.3)'}`,
          color: fetchResult.error ? '#ff6b6b' : '#44d17a',
          fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {fetchResult.error
            ? <><AlertTriangle size={14} /> {fetchResult.error}</>
            : <><CheckCircle size={14} /> Added: {fetchResult.added} | Skipped (already blocked): {fetchResult.skipped} | Total fetched: {fetchResult.total}</>
          }
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Total Blocked', value: stats.total, color: '#00f0ff' },
          { label: 'Manual', value: stats.manual, color: '#00f0ff' },
          { label: 'AbuseIPDB', value: stats.abuseipdb, color: '#f59e0b' },
          { label: 'Auto ML', value: stats.autoMl, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, fontFamily: 'Orbitron, sans-serif' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add IP Form */}
      {showAdd && (
        <div style={{ ...cardStyle, border: '1px solid rgba(0,240,255,0.25)' }}>
          <h3 style={{ fontSize: '14px', color: '#00f0ff', margin: '0 0 14px' }}>Block New IP</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={labelStyle}>IP Address *</label>
              <input value={newIP} onChange={e => setNewIP(e.target.value)}
                placeholder="e.g. 192.168.1.1"
                style={inputStyle} required />
            </div>
            <div style={{ flex: '2 1 260px' }}>
              <label style={labelStyle}>Reason</label>
              <input value={newReason} onChange={e => setNewReason(e.target.value)}
                placeholder="e.g. Brute force attempt"
                style={inputStyle} />
            </div>
            <button type="submit" disabled={addLoading}
              style={{ ...btnStyle('rgba(0,240,255,0.15)', '#00f0ff', true), height: '38px', alignSelf: 'flex-end' }}>
              {addLoading ? 'Blocking...' : 'Block IP'}
            </button>
          </form>
          {addMsg && (
            <div style={{
              marginTop: '10px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
              background: addMsg.type === 'success' ? 'rgba(68,209,122,0.1)' : 'rgba(255,107,107,0.1)',
              color: addMsg.type === 'success' ? '#44d17a' : '#ff6b6b',
              border: `1px solid ${addMsg.type === 'success' ? 'rgba(68,209,122,0.3)' : 'rgba(255,107,107,0.3)'}`
            }}>
              {addMsg.text}
            </div>
          )}
        </div>
      )}

      {/* AbuseIPDB Single Check */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '14px', color: '#f59e0b', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={16} /> AbuseIPDB Reputation Check
        </h3>
        <form onSubmit={handleCheck} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Check IP Reputation</label>
            <input value={checkIP} onChange={e => setCheckIP(e.target.value)}
              placeholder="Enter IP to check..."
              style={inputStyle} />
          </div>
          <button type="submit" disabled={checkLoading}
            style={{ ...btnStyle('rgba(245,158,11,0.1)', '#f59e0b'), height: '38px', alignSelf: 'flex-end' }}>
            {checkLoading ? 'Checking...' : 'Check'}
          </button>
        </form>
        {checkResult && !checkResult.error && (
          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            {[
              { label: 'IP Address', value: checkResult.ipAddress },
              { label: 'Abuse Score', value: `${checkResult.abuseConfidenceScore}%`, color: checkResult.abuseConfidenceScore > 50 ? '#ff6b6b' : '#44d17a' },
              { label: 'Country', value: checkResult.countryCode || 'N/A' },
              { label: 'Total Reports', value: checkResult.totalReports },
              { label: 'ISP', value: checkResult.isp || 'N/A' },
              { label: 'Usage Type', value: checkResult.usageType || 'N/A' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: item.color || 'var(--text)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}
        {checkResult?.error && (
          <div style={{ marginTop: '10px', color: '#ff6b6b', fontSize: '12px' }}>{checkResult.error}</div>
        )}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search IP..."
            style={{ ...inputStyle, paddingLeft: '34px' }} />
        </div>
        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1) }}
          style={{ ...inputStyle, flex: '0 1 160px' }}>
          <option value="">All Sources</option>
          <option value="MANUAL">Manual</option>
          <option value="ABUSEIPDB">AbuseIPDB</option>
          <option value="AUTO_ML">Auto ML</option>
          <option value="FAIL2BAN">Fail2Ban</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,240,255,0.1)', background: 'rgba(0,240,255,0.04)' }}>
                {['IP Address', 'Source', 'Reason', 'Abuse Score', 'Country', 'Blocked At', 'Blocked By', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted)', fontWeight: '600', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading...</td></tr>
              ) : ips.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  <ShieldOff size={32} style={{ opacity: 0.3, marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                  No blocked IPs found
                </td></tr>
              ) : ips.map(item => (
                <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#00f0ff', fontWeight: '600' }}>
                    {item.ip}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                      color: SOURCE_COLORS[item.source] || '#00f0ff',
                      background: `${SOURCE_COLORS[item.source] || '#00f0ff'}18`
                    }}>
                      {item.source}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.reason}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {item.abuseConfidenceScore > 0 ? (
                      <span style={{ color: item.abuseConfidenceScore > 50 ? '#ff6b6b' : '#44d17a', fontWeight: '600' }}>
                        {item.abuseConfidenceScore}%
                      </span>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>
                    {item.countryCode || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '11px' }}>
                    {new Date(item.blockedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>
                    {item.blockedBy}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => handleRemove(item._id, item.ip)}
                      style={{
                        background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)',
                        borderRadius: '8px', color: '#ff6b6b', cursor: 'pointer', padding: '6px 10px',
                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}>
                      <Trash2 size={13} /> Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={pageBtn(page === 1)}>Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={pageBtn(page === totalPages)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Styles
const cardStyle = {
  background: 'var(--card-strong)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '20px'
}
const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s'
}
const labelStyle = {
  display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '5px', fontWeight: '500'
}
function btnStyle(bg, color, strong = false) {
  return {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
    background: strong ? `linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,102,255,0.15))` : bg,
    border: `1px solid ${color}33`,
    color, fontSize: '12px', fontWeight: '600',
    transition: 'all 0.2s', whiteSpace: 'nowrap'
  }
}
function pageBtn(disabled) {
  return {
    padding: '5px 12px', borderRadius: '8px', fontSize: '12px', cursor: disabled ? 'default' : 'pointer',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    color: disabled ? 'var(--muted)' : 'var(--text)', opacity: disabled ? 0.5 : 1
  }
}
