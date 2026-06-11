import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../utils/api'
import { RefreshCw, Shield, Clock, RotateCcw, Eye, EyeOff } from 'lucide-react'

export default function Morpheus() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEndpoint, setShowEndpoint] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const timerRef = useRef(null)
  const fetchRef = useRef(null)

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/morpheus/status')
      setStatus(data)
      setCountdown(data.next_rotation_in || 60)
    } catch (e) {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchRef.current = setInterval(fetchStatus, 30000)
    return () => clearInterval(fetchRef.current)
  }, [fetchStatus])

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchStatus()
          return 60
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [fetchStatus])

  const progress = ((60 - countdown) / 60) * 100

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', color: '#a78bfa', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={20} /> MORPHEUS — Moving Target Defense
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
          Endpoint mutation every 60 seconds — attackers can't fingerprint your API
        </p>
      </div>

      {/* Main Status Card */}
      <div style={{
        ...cardStyle,
        border: '1px solid rgba(167,139,250,0.25)',
        background: 'linear-gradient(135deg, rgba(167,139,250,0.06), rgba(0,102,255,0.04))',
        display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', letterSpacing: '0.1em' }}>
            CURRENT ACTIVE ENDPOINT
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              fontFamily: 'monospace', fontSize: '18px', fontWeight: '700',
              color: '#a78bfa', letterSpacing: '0.05em'
            }}>
              {loading ? 'Loading...' : showEndpoint
                ? (status?.current_endpoint || 'N/A')
                : '••••••••••••••••'}
            </div>
            <button onClick={() => setShowEndpoint(!showEndpoint)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}>
              {showEndpoint ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
            Last rotated: {status?.rotated_at ? new Date(status.rotated_at).toLocaleTimeString() : '—'}
          </div>
        </div>

        {/* Rotation Countdown Ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '90px', height: '90px' }}>
            <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(167,139,250,0.1)" strokeWidth="6" />
              <circle cx="45" cy="45" r="38" fill="none" stroke="#a78bfa"
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - progress / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '22px', fontWeight: '700', color: '#a78bfa', fontFamily: 'Orbitron, sans-serif' }}>
                {countdown}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>seconds</span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>Next rotation</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '14px' }}>
        {[
          { label: 'Total Rotations', value: status?.total_rotations ?? '—', color: '#a78bfa', icon: <RotateCcw size={16} /> },
          { label: 'Token History', value: status?.history_count ?? '—', color: '#00f0ff', icon: <Clock size={16} /> },
          { label: 'Rotation Interval', value: '60s', color: '#44d17a', icon: <RefreshCw size={16} /> },
          { label: 'Defense Status', value: 'ACTIVE', color: '#44d17a', icon: <Shield size={16} /> },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, fontFamily: 'Orbitron, sans-serif' }}>
                {loading ? '...' : s.value}
              </div>
              <span style={{ color: s.color, opacity: 0.6 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '14px', color: '#a78bfa', margin: '0 0 16px', fontFamily: 'Orbitron, sans-serif' }}>
          How MORPHEUS Works
        </h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {[
            { step: '01', title: 'Token Generation', desc: 'Every 60 seconds, MORPHEUS generates a new random 8-char alphanumeric token.' },
            { step: '02', title: 'Endpoint Mutation', desc: 'Login endpoint changes from /api/login → /api/{token}/login. Attackers lose their target.' },
            { step: '03', title: 'Legitimate Clients', desc: 'Valid users get the current token embedded in their JWT payload on each response.' },
            { step: '04', title: 'Grace Period', desc: 'Last 3 tokens remain valid to prevent disruption during rotation.' },
            { step: '05', title: 'Stack Fingerprint Hiding', desc: 'NGINX returns fake Server headers — attackers see wrong tech stack.' },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <span style={{
                width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)',
                color: '#a78bfa', fontSize: '11px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{item.step}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NGINX Config Hint */}
      <div style={{ ...cardStyle, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
        <h3 style={{ fontSize: '13px', color: '#f59e0b', margin: '0 0 10px' }}>NGINX Stack Fingerprint Hiding</h3>
        <pre style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', fontFamily: 'monospace', lineHeight: '1.7' }}>
{`# Add to /etc/nginx/sites-available/aegix:
more_set_headers 'Server: Apache/2.4.41';
more_set_headers 'X-Powered-By: PHP/7.4.3';
# Install: sudo apt install nginx-extras`}
        </pre>
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
