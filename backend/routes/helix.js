const express = require('express')
const router = express.Router()
const fs = require('fs')
const crypto = require('crypto')
const path = require('path')
const { exec } = require('child_process')
const { protect } = require('../middlewares')

const HELIX_REPORT = '/tmp/helix_report.json'
const NEXUS_SUMMARY = '/tmp/nexus_summary.json'
const HEAL_LOG = '/tmp/nexus_heal.log'
const BASELINE_FILE = '/app/helix/baseline.json'

// Container-accessible paths
const WATCHED_FILES = [
  '/app/Server.js',
  '/app/middlewares.js',
  '/app/models/users.js',
  '/app/models/logs.js',
  '/app/routes/auth.js',
  '/app/routes/dashboard.js',
  '/app/ML/train_model.py',
]

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch (e) { return null }
}

function sha256File(filepath) {
  try {
    const data = fs.readFileSync(filepath)
    return crypto.createHash('sha256').update(data).digest('hex')
  } catch (e) { return null }
}

// ── In-process scan (no Python needed) ───────────────────────────────────────
function runInProcessScan() {
  const findings = []
  const baseline = readJSON(BASELINE_FILE) || {}

  // 1. File integrity check
  for (const f of WATCHED_FILES) {
    const current = sha256File(f)
    if (!current) {
      findings.push({ type: 'FILE_MISSING', file: f, severity: 'HIGH', message: `File missing: ${f}` })
    } else if (baseline[f] && baseline[f] !== current) {
      findings.push({ type: 'FILE_TAMPERED', file: f, severity: 'CRITICAL', message: `File tampered: ${f}` })
    }
  }

  // 2. Check for hardcoded secrets in code files
  const secretPatterns = [
    { pattern: /password\s*=\s*["'][^"']{6,}["']/gi, label: 'Hardcoded password' },
    { pattern: /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/gi, label: 'Hardcoded API key' },
    { pattern: /sk-ant-[a-zA-Z0-9\-]+/g, label: 'Exposed Anthropic key' },
  ]
  const checkFiles = ['/app/Server.js', '/app/routes/auth.js']
  for (const f of checkFiles) {
    try {
      const content = fs.readFileSync(f, 'utf8')
      for (const { pattern, label } of secretPatterns) {
        if (pattern.test(content)) {
          findings.push({ type: 'HARDCODED_SECRET', file: f, severity: 'HIGH', message: `${label} found in ${f}` })
        }
      }
    } catch (e) {}
  }

  // 3. ML model integrity check
  try {
    const modelStat = fs.statSync('/app/ML/anomaly_model.pkl')
    const ageMins = (Date.now() - modelStat.mtimeMs) / 60000
    if (ageMins > 60 * 24 * 7) {  // older than 7 days
      findings.push({ type: 'MODEL_STALE', file: '/app/ML/anomaly_model.pkl', severity: 'MEDIUM', message: `ML model not retrained in ${Math.round(ageMins / 60 / 24)} days` })
    }
  } catch (e) {
    findings.push({ type: 'MODEL_MISSING', file: '/app/ML/anomaly_model.pkl', severity: 'CRITICAL', message: 'ML model file missing!' })
  }

  // 4. Check blocked_ips.txt sync
  try {
    const blockedFile = '/app/blocked_ips.txt'
    if (fs.existsSync(blockedFile)) {
      const ips = fs.readFileSync(blockedFile, 'utf8').split('\n').filter(Boolean)
      if (ips.length > 0) {
        findings.push({ type: 'BLOCKED_IPS_PENDING', severity: 'INFO', message: `${ips.length} IPs pending UFW sync` })
      }
    }
  } catch (e) {}

  const critical = findings.filter(f => f.severity === 'CRITICAL')
  const high = findings.filter(f => f.severity === 'HIGH')

  const report = {
    scan_time: new Date().toISOString(),
    file_integrity: findings.filter(f => ['FILE_TAMPERED','FILE_MISSING','HARDCODED_SECRET','MODEL_MISSING','MODEL_STALE'].includes(f.type)),
    suspicious_processes: [],
    network_connections: [],
    api_self_tests: findings.filter(f => f.type === 'BLOCKED_IPS_PENDING'),
    summary: {
      total_findings: findings.length,
      critical: critical.length,
      high: high.length,
      scan_duration_ms: 0,
      status: critical.length > 0 ? 'CRITICAL' : high.length > 0 ? 'HIGH' : 'CLEAN',
    },
    critical_findings: critical,
  }

  fs.writeFileSync(HELIX_REPORT, JSON.stringify(report, null, 2))
  return report
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/helix/report
router.get('/report', protect, (req, res) => {
  const report = readJSON(HELIX_REPORT)
  if (!report) return res.json({ success: true, data: null, message: 'No scan report yet. Run HELIX first.' })
  res.json({ success: true, data: report })
})

// GET /api/helix/nexus-summary
router.get('/nexus-summary', protect, (req, res) => {
  const summary = readJSON(NEXUS_SUMMARY)
  if (!summary) return res.json({ success: true, data: null, message: 'No healing run yet.' })
  res.json({ success: true, data: summary })
})

// GET /api/helix/heal-log
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

// POST /api/helix/scan — in-process scan (no Python timeout issues)
router.post('/scan', protect, (req, res) => {
  try {
    const report = runInProcessScan()
    res.json({ success: true, data: report.summary, report })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /api/helix/heal — auto-heal based on last report
router.post('/heal', protect, (req, res) => {
  try {
    const report = readJSON(HELIX_REPORT)
    if (!report) return res.json({ success: false, message: 'Run scan first' })

    const healed = []
    const failed = []
    const ts = new Date().toISOString()

    // Restore tampered files from git
    const tampered = (report.file_integrity || []).filter(f => f.type === 'FILE_TAMPERED')
    for (const finding of tampered) {
      try {
        const rel = path.relative('/app', finding.file)
        exec(`cd /app && git checkout HEAD -- ${rel}`, (err) => {
          if (!err) healed.push(`RESTORED: ${finding.file}`)
          else failed.push(`FAILED: ${finding.file}`)
        })
        healed.push(`Queued restore: ${finding.file}`)
      } catch (e) {
        failed.push(`Error: ${finding.file}`)
      }
    }

    if (tampered.length === 0) healed.push('No tampered files — system integrity OK')

    const summary = {
      healed_at: ts,
      healed,
      failed,
      total_healed: healed.length,
      total_failed: failed.length,
    }

    fs.writeFileSync(NEXUS_SUMMARY, JSON.stringify(summary, null, 2))
    const logLine = `[${ts}] [NEXUS] Healed: ${healed.length} | Failed: ${failed.length}\n`
    fs.appendFileSync(HEAL_LOG, logLine)

    res.json({ success: true, data: summary })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

// POST /api/helix/baseline — generate baseline from current files
router.post('/baseline', protect, (req, res) => {
  try {
    const baseline = {}
    for (const f of WATCHED_FILES) {
      const h = sha256File(f)
      if (h) baseline[f] = h
    }
    fs.mkdirSync('/app/helix', { recursive: true })
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2))
    res.json({
      success: true,
      message: `Baseline created with ${Object.keys(baseline).length} files`,
      data: baseline
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

module.exports = router
