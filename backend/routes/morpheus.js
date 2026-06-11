const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { protect } = require('../middlewares')

const TOKEN_FILE = '/tmp/morpheus_token.json'
const ROTATE_INTERVAL = 60000  // 60 seconds

// In-memory state (fallback if morpheus.py not running)
let state = { current: null, history: [], rotated_at: null, total_rotations: 0 }
let lastRotate = 0

function genToken(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let t = ''
  for (let i = 0; i < len; i++) t += chars[Math.floor(Math.random() * chars.length)]
  return t
}

function loadOrRotate() {
  // Try reading from morpheus.py output
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const raw = fs.readFileSync(TOKEN_FILE, 'utf8')
      state = JSON.parse(raw)
      return state
    }
  } catch (e) {}

  // Fallback: rotate in-process
  const now = Date.now()
  if (!state.current || (now - lastRotate) >= ROTATE_INTERVAL) {
    const newToken = genToken()
    state.history.push({ token: newToken, created_at: new Date().toISOString() })
    if (state.history.length > 3) state.history = state.history.slice(-3)
    state.current = newToken
    state.rotated_at = new Date().toISOString()
    state.total_rotations = (state.total_rotations || 0) + 1
    lastRotate = now
  }
  return state
}

// GET /api/morpheus/status — current token info (admin only)
router.get('/status', protect, (req, res) => {
  const s = loadOrRotate()
  const nextIn = Math.max(0, ROTATE_INTERVAL - (Date.now() - lastRotate)) / 1000
  res.json({
    success: true,
    current_endpoint: `/api/${s.current}/login`,
    rotated_at: s.rotated_at,
    total_rotations: s.total_rotations,
    next_rotation_in: Math.round(nextIn),
    history_count: (s.history || []).length,
  })
})

// GET /api/morpheus/token — get current token (embedded in JWT response on login)
router.get('/token', protect, (req, res) => {
  const s = loadOrRotate()
  res.json({ success: true, token: s.current, valid_tokens: (s.history || []).map(h => h.token) })
})

// Middleware: validate morpheus token on mutated endpoints
// Usage: app.use('/api/:morpheus_token/login', morpheusValidate, loginHandler)
function morpheusValidate(req, res, next) {
  const s = loadOrRotate()
  const provided = req.params.morpheus_token
  const validTokens = (s.history || []).map(h => h.token)

  if (provided === s.current || validTokens.includes(provided)) {
    req.morpheusValid = true
    return next()
  }

  return res.status(404).json({ msg: 'Endpoint not found' })  // Fake 404 — don't reveal
}

module.exports = router
module.exports.morpheusValidate = morpheusValidate
module.exports.loadOrRotate = loadOrRotate
