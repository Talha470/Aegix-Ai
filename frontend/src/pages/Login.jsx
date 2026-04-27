import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Shield } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [userId, setUserId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const res = await axios.post('/api/auth/login', {
        email,
        password,
        twoFactorCode: twoFactorCode || undefined
      })
      
      // If 2FA required
      if (res.data.requires2FA) {
        setRequires2FA(true)
        setUserId(res.data.userId)
        setError('')
      } else {
        // Login successful
        localStorage.setItem('aegix_token', res.data.token)
        localStorage.setItem('aegix_user', JSON.stringify(res.data.user))
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    setRequires2FA(false)
    setTwoFactorCode('')
    setError('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 0%, rgba(0,240,255,0.06), transparent 60%), var(--bg-1)',
      padding: '20px'
    }}>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--card-strong)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        backdropFilter: 'blur(12px)',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
      }}>

        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '28px',
            background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            AEGIX AI
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            {requires2FA ? 'Two-Factor Authentication' : 'Sign in to your security dashboard'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '16px' }}>

          {/* Email/Password (Hidden if 2FA required) */}
          {!requires2FA && (
            <>
              <div style={{ display: 'grid', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--muted)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@aegix.com"
                  required
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    padding: '13px 16px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--muted)' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    padding: '13px 16px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>
            </>
          )}

          {/* 2FA Code Input (Shown only if 2FA required) */}
          {requires2FA && (
            <div>
              <div style={{
                background: 'rgba(0,240,255,0.08)',
                border: '1px solid rgba(0,240,255,0.2)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Shield size={20} color="#00f0ff" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#00f0ff', marginBottom: '2px' }}>
                    2FA Verification Required
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Enter the 6-digit code from your authenticator app
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--muted)' }}>Verification Code</label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--line)',
                    borderRadius: '12px',
                    padding: '13px 16px',
                    color: 'var(--text)',
                    fontSize: '18px',
                    fontFamily: 'monospace',
                    letterSpacing: '6px',
                    textAlign: 'center',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(255,107,107,0.1)',
              border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: 'var(--danger)',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'grid', gap: '8px' }}>
            <button
              type="submit"
              disabled={loading || (requires2FA && twoFactorCode.length !== 6)}
              style={{
                background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                color: 'white',
                fontWeight: '700',
                fontSize: '14px',
                cursor: (loading || (requires2FA && twoFactorCode.length !== 6)) ? 'not-allowed' : 'pointer',
                opacity: (loading || (requires2FA && twoFactorCode.length !== 6)) ? 0.6 : 1,
                marginTop: '4px'
              }}
            >
              {loading ? 'Verifying...' : (requires2FA ? 'Verify Code' : 'Sign In')}
            </button>

            {/* Back button (only show on 2FA screen) */}
            {requires2FA && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: 'var(--muted)',
                  fontSize: '13px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Back to Login
              </button>
            )}
          </div>

        </form>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '12px',
          color: 'var(--muted)'
        }}>
          Aegix AI • Autonomous Cyber Defense
        </p>

      </div>
    </div>
  )
}
