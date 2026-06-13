import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { RefreshCw, Play, Wrench, ShieldCheck, AlertTriangle, FileSearch, Cpu, Database } from 'lucide-react'

const SEV_COLORS = { CRITICAL: '#ff3b3b', HIGH: '#f59e0b', MEDIUM: '#00f0ff', LOW: '#44d17a', INFO: '#a78bfa' }
const STATUS_COLORS = { CLEAN: '#44d17a', HIGH: '#f59e0b', CRITICAL: '#ff3b3b' }

export default function HelixNexus() {
  const [report, setReport] = useState(null)
  const [nexus, setNexus] = useState(null)
  const [healLog, setHealLog] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [healLoading, setHealLoading] = useState(false)
  const [baselineLoading, setBaselineLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('report')
  const [msg, setMsg] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const [rRes, nRes, lRes] = await Promise.allSettled([
        api.get('/helix/report'),
        api.get('/helix/nexus-summary'),
        api.get('/helix/heal-log'),
      ])
      if (rRes.status === 'fulfilled') setReport(rRes.value.data.data)
      if (nRes.status === 'fulfilled') setNexus(nRes.value.data.data)
      if (lRes.status === 'fulfilled') setHealLog(lRes.value.data.data || '')
    } catch (e) {}
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function runScan() {
    setScanLoading(true); setMsg(null)
    try {
      const { data } = await api.post('/helix/scan')
      setMsg({ type: 'info', text: `Scan complete — Status: ${data.data?.status || 'DONE'} | Findings: ${data.data?.total_findings ?? '?'}` })
      fetchAll()
    } catch (e) {
      setMsg({ type: 'error', text: 'Scan failed: ' + (e.response?.data?.message || e.message) })
    } finally {
      setScanLoading(false) }
  }

  async function runHeal() {
    setHealLoading(true); setMsg(null)
    try {
      const { data } = await api.post('/helix/heal')
      setMsg({ type: 'success', text: `NEXUS healed: ${data.data?.total_healed ?? 0} items | Failed: ${data.data?.total_failed ?? 0}` })
      fetchAll()
    } catch (e) {
      setMsg({ type: 'error', text: 'Heal failed: ' + (e.response?.data?.message || e.message) })
    } finally {
      setHealLoading(false) }
  }

  async function genBaseline() {
    setBaselineLoading(true); setMsg(null)
    try {
      const { data } = await api.post('/helix/baseline')
      setMsg({ type: 'success', text: data.message })
    } catch (e) {
      setMsg({ type: 'error', text: 'Baseline failed: ' + (e.response?.data?.message || e.message) })
    } finally {
      setBaselineLoading(false) }
  }

  const summary = report?.summary
  const allFindings = report ? [
    ...(report.file_integrity || []),
    ...(report.config_issues || []),
    ...(report.server_checks || []),
  ] : []
  const codeVulns = report?.code_vulnerabilities || []

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: '#44d17a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={20} /> HELIX + NEXUS
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Self-healing security system — file integrity + process monitoring + auto-recovery
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={genBaseline} disabled={baselineLoading}
            style={btnStyle('rgba(167,139,250,0.1)', '#a78bfa')}>
            <Database size={14} /> {baselineLoading ? 'Creating...' : 'Gen Baseline'}
          </button>
          <button onClick={runScan} disabled={scanLoading}
            style={btnStyle('rgba(0,240,255,0.1)', '#00f0ff')}>
            <Play size={14} /> {scanLoading ? 'Scanning...' : 'Run HELIX Scan'}
          </button>
          <button onClick={runHeal} disabled={healLoading}
            style={btnStyle('rgba(68,209,122,0.1)', '#44d17a', true)}>
            <Wrench size={14} /> {healLoading ? 'Healing...' : 'Run NEXUS Heal'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px', fontSize: '13px',
          background: msg.type === 'error' ? 'rgba(255,59,59,0.1)' : msg.type === 'success' ? 'rgba(68,209,122,0.1)' : 'rgba(0,240,255,0.1)',
          border: `1px solid ${msg.type === 'error' ? 'rgba(255,59,59,0.3)' : msg.type === 'success' ? 'rgba(68,209,122,0.3)' : 'rgba(0,240,255,0.3)'}`,
          color: msg.type === 'error' ? '#ff3b3b' : msg.type === 'success' ? '#44d17a' : '#00f0ff',
        }}>{msg.text}</div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '14px' }}>
        {[
          { label: 'System Status', value: summary?.status || 'NOT SCANNED', color: STATUS_COLORS[summary?.status] || 'var(--muted)' },
          { label: 'Total Findings', value: summary?.total_findings ?? '—', color: '#00f0ff' },
          { label: 'Critical', value: summary?.critical ?? '—', color: '#ff3b3b' },
          { label: 'High', value: summary?.high ?? '—', color: '#f59e0b' },
          { label: 'Items Healed', value: nexus?.total_healed ?? '—', color: '#44d17a' },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, fontFamily: 'Orbitron, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
        {[
          { id: 'report', label: 'System Checks' },
          { id: 'vulns', label: `Code Vulns${codeVulns.length ? ` (${codeVulns.length})` : ''}` },
          { id: 'nexus', label: 'NEXUS Actions' },
          { id: 'log',   label: 'Heal Log' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #44d17a' : '2px solid transparent',
              color: activeTab === tab.id ? '#44d17a' : 'var(--muted)',
              fontSize: '13px', fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'report' && (
        <div style={{ display: 'grid', gap: '14px' }}>
          {!report && (
            <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>
              No scan data. Click "Run HELIX Scan" to start.
            </div>
          )}
          {allFindings.length > 0 && (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>Findings</h3>
              </div>
              {allFindings.map((f, i) => (
                <div key={i} style={{
                  padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'flex-start', gap: '14px'
                }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                    background: `${SEV_COLORS[f.severity] || '#888'}18`,
                    color: SEV_COLORS[f.severity] || '#888', whiteSpace: 'nowrap', flexShrink: 0
                  }}>{f.severity}</span>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '600' }}>{f.type}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{f.message}</div>
                    {f.file && <div style={{ fontSize: '11px', color: '#00f0ff', marginTop: '2px', fontFamily: 'monospace' }}>{f.file}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {report && allFindings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '30px', border: '1px solid rgba(68,209,122,0.25)' }}>
              <ShieldCheck size={32} color="#44d17a" style={{ marginBottom: '8px' }} />
              <div style={{ color: '#44d17a', fontWeight: '700', fontFamily: 'Orbitron, sans-serif' }}>System CLEAN</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                Scanned at: {report.scan_time ? new Date(report.scan_time).toLocaleString() : '—'}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'vulns' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {codeVulns.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>
              {report ? 'No code vulnerabilities found.' : 'Run HELIX Scan first.'}
            </div>
          )}
          {codeVulns.length > 0 && (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>Code Vulnerabilities</h3>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{report?.files_scanned ?? 0} files scanned</span>
              </div>
              {codeVulns.map((v, i) => (
                <div key={i} style={{
                  padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px', alignItems: 'start'
                }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                    background: `${SEV_COLORS[v.severity] || '#888'}18`,
                    color: SEV_COLORS[v.severity] || '#888', whiteSpace: 'nowrap'
                  }}>{v.severity}</span>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: '#a78bfa', fontSize: '11px', fontFamily: 'monospace' }}>[{v.type}]</span>
                      {v.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#00f0ff', marginTop: '2px', fontFamily: 'monospace' }}>
                      {v.file}:{v.line}
                    </div>
                    {v.snippet && (
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {v.snippet}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>{v.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'nexus' && (
        <div style={cardStyle}>
          {!nexus ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '30px' }}>No healing actions yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Last healed: {nexus.healed_at ? new Date(nexus.healed_at).toLocaleString() : '—'}
              </div>
              {nexus.healed?.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', background: 'rgba(68,209,122,0.06)', border: '1px solid rgba(68,209,122,0.15)' }}>
                  <ShieldCheck size={14} color="#44d17a" />
                  <span style={{ fontSize: '13px', color: '#44d17a' }}>{item}</span>
                </div>
              ))}
              {nexus.failed?.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', background: 'rgba(255,59,59,0.06)', border: '1px solid rgba(255,59,59,0.15)' }}>
                  <AlertTriangle size={14} color="#ff3b3b" />
                  <span style={{ fontSize: '13px', color: '#ff3b3b' }}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'log' && (
        <div style={{ ...cardStyle, padding: '16px' }}>
          <pre style={{ margin: 0, fontSize: '11px', color: '#44d17a', fontFamily: 'monospace', lineHeight: '1.8', whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto' }}>
            {healLog || 'No heal log yet.'}
          </pre>
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
function btnStyle(bg, color, strong = false) {
  return {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
    background: strong ? `linear-gradient(135deg, rgba(68,209,122,0.2), rgba(0,240,255,0.1))` : bg,
    border: `1px solid ${color}33`, color,
    fontSize: '12px', fontWeight: '600', transition: 'all 0.2s'
  }
}
