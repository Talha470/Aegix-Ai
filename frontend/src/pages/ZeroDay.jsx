import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { Zap, RefreshCw, ShieldAlert, AlertTriangle, Activity, Brain } from 'lucide-react'

const THREAT_COLORS = {
  'ZERO-DAY': { bg: 'rgba(255,59,59,0.12)', border: 'rgba(255,59,59,0.35)', text: '#ff3b3b' },
  'SUSPICIOUS': { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
  'NORMAL': { bg: 'rgba(68,209,122,0.12)', border: 'rgba(68,209,122,0.3)', text: '#44d17a' },
}

const SEV_COLORS = { CRITICAL: '#ff3b3b', HIGH: '#f59e0b', MEDIUM: '#00f0ff', LOW: '#44d17a' }

export default function ZeroDay() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retraining, setRetraining] = useState(false)
  const [msg, setMsg] = useState(null)

  const fetchAnalysis = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/ml/analyze')
      setData(res)
    } catch (e) {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnalysis() }, [fetchAnalysis])

  async function handleRetrain() {
    setRetraining(true); setMsg(null)
    try {
      await api.post('/ml/retrain')
      setMsg({ type: 'success', text: 'Model retrained successfully with 13 features + ensemble!' })
      fetchAnalysis()
    } catch (e) {
      setMsg({ type: 'error', text: 'Retrain failed: ' + (e.response?.data?.message || e.message) })
    } finally {
      setRetraining(false)
    }
  }

  const anomalies = data?.anomalies || []
  const zeroDays = anomalies.filter(a => a.threat_level === 'ZERO-DAY')
  const suspicious = anomalies.filter(a => a.threat_level === 'SUSPICIOUS')

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: '#ff3b3b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} /> Zero-Day Detection Engine
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Isolation Forest + One-Class SVM ensemble — 13 features
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchAnalysis} disabled={loading}
            style={btnStyle('rgba(0,240,255,0.1)', '#00f0ff')}>
            <RefreshCw size={14} /> Analyze
          </button>
          <button onClick={handleRetrain} disabled={retraining}
            style={btnStyle('rgba(167,139,250,0.1)', '#a78bfa')}>
            <Brain size={14} /> {retraining ? 'Retraining...' : 'Retrain Model'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px', fontSize: '13px',
          background: msg.type === 'success' ? 'rgba(68,209,122,0.1)' : 'rgba(255,59,59,0.1)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(68,209,122,0.3)' : 'rgba(255,59,59,0.3)'}`,
          color: msg.type === 'success' ? '#44d17a' : '#ff3b3b',
        }}>{msg.text}</div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '14px' }}>
        {[
          { label: 'Total Analyzed', value: data?.total_analyzed ?? '—', color: '#00f0ff', icon: <Activity size={16} /> },
          { label: 'Anomalies Found', value: data?.anomalies_detected ?? '—', color: '#f59e0b', icon: <AlertTriangle size={16} /> },
          { label: 'ZERO-DAY Threats', value: data?.zero_day_count ?? zeroDays.length, color: '#ff3b3b', icon: <Zap size={16} /> },
          { label: 'Suspicious', value: suspicious.length, color: '#f59e0b', icon: <ShieldAlert size={16} /> },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '26px', fontWeight: '700', color: s.color, fontFamily: 'Orbitron, sans-serif' }}>
                {loading ? '...' : s.value}
              </div>
              <span style={{ color: s.color, opacity: 0.7 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Model Info */}
      <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Algorithm</div>
          <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '600' }}>Isolation Forest + One-Class SVM</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Features</div>
          <div style={{ fontSize: '13px', color: '#00f0ff', fontWeight: '600' }}>13 (URL entropy, bot indicator, payload size…)</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>ZERO-DAY Threshold</div>
          <div style={{ fontSize: '13px', color: '#ff3b3b', fontWeight: '600' }}>Both models agree &gt; 80% confidence</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Auto-Block</div>
          <div style={{ fontSize: '13px', color: '#44d17a', fontWeight: '600' }}>Enabled (confidence &gt; 80%)</div>
        </div>
      </div>

      {/* Anomaly Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,240,255,0.08)' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>Detected Anomalies</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,240,255,0.08)', background: 'rgba(0,240,255,0.03)' }}>
                {['Threat Level', 'IP', 'Endpoint', 'Attack Type', 'Severity', 'ML Score', 'Confidence'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', color: 'var(--muted)', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Analyzing logs...</td></tr>
              ) : anomalies.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>No anomalies detected — system clean</td></tr>
              ) : anomalies.map((a, i) => {
                const tc = THREAT_COLORS[a.threat_level] || THREAT_COLORS.NORMAL
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                        background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text,
                        letterSpacing: '0.05em'
                      }}>
                        {a.threat_level === 'ZERO-DAY' ? '⚡ ZERO-DAY' : a.threat_level}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#00f0ff', fontSize: '12px' }}>{a.ip}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.endpoint}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>{a.attackType}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: SEV_COLORS[a.severity] || '#00f0ff', fontWeight: '600', fontSize: '12px' }}>{a.severity}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted)' }}>{a.ml_score}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', minWidth: '60px' }}>
                          <div style={{ width: `${a.confidence}%`, height: '100%', borderRadius: '4px', background: a.confidence > 80 ? '#ff3b3b' : a.confidence > 50 ? '#f59e0b' : '#44d17a' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{a.confidence}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
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
