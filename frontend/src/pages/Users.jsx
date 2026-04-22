import { useEffect, useState } from 'react'
import api from '../utils/api'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get('/dashboard/stats')
        // Users list ke liye alag route nahi hai abhi
        // Stats se count show karenge
        setLoading(false)
      } catch (err) {
        console.error(err)
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const currentUser = JSON.parse(localStorage.getItem('aegix_user') || '{}')

  return (
    <div style={{ display: 'grid', gap: '24px' }}>

      <div>
        <h1 style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '22px',
          background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '4px'
        }}>
          Users
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Logged in user info
        </p>
      </div>

      {/* Current User Card */}
      <div style={{
        background: 'var(--card-strong)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: '28px',
        backdropFilter: 'blur(12px)',
        maxWidth: '480px'
      }}>
        <h3 style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '14px',
          color: 'var(--text)',
          marginBottom: '20px'
        }}>
          Current Session
        </h3>

        <div style={{ display: 'grid', gap: '14px' }}>
          {[
            { label: 'Name', value: currentUser?.name || '—' },
            { label: 'Email', value: currentUser?.email || '—' },
            { label: 'Role', value: currentUser?.role || '—' },
            { label: 'User ID', value: currentUser?._id || currentUser?.id || '—' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--line)'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{item.label}</span>
              <span style={{ fontSize: '13px', color: 'var(--text)', fontFamily: item.label === 'User ID' ? 'monospace' : 'inherit' }}>
                {item.value}
              </span>
            </div>
          ))}

          {/* Role Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--line)'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Access Level</span>
            <span style={{
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '700',
              background: currentUser?.role === 'admin' ? '#00f0ff22' : '#44d17a22',
              color: currentUser?.role === 'admin' ? '#00f0ff' : '#44d17a',
              border: `1px solid ${currentUser?.role === 'admin' ? '#00f0ff44' : '#44d17a44'}`
            }}>
              {currentUser?.role?.toUpperCase() || 'USER'}
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}