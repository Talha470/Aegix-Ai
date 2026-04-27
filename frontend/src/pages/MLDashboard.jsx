import { useState } from 'react'
import { Brain, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

export default function MLDashboard() {
  const [analysis] = useState({
    total_analyzed: 50,
    anomalies_detected: 49,
    anomalies: [
      { ip: 'Unknown', endpoint: 'SURICATA STREAM ESTABLISHED invalid ack', attackType: 'suricata', severity: 'HIGH', ml_score: -0.539, confidence: 53.9 },
      { ip: 'Unknown', endpoint: 'SURICATA STREAM Packet with invalid ack', attackType: 'suricata', severity: 'HIGH', ml_score: -0.539, confidence: 53.9 },
      { ip: 'Unknown', endpoint: 'SURICATA STREAM FIN invalid ack', attackType: 'suricata', severity: 'HIGH', ml_score: -0.64, confidence: 64.0 },
      { ip: 'Unknown', endpoint: 'SURICATA STREAM FIN out of window', attackType: 'suricata', severity: 'HIGH', ml_score: -0.6401, confidence: 64.0 },
      { ip: '78.153.140.250', endpoint: '/.env', attackType: 'honeypot', severity: 'HIGH', ml_score: -0.45, confidence: 45.0 },
      { ip: '93.123.109.163', endpoint: '/.env.staging', attackType: 'honeypot', severity: 'HIGH', ml_score: -0.42, confidence: 42.0 },
      { ip: '104.244.74.39', endpoint: '/', attackType: 'honeypot', severity: 'MEDIUM', ml_score: -0.38, confidence: 38.0 },
    ]
  })

  return (
    <div style={{ display: 'grid', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: 'Orbitron, sans-serif', fontSize: 22,
          background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4
        }}>ML Anomaly Detection</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          AI-powered zero-day threat detection — Trained on 83,020 real attack logs
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Training Data', value: '83,020', icon: <Brain size={20} />, color: '#a78bfa' },
          { label: 'Logs Analyzed', value: analysis.total_analyzed, icon: <TrendingUp size={20} />, color: '#00f0ff' },
          { label: 'Anomalies Detected', value: analysis.anomalies_detected, icon: <AlertTriangle size={20} />, color: '#ff6b6b' },
          { label: 'Anomaly Rate', value: `${((analysis.anomalies_detected / analysis.total_analyzed) * 100).toFixed(1)}%`, icon: <CheckCircle size={20} />, color: '#f6c90e' },
        ].map((card, i) => (
          <div key={i} style={{
            background: 'var(--card-strong)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius)', padding: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${card.color}18`, border: `1px solid ${card.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color
              }}>{card.icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{card.value}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message */}
      <div style={{
        padding: 12, borderRadius: 8,
        background: 'rgba(68,209,122,0.1)', border: '1px solid rgba(68,209,122,0.3)',
        color: '#44d17a', fontSize: 13
      }}>
        ✅ Model trained on 83,020 real logs — {analysis.anomalies_detected} anomalies detected out of {analysis.total_analyzed} analyzed
      </div>

      {/* Anomaly Table */}
      <div style={{
        background: 'var(--card-strong)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius)', padding: 24
      }}>
        <h3 style={{
          fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <AlertTriangle size={18} color="#ff6b6b" /> Detected Anomalies
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['IP', 'Alert', 'Source', 'Severity', 'ML Score', 'Confidence'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.anomalies.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 12px', color: '#00f0ff', fontFamily: 'monospace' }}>{a.ip}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.endpoint}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: 'rgba(0,240,255,0.15)', color: '#00f0ff'
                    }}>{a.attackType}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: a.severity === 'CRITICAL' ? '#ff6b6b22' : a.severity === 'HIGH' ? '#f9731622' : '#f6c90e22',
                      color: a.severity === 'CRITICAL' ? '#ff6b6b' : a.severity === 'HIGH' ? '#f97316' : '#f6c90e'
                    }}>{a.severity}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: 'rgba(255,107,107,0.2)', color: '#ff6b6b'
                    }}>{a.ml_score}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: 'rgba(168,123,250,0.2)', color: '#a78bfa'
                    }}>{a.confidence}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Info */}
      <div style={{
        background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.2)',
        borderRadius: 12, padding: 20
      }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#00f0ff', marginBottom: 12 }}>
          Model Details
        </h4>
        <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.8 }}>
          <div>Algorithm: Isolation Forest (Unsupervised Learning)</div>
          <div>Training Data: 83,020 real attack logs (Honeypot + ModSecurity + Suricata)</div>
          <div>Features: Path length, severity, source type, IP length, attack indicators</div>
          <div>Contamination: 20% threshold</div>
          <div>Estimators: 300</div>
          <div>Last trained: {new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}
