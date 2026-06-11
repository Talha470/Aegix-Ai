const express = require('express')
const router = express.Router()
const fs = require('fs')
const { exec } = require('child_process')
const { protect } = require('../middlewares')

const HELIX_REPORT = '/tmp/helix_report.json'
const NEXUS_SUMMARY = '/tmp/nexus_summary.json'
const HEAL_LOG = '/tmp/nexus_heal.log'

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch (e) { return null }
}

// GET /api/helix/report — latest scan report
router.get('/report', protect, (req, res) => {
  const report = readJSON(HELIX_REPORT)
  if (!report) return res.json({ success: true, data: null, message: 'No scan report yet. Run HELIX first.' })
  res.json({ success: true, data: report })
})

// GET /api/helix/nexus-summary — latest healing summary
router.get('/nexus-summary', protect, (req, res) => {
  const summary = readJSON(NEXUS_SUMMARY)
  if (!summary) return res.json({ success: true, data: null, message: 'No healing run yet.' })
  res.json({ success: true, data: summary })
})

// GET /api/helix/heal-log — raw heal log
router.get('/heal-log', protect, (req, res) => {
  try {
    const log = fs.existsSync(HEAL_LOG)
      ? fs.readFileSync(HEAL_LOG, 'utf8').split('\n').slice(-100).join('\n')
      : 'No heal log yet.'
    res.json({ success: true, data: log })
  } catch (e) {
    res.json({ success: true, data: 'Could not read heal log' })
  }
})

// POST /api/helix/scan — trigger manual scan
router.post('/scan', protect, (req, res) => {
  exec('python3 /app/helix/helix.py', { timeout: 60000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ success: false, message: err.message })
    try {
      const summary = JSON.parse(stdout.split('\n').find(l => l.startsWith('{')))
      res.json({ success: true, data: summary })
    } catch (e) {
      res.json({ success: true, message: 'Scan completed', output: stdout })
    }
  })
})

// POST /api/helix/heal — trigger manual healing
router.post('/heal', protect, (req, res) => {
  exec('python3 /app/helix/nexus.py', { timeout: 60000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ success: false, message: err.message })
    const summary = readJSON(NEXUS_SUMMARY)
    res.json({ success: true, data: summary, output: stdout })
  })
})

// POST /api/helix/baseline — regenerate baseline
router.post('/baseline', protect, (req, res) => {
  const baselineFile = '/app/helix/baseline.json'
  try {
    const watchedFiles = [
      '/app/Server.js', '/app/middlewares.js', '/app/middlewares/zeroday.js',
      '/app/models/users.js', '/app/routes/auth.js',
    ]
    const crypto = require('crypto')
    const baseline = {}
    for (const f of watchedFiles) {
      try {
        const data = fs.readFileSync(f)
        baseline[f] = crypto.createHash('sha256').update(data).digest('hex')
      } catch (e) {}
    }
    fs.mkdirSync('/app/helix', { recursive: true })
    fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2))
    res.json({ success: true, message: `Baseline created with ${Object.keys(baseline).length} files`, data: baseline })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

module.exports = router
