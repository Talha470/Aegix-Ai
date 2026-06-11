import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { RefreshCw, FileText, ShieldCheck, Award, Activity, AlertTriangle } from 'lucide-react'
import { RadialBarChart, RadialBar, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'

const CVSS_COLORS = { CRITICAL: '#ff3b3b', HIGH: '#f59e0b', MEDIUM: '#00f0ff', LOW: '#44d17a', NONE: '#888' }
const MITRE_TACTIC_COLORS = ['#00f0ff', '#a78bfa', '#f59e0b', '#ff3b3b', '#44d17a', '#34d399', '#f87171']

export default function Compliance() {
  const [dash, setDash] = useState(null)
  const [audit, setAudit] = useState([])
  const [cvss, setCvss] = useState([])
  const [ieee, setIEEE] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [d, a, c, i] = await Promise.allSettled([
        api.get('/compliance/dashboard'),
        api.get('/compliance/audit-trail'),
        api.get('/compliance/cvss-report'),
        api.get('/compliance/ieee-report'),
      ])
      if (d.status === 'fulfilled') setDash(d.value.data.data)
      if (a.status === 'fulfilled') setAudit(a.value.data.data || [])
      if (c.status === 'fulfilled') setCvss(c.value.data.data || [])
      if (i.status === 'fulfilled') setIEEE(i.value.data.data)
    } catch (e) {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const radialData = dash ? [
    { name: 'DevSecOps', value: dash.devsecops_score, fill: '#00f0ff' },
    { name: 'ISO 27001', value: dash.iso27001_score, fill: '#a78bfa' },
    { name: 'MITRE', value: dash.mitre_coverage, fill: '#f59e0b' },
  ] : []

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: '#a78bfa', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={20} /> Compliance Module
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            ISO 27001 · ISO 30111 · IEEE 1012/2675 · MITRE ATT&CK · CVSS
          </p>
        </div>
        <button onClick={fetchAll} disabled={loading} style={btnStyle('rgba(167,139,250,0.1)', '#a78bfa')}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Score Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '14px' }}>
        {[
          { label: 'IEEE 2675 DevSecOps', value: dash?.devsecops_score ?? '—', color: '#00f0ff', suffix: '%' },
          { label: 'ISO 27001 InfoSec', value: dash?.iso27001_score ?? '—', color: '#a78bfa', suffix: '%' },
          { label: 'MITRE ATT&CK Coverage', value: dash?.mitre_coverage ?? '—', color: '#f59e0b', suffix: '%' },
          { label: 'Total Attacks Logged', value: dash?.total_attacks ?? '—', color: '#ff3b3b', suffix: '' },
          { label: 'Attacks Blocked', value: dash?.blocked_attacks ?? '—', color: '#44d17a', suffix: '' },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ fontSize: '26px', fontWeight: '700', color: s.color, fontFamily: 'Orbitron, sans-serif' }}>
              {loading ? '...' : s.value}{s.suffix && s.value !== '—' ? s.suffix : ''}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {['dashboard', 'mitre', 'cvss', 'audit', 'ieee'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #a78bfa' : '2px solid transparent',
              color: activeTab === tab ? '#a78bfa' : 'var(--muted)',
              fontSize: '12px', fontWeight: activeTab === tab ? '600' : '400',
              textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s'
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Radial Score Chart */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Compliance Scores
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData}>
                <RadialBar background dataKey="value" cornerRadius={6} label={{ position: 'insideStart', fill: 'var(--muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={v => `${v}%`} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {radialData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
                  {d.name}: <strong style={{ color: d.fill }}>{d.value}%</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Standards info */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Compliance Frameworks
            </h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {[
                { std: 'ISO 27001', desc: 'Information Security Management', status: 'ALIGNED', color: '#44d17a' },
                { std: 'ISO 30111', desc: 'Vulnerability Handling Process', status: 'IMPLEMENTED', color: '#44d17a' },
                { std: 'IEEE 1012', desc: 'Verification & Validation', status: 'ACTIVE', color: '#00f0ff' },
                { std: 'IEEE 2675', desc: 'DevSecOps Standard', status: 'ACTIVE', color: '#00f0ff' },
                { std: 'MITRE ATT&CK', desc: 'Threat Intelligence Framework', status: `${dash?.mitre_coverage ?? 0}% coverage`, color: '#f59e0b' },
                { std: 'CVSS v3.1', desc: 'Vulnerability Scoring', status: 'ENABLED', color: '#a78bfa' },
              ].map(item => (
                <div key={item.std} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>{item.std}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.desc}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: item.color, padding: '2px 8px', borderRadius: '6px', background: `${item.color}18` }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MITRE Tab */}
      {activeTab === 'mitre' && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', color: 'var(--text)', margin: '0 0 16px' }}>MITRE ATT&CK Technique Mapping</h3>
          {dash?.mitre_techniques?.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '30px' }}>No attack data yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                    {['Attack Type', 'MITRE ID', 'Technique', 'Tactic', 'CVSS', 'Count'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--muted)', fontSize: '11px', fontWeight: '600' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(dash?.mitre_techniques || []).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text)' }}>{row.attackType}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#a78bfa' }}>{row.technique.id}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{row.technique.name}</td>
                      <td style={{ padding: '10px 14px', color: '#00f0ff' }}>{row.technique.tactic}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: CVSS_COLORS[row.cvss_severity], fontWeight: '700' }}>{row.cvss}</span>
                        <span style={{ color: 'var(--muted)', fontSize: '10px', marginLeft: '4px' }}>({row.cvss_severity})</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: '600' }}>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CVSS Tab */}
      {activeTab === 'cvss' && (
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>CVSS Scores by Attack Type</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    {['Attack Type', 'CVSS Score', 'Severity', 'MITRE ID', 'Occurrences', 'Unique IPs', 'Block Rate'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--muted)', fontSize: '11px', fontWeight: '600' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cvss.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text)' }}>{row.attack_type}</td>
                      <td style={{ padding: '10px 14px', fontWeight: '700', color: CVSS_COLORS[row.cvss_severity] }}>{row.cvss_score}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: `${CVSS_COLORS[row.cvss_severity]}18`, color: CVSS_COLORS[row.cvss_severity] }}>
                          {row.cvss_severity}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#a78bfa', fontSize: '11px' }}>{row.mitre?.id || '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text)' }}>{row.count}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{row.unique_ips}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '50px', height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }}>
                            <div style={{ width: `${row.block_rate}%`, height: '100%', borderRadius: '4px', background: row.block_rate > 70 ? '#44d17a' : '#f59e0b' }} />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{row.block_rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>ISO 27001 Tamper-Proof Audit Trail</h3>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Showing last 50 events</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  {['ISO Event ID', 'Timestamp', 'Event', 'MITRE', 'CVSS', 'Source IP', 'Status', 'Remediation'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--muted)', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit.slice(0, 50).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '10px', color: '#a78bfa' }}>{String(row.iso_event_id).slice(-12)}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{new Date(row.timestamp).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--text)' }}>{row.event_type}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '10px', color: '#a78bfa' }}>{row.mitre_technique?.id || '—'}</td>
                    <td style={{ padding: '8px 12px', color: CVSS_COLORS[row.cvss_severity], fontWeight: '600' }}>{row.cvss_score ?? '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#00f0ff', fontSize: '11px' }}>{row.source_ip}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600',
                        background: row.status === 'BLOCKED' ? 'rgba(255,59,59,0.12)' : 'rgba(245,158,11,0.12)',
                        color: row.status === 'BLOCKED' ? '#ff3b3b' : '#f59e0b'
                      }}>{row.status}</span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontSize: '10px', color: row.remediation_status === 'MITIGATED' ? '#44d17a' : '#f59e0b' }}>
                        {row.remediation_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* IEEE Tab */}
      {activeTab === 'ieee' && ieee && (
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '14px', color: '#00f0ff', margin: '0 0 16px' }}>
              {ieee.standard} — Verification Report
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
              Generated: {new Date(ieee.generated_at).toLocaleString()} | System: {ieee.system} v{ieee.version}
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {ieee.verification_items?.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--muted)', minWidth: '60px' }}>{item.id}</span>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)' }}>{item.check}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px',
                    background: item.status === 'PASS' ? 'rgba(68,209,122,0.12)' : item.status === 'WARN' ? 'rgba(245,158,11,0.12)' : 'rgba(0,240,255,0.12)',
                    color: item.status === 'PASS' ? '#44d17a' : item.status === 'WARN' ? '#f59e0b' : '#00f0ff'
                  }}>{item.status}</span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', minWidth: '200px', textAlign: 'right' }}>{item.detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: '13px', color: '#a78bfa', margin: '0 0 12px' }}>IEEE 2675 — DevSecOps Pipeline</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {ieee.devsecops?.security_gates?.map((gate, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text)' }}>
                  <ShieldCheck size={14} color="#44d17a" />{gate}
                </div>
              ))}
            </div>
          </div>
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
function btnStyle(bg, color) {
  return {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
    background: bg, border: `1px solid ${color}33`, color,
    fontSize: '12px', fontWeight: '600', transition: 'all 0.2s'
  }
}
