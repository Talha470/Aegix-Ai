import { useState, useEffect } from 'react'
import api from '../utils/api'
import { Shield, Key, CheckCircle, XCircle } from 'lucide-react'

export default function Settings() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [secret, setSecret] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    checkTwoFactorStatus()

// Auto-open 2FA setup if forced
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('setup2fa') === 'true' && !twoFactorEnabled) {
    setup2FA()
  }
  }, [])

  async function checkTwoFactorStatus() {
    try {
      const user = JSON.parse(localStorage.getItem('aegix_user') || '{}')
      // Assuming user object has twoFactorEnabled field from backend
      setTwoFactorEnabled(user.twoFactorEnabled || false)
    } catch (err) {
      console.error(err)
    }
  }

  async function setup2FA() {
    setLoading(true)
    setMessage('')
    try {
      const res = await api.get('/2fa/setup')
      setQrCode(res.data.qrCode)
      setSecret(res.data.secret)
      setMessage('Scan QR code with Google Authenticator app')
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error setting up 2FA')
    } finally {
      setLoading(false)
    }
  }

  async function verify2FA() {
    if (!verifyCode || verifyCode.length !== 6) {
      setMessage('Please enter 6-digit code')
      return
    }
    
    setLoading(true)
    setMessage('')
    try {
      await api.post('/2fa/verify', { token: verifyCode })
      setTwoFactorEnabled(true)
      setQrCode(null)
      setSecret(null)
      setVerifyCode('')
      setMessage('✅ 2FA enabled successfully!')
      
      // Update local storage
      const user = JSON.parse(localStorage.getItem('aegix_user') || '{}')
      user.twoFactorEnabled = true
      localStorage.setItem('aegix_user', JSON.stringify(user))
    } catch (err) {
      setMessage('❌ Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function disable2FA() {
    if (!window.confirm('Are you sure you want to disable 2FA?')) return
    
    setLoading(true)
    setMessage('')
    try {
      await api.post('/2fa/disable')
      setTwoFactorEnabled(false)
      setMessage('2FA disabled')
      
      // Update local storage
      const user = JSON.parse(localStorage.getItem('aegix_user') || '{}')
      user.twoFactorEnabled = false
      localStorage.setItem('aegix_user', JSON.stringify(user))
    } catch (err) {
      setMessage(err.response?.data?.msg || 'Error disabling 2FA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontFamily: 'Orbitron, sans-serif',
          fontSize: 24,
          background: 'linear-gradient(90deg, var(--gradient-from), var(--gradient-to))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8
        }}>
          Security Settings
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Manage your account security preferences
        </p>
      </div>

      {/* 2FA Card */}
      <div style={{
        background: 'var(--card-strong)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: 32
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Shield size={24} color="#00f0ff" />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            Two-Factor Authentication
          </h2>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          borderRadius: 999,
          background: twoFactorEnabled ? 'rgba(68,209,122,0.12)' : 'rgba(255,107,107,0.12)',
          border: `1px solid ${twoFactorEnabled ? 'rgba(68,209,122,0.3)' : 'rgba(255,107,107,0.3)'}`,
          marginBottom: 24
        }}>
          {twoFactorEnabled ? (
            <CheckCircle size={16} color="#44d17a" />
          ) : (
            <XCircle size={16} color="#ff6b6b" />
          )}
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: twoFactorEnabled ? '#44d17a' : '#ff6b6b'
          }}>
            {twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
          Add an extra layer of security by requiring a 6-digit code from your authenticator app when logging in.
        </p>

        {/* Message */}
        {message && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: message.includes('✅') ? 'rgba(68,209,122,0.1)' : 'rgba(0,240,255,0.1)',
            border: `1px solid ${message.includes('✅') ? 'rgba(68,209,122,0.3)' : 'rgba(0,240,255,0.3)'}`,
            color: message.includes('✅') ? '#44d17a' : '#00f0ff',
            fontSize: 13,
            marginBottom: 24
          }}>
            {message}
          </div>
        )}

        {/* If 2FA NOT enabled - Show Setup */}
        {!twoFactorEnabled && !qrCode && (
          <button
            onClick={setup2FA}
            disabled={loading}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              background: 'linear-gradient(90deg, #00f0ff, #0066ff)',
              border: 'none',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Key size={16} />
            {loading ? 'Setting up...' : 'Enable 2FA'}
          </button>
        )}

        {/* QR Code Display */}
        {qrCode && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 24
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
              Step 1: Scan QR Code
            </h3>
            
            <div style={{
              background: 'white',
              padding: 16,
              borderRadius: 8,
              display: 'inline-block',
              marginBottom: 16
            }}>
              <img src={qrCode} alt="2FA QR Code" style={{ width: 240, height: 240, display: 'block' }} />
            </div>

            <div style={{
              background: 'rgba(0,240,255,0.08)',
              border: '1px solid rgba(0,240,255,0.2)',
              borderRadius: 8,
              padding: 12,
              marginBottom: 24
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                Manual Entry Code:
              </div>
              <code style={{
                fontSize: 13,
                color: '#00f0ff',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}>
                {secret}
              </code>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
              Step 2: Enter Verification Code
            </h3>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  6-Digit Code from Authenticator App
                </label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: 'var(--bg-1)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    fontSize: 16,
                    fontFamily: 'monospace',
                    letterSpacing: 4,
                    textAlign: 'center'
                  }}
                />
              </div>
              
              <button
                onClick={verify2FA}
                disabled={loading || verifyCode.length !== 6}
                style={{
                  padding: '12px 24px',
                  borderRadius: 8,
                  background: verifyCode.length === 6 ? 'linear-gradient(90deg, #44d17a, #2ea461)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (loading || verifyCode.length !== 6) ? 'not-allowed' : 'pointer',
                  opacity: (loading || verifyCode.length !== 6) ? 0.6 : 1
                }}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>

            <button
              onClick={() => { setQrCode(null); setSecret(null); setVerifyCode(''); }}
              style={{
                marginTop: 16,
                padding: '8px 16px',
                borderRadius: 6,
                background: 'transparent',
                border: '1px solid rgba(255,107,107,0.3)',
                color: '#ff6b6b',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* If 2FA enabled - Show Disable Option */}
        {twoFactorEnabled && (
          <button
            onClick={disable2FA}
            disabled={loading}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              background: 'rgba(255,107,107,0.12)',
              border: '1px solid rgba(255,107,107,0.3)',
              color: '#ff6b6b',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Disabling...' : 'Disable 2FA'}
          </button>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: 32,
        padding: 24,
        background: 'rgba(0,240,255,0.05)',
        border: '1px solid rgba(0,240,255,0.2)',
        borderRadius: 12
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#00f0ff' }}>
          How to use 2FA:
        </h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)', fontSize: 13, lineHeight: 1.8 }}>
          <li>Download Google Authenticator or Authy app on your phone</li>
          <li>Click "Enable 2FA" and scan the QR code with the app</li>
          <li>Enter the 6-digit code shown in the app to verify</li>
          <li>Next time you login, you'll need both password and 2FA code</li>
        </ol>
      </div>
    </div>
  )
}
