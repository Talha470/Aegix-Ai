import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { RefreshCw, Search, Shield, Globe, Zap, AlertTriangle, Radio } from 'lucide-react'

export default function ThreatIntel() {
  const [feed, setFeed] = useState(null)
  const [blacklist, setBlacklist] = useState([])
  const [pulses, setPulses] = useState([])
  const [checkIP, setCheckIP] = useState('')
  const [checkResult, setCheckResult] = useState(null)
  const [checkLoading, setCheckLoading] = useState(false)
  const [autoBlockIPs, setAutoBlockIPs] = useState('')
  const [autoBlockResult, setAutoBlockResult] = useState(null)
  const [autoBlockLoading, setAutoBlockLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('feed')
  const [loading, setLoading] = useState(true)

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/threat-intel/feed')
      setFeed(data.data)
    } catch (e) {}
    finally { setLoading(false) }
  }, [])

  const fetchBlacklist = useCallback(async () => {
    try {
      const { data } = await api.get('/threat-intel/abuseipdb/blacklist?confidence=85&limit=50')
      setBlacklist(data.data || [])
    } catch (e) {}
  }, [])

  const fetchPulses = useCallback(async () => {
    try {
      const { data } = await api.get('/threat-intel/otx/pulses')
      setPulses(data.data || [])
    } catch (e) {}
  }, [])

  useEffect(() => {
    fetchFeed()
    if (activeTab === 'blacklist') fetchBlacklist()
    if (activeTab === 'otx') fetchPulses()
  }, [activeTab, fetchFeed, fetchBlacklist, fetchPulses])

  async function handleCheck(e) {
    e.preventDefault()
    if (!checkIP.trim()) return
    setCheckLoading(true); setCheckResult(null)
    try {
      const { data } = await api.get(`/threat-intel/abuseipdb/check?ip=${checkIP.trim()}`)
      setCheckResult(data.data)
    } catch (err) {
      setCheckResult({ error: err.response?.data?.message || 'Check failed' })
    } finally { setCheckLoading(false) }
  }

  async function handleAutoBlock(e) {
    e.preventDefault()
    const ips = autoBlockIPs.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean)
    if (!ips.length) return
    setAutoBlockLoading(true); setAutoBlockResult(null)
    try {
      const { data } = await api.post('/threat-intel/auto-block', { ips })
      setAutoBlockResult(data.results)
      fetchFeed()
    } catch (err) {
      setAutoBlockResult({ error: err.response?.data?.message || 'Auto-block failed' })
    } finally { setAutoBlockLoading(false) }
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={20} /> Threat Intelligence
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            AbuseIPDB + AlienVault OTX — Real-time threat feeds
          </p>
        </div>
        <button onClick={fetchFeed} disabled={loading} style={btnStyle('rgba(245,158,11,0.1)', '#f59e0b')}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* API Status + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '14px' }}>
        {[
          { label: 'Total Blocked IPs', value: feed?.summary?.total_blocked ?? '—', color: '#ff3b3b' },
          { label: 'AbuseIPDB Blocks', value: feed?.summary?.abuseipdb_blocks ?? '—', color: '#f59e0b' },
          { label: 'AbuseIPDB API', value: feed?.apis_configured?.abuseipdb ? 'ACTIVE' : 'NOT SET', color: feed?.apis_configured?.abuseipdb ? '#44d17a' : '#ff3b3b' },
          { label: 'AlienVault OTX', value: feed?.apis_configured?.otx ? 'ACTIVE' : 'NOT SET', color: feed?.apis_configured?.otx ? '#44d17a' : '#ff3b3b' },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, fontFamily: 'Orbitron, sans-serif' }}>{loading ? '...' : s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* API Key Notice */}
      {feed && (!feed.apis_configured?.abuseipdb || !feed.apis_configured?.otx) && (
        <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '12px', color: '#f59e0b' }}>
          <strong>API Keys Required:</strong>{' '}
          {!feed.apis_configured?.abuseipdb && 'ABUSEIPDB_KEY missing. '}
          {!feed.apis_configured?.otx && 'OTX_API_KEY missing. '}
          Add them to docker-compose.yml environment section.
        </div>
      )}

      {/* IP Check */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '14px', color: '#f59e0b', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={16} /> IP Reputation Check (AbuseIPDB)
        </h3>
        <form onSubmit={handleCheck} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}>
            <input value={checkIP} onChange={e => setCheckIP(e.target.value)}
              placeholder="Enter IP address..."
              style={inputStyle} />
          </div>
          <button type="submit" disabled={checkLoading} style={btnStyle('rgba(245,158,11,0.1)', '#f59e0b')}>
            {checkLoading ? 'Checking...' : 'Check IP'}
          </button>
        </form>
        {checkResult && !checkResult.error && (
          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px' }}>
            {[
              { label: 'IP', value: checkResult.ipAddress },
              { label: 'Abuse Score', value: `${checkResult.abuseConfidenceScore}%`, color: checkResult.abuseConfidenceScore > 50 ? '#ff3b3b' : '#44d17a' },
              { label: 'Total Reports', value: checkResult.totalReports },
              { label: 'Country', value: checkResult.countryCode || 'N/A' },
              { label: 'ISP', value: checkResult.isp?.slice(0, 25) || 'N/A' },
              { label: 'Usage Type', value: checkResult.usageType || 'N/A' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: item.color || 'var(--text)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}
        {checkResult?.error && <div style={{ marginTop: '10px', color: '#ff3b3b', fontSize: '12px' }}>{checkResult.error}</div>}
      </div>

      {/* Auto-Block */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '14px', color: '#ff3b3b', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} /> Auto-Block IPs (AbuseIPDB score ≥ 80%)
        </h3>
        <form onSubmit={handleAutoBlock} style={{ display: 'grid', gap: '10px' }}>
          <textarea value={autoBlockIPs} onChange={e => setAutoBlockIPs(e.target.value)}
            placeholder="Enter IPs (one per line, or comma/space separated)..."
            rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }} />
          <button type="submit" disabled={autoBlockLoading} style={{ ...btnStyle('rgba(255,59,59,0.1)', '#ff3b3b'), alignSelf: 'flex-start' }}>
            <Shield size={14} /> {autoBlockLoading ? 'Checking & Blocking...' : 'Check & Auto-Block'}
          </button>
        </form>
        {autoBlockResult && !autoBlockResult.error && (
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
            <div style={miniCard('#44d17a')}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#44d17a' }}>{autoBlockResult.blocked?.length || 0}</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Blocked</div>
            </div>
            <div style={miniCard('#f59e0b')}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>{autoBlockResult.skipped?.length || 0}</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Skipped (score &lt;80)</div>
            </div>
            <div style={miniCard('#ff3b3b')}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#ff3b3b' }}>{autoBlockResult.failed?.length || 0}</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Failed</div>
            </div>
          </div>
        )}
        {autoBlockResult?.error && <div style={{ marginTop: '10px', color: '#ff3b3b', fontSize: '12px' }}>{autoBlockResult.error}</div>}
      </div>

      {/* Tabs: feed | blacklist | OTX */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {['feed', 'blacklist', 'otx'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === tab ? '#f59e0b' : 'var(--muted)',
              fontSize: '12px', fontWeight: activeTab === tab ? '600' : '400',
              textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s'
            }}>
            {tab === 'otx' ? 'AlienVault OTX' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Feed Tab */}
      {activeTab === 'feed' && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>Recently Blocked via AbuseIPDB</h3>
          </div>
          {(feed?.recent_threats || []).length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>No AbuseIPDB-sourced blocks yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  {['IP', 'Country', 'Score', 'ISP', 'Reason', 'Blocked At'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--muted)', fontSize: '10px', fontWeight: '600' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feed.recent_threats.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#ff3b3b' }}>{t.ip}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{t.country || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: t.score > 80 ? '#ff3b3b' : '#f59e0b' }}>{t.score}%</td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.isp || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: '11px' }}>{t.reason?.slice(0, 40)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '11px' }}>{new Date(t.blocked_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Blacklist Tab */}
      {activeTab === 'blacklist' && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>AbuseIPDB Blacklist (score ≥ 85)</h3>
            <button onClick={fetchBlacklist} style={{ ...btnStyle('rgba(245,158,11,0.1)', '#f59e0b'), fontSize: '11px', padding: '6px 12px' }}>
              <RefreshCw size={12} /> Fetch
            </button>
          </div>
          {blacklist.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              Click "Fetch" to load live blacklist from AbuseIPDB.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  {['IP Address', 'Abuse Score', 'Country', 'ISP'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--muted)', fontSize: '10px', fontWeight: '600' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {blacklist.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#ff3b3b' }}>{item.ipAddress}</td>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: item.abuseConfidenceScore > 95 ? '#ff3b3b' : '#f59e0b' }}>{item.abuseConfidenceScore}%</td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{item.countryCode || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: '11px' }}>{item.isp || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* OTX Tab */}
      {activeTab === 'otx' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          <button onClick={fetchPulses} style={{ ...btnStyle('rgba(167,139,250,0.1)', '#a78bfa'), alignSelf: 'flex-start' }}>
            <RefreshCw size={14} /> Fetch OTX Pulses
          </button>
          {pulses.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>
              Click "Fetch OTX Pulses" to load latest threat intelligence from AlienVault OTX.
            </div>
          ) : pulses.map((p, i) => (
            <div key={i} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(p.created).toLocaleDateString()}</div>
              </div>
              {p.description && <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>{p.description}</div>}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {p.adversary && <span style={{ ...tagStyle('#ff3b3b') }}>Adversary: {p.adversary}</span>}
                {p.tlp && <span style={{ ...tagStyle('#f59e0b') }}>TLP: {p.tlp}</span>}
                <span style={{ ...tagStyle('#a78bfa') }}>{p.indicator_count} indicators</span>
                {p.tags?.slice(0, 4).map((tag, j) => <span key={j} style={tagStyle('#00f0ff')}>{tag}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const cardStyle = {
  background: 'var(--card-strong)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '20px'
}
const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
  color: 'var(--text)', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
}
function btnStyle(bg, color) {
  return {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
    background: bg, border: `1px solid ${color}33`, color,
    fontSize: '12px', fontWeight: '600', transition: 'all 0.2s'
  }
}
function miniCard(color) {
  return {
    padding: '12px', borderRadius: '10px', textAlign: 'center',
    background: `${color}0a`, border: `1px solid ${color}20`
  }
}
function tagStyle(color) {
  return {
    padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600',
    background: `${color}18`, color, border: `1px solid ${color}30`
  }
}
