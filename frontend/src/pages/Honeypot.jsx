import { useEffect, useState } from 'react'
import { Terminal, Shield, Database } from 'lucide-react'

export default function Honeypot() {
  const [cowrieLogs, setCowrieLogs] = useState([])
  const [loading, setLoading] = useState(false)

  const honeypots = [
    {
      name: 'Cowrie SSH Honeypot',
      icon: <Terminal size={20} />,
      port: 'Port 22',
      color: '#00f0ff',
      status: 'ACTIVE',
      description: 'Fake SSH server — captures brute force attempts and credentials'
    },
    {
      name: 'Dionaea Malware Trap',
      icon: <Database size={20} />,
      port: 'Ports 21, 23, 445, 1433, 3306',
      color: '#a78bfa',
      status: 'ACTIVE',
      description: 'Multi-protocol honeypot — captures malware and exploit attempts'
    },
    {
      name: 'HTTP Honeypot',
      icon: <Shield size={20} />,
      port: 'Port 443',
      color: '#f97316',
      status: 'ACTIVE',
      description: 'Fake wp-login, admin, phpmyadmin, .env — logs all scanners'
    },
  ]

  const httpTraps = [
    { path: '/wp-login.php', description: 'Fake WordPress Login' },
    { path: '/wp-admin', description: 'Fake WordPress Admin' },
    { path: '/admin', description: 'Fake Admin Panel' },
    { path: '/phpmyadmin', description: 'Fake phpMyAdmin' },
    { path: '/.env', description: 'Fake Environment File' },
  ]

  return (
    <div style={{ display: 'grid', gap: '24px' }}>

      {/* Title */}
      <div>
        <h1 style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '22px',
          background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '4px'
        }}>
          Honeypot Monitor
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Active deception systems catching real attackers
        </p>
      </div>

      {/* Honeypot Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {honeypots.map((h, i) => (
          <div key={i} style={{
            background: 'var(--card-strong)',
            border: `1px solid ${h.color}33`,
            borderRadius: 'var(--radius)',
            padding: '24px',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease'
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 20px ${h.color}22`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: `${h.color}18`,
                border: `1px solid ${h.color}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: h.color
              }}>
                {h.icon}
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '700',
                background: '#44d17a22',
                color: '#44d17a',
                border: '1px solid #44d17a44'
              }}>
                {h.status}
              </span>
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>
              {h.name}
            </h3>
            <div style={{ fontSize: '12px', color: h.color, marginBottom: '8px', fontFamily: 'monospace' }}>
              {h.port}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
              {h.description}
            </p>
          </div>
        ))}
      </div>

      {/* HTTP Trap Paths */}
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
          HTTP Trap Endpoints
        </h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          {httpTraps.map((trap, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--line)'
            }}>
              <span style={{ fontFamily: 'monospace', color: '#00f0ff', fontSize: '13px' }}>
                {trap.path}
              </span>
              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>
                {trap.description}
              </span>
              <span style={{
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '700',
                background: '#44d17a22',
                color: '#44d17a',
                border: '1px solid #44d17a44'
              }}>
                ACTIVE
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info Note */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '14px',
        background: 'rgba(0,240,255,0.06)',
        border: '1px solid rgba(0,240,255,0.2)',
        fontSize: '13px',
        color: 'var(--muted)',
        lineHeight: '1.7'
      }}>
        💡 <strong style={{ color: '#00f0ff' }}>Note:</strong> Cowrie logs can be viewed via <code style={{ color: '#a78bfa' }}>docker logs aegix-cowrie</code> on the server. Dionaea captures malware binaries in <code style={{ color: '#a78bfa' }}>/honeypots/dionaea/binaries/</code>
      </div>

    </div>
  )
}