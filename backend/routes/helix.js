const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { exec } = require('child_process')
const { protect } = require('../middlewares')

const HELIX_REPORT  = '/tmp/helix_report.json'
const NEXUS_SUMMARY = '/tmp/nexus_summary.json'
const HEAL_LOG      = '/tmp/nexus_heal.log'
const BASELINE_FILE = '/app/helix/baseline.json'

// ── Vulnerability patterns to scan in code files ─────────────────────────────
const VULN_PATTERNS = [
  {
    id: 'V001', severity: 'CRITICAL', label: 'SQL Injection Risk',
    pattern: /\$\{.*?(req\.(body|query|params)).*?\}|`.*?(req\.(body|query|params)).*?`/g,
    desc: 'User input directly interpolated into string — possible SQL/NoSQL injection'
  },
  {
    id: 'V002', severity: 'CRITICAL', label: 'eval() Usage',
    pattern: /\beval\s*\(/g,
    desc: 'eval() is dangerous — can execute arbitrary code'
  },
  {
    id: 'V003', severity: 'HIGH', label: 'Hardcoded Secret',
    pattern: /(password|secret|apikey|api_key|token)\s*[:=]\s*["'][^"']{8,}["']/gi,
    desc: 'Possible hardcoded credential or secret'
  },
  {
    id: 'V004', severity: 'HIGH', label: 'Missing Auth Middleware',
    pattern: /router\.(get|post|put|delete)\s*\(\s*["'`][^"'`]+["'`]\s*,\s*(async\s*)?\(req,\s*res\)/g,
    desc: 'Route handler with no middleware — missing auth check'
  },
  {
    id: 'V005', severity: 'HIGH', label: 'Command Injection Risk',
    pattern: /exec\s*\(\s*[`$].*?(req\.(body|query|params))/g,
    desc: 'User input passed to exec() — command injection risk'
  },
  {
    id: 'V006', severity: 'MEDIUM', label: 'Unhandled Promise',
    pattern: /\.then\s*\([^)]+\)\s*(?!\.catch)/g,
    desc: 'Promise chain without .catch() — unhandled rejection'
  },
  {
    id: 'V007', severity: 'MEDIUM', label: 'Weak Regex (ReDoS)',
    pattern: /new RegExp\(.*?(req\.(body|query|params))/g,
    desc: 'User input used in RegExp — potential ReDoS attack'
  },
  {
    id: 'V008', severity: 'HIGH', label: 'XSS Risk (res.send with user input)',
    pattern: /res\.(send|write)\s*\(.*?(req\.(body|query|params))/g,
    desc: 'User input directly sent in response — XSS risk'
  },
  {
    id: 'V009', severity: 'MEDIUM', label: 'Exposed Stack Trace',
    pattern: /res\.json\s*\(\s*\{.*?err(or)?\.stack/g,
    desc: 'Stack trace exposed in API response'
  },
  {
    id: 'V010', severity: 'LOW', label: 'console.log in Production',
    pattern: /console\.log\s*\(/g,
    desc: 'console.log found — may expose sensitive info in production logs'
  },
]

// Files to scan for vulnerabilities
const SCAN_DIRS = ['/app/routes', '/app/controllers', '/app/middlewares']
const SCAN_EXTRA = ['/app/Server.js', '/app/middlewares.js']

// Files to monitor for integrity
const WATCHED_FILES = [
  '/app/Server.js', '/app/middlewares.js',
  '/app/models/users.js', '/app/models/logs.js',
  '/app/routes/auth.js', '/app/routes/dashboard.js',
  '/app/ML/train_model.py',
]

function readJSON(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null }
}

function sha256File(filepath) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(filepath)).digest('hex')
  } catch { return null }
}

function getAllJSFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const files = []
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) files.push(...getAllJSFiles(full))
    else if (f.endsWith('.js') || f.endsWith('.py')) files.push(full)
  }
  return files
}

// ── Full Vulnerability Scan ───────────────────────────────────────────────────
function runFullScan() {
  const startTs = Date.now()
  const findings = {
    file_integrity: [],
    code_vulnerabilities: [],
    config_issues: [],
    server_checks: [],
    api_self_tests: [],
  }

  // ── 1. File Integrity ──────────────────────────────────────────────────────
  const baseline = readJSON(BASELINE_FILE) || {}
  for (const f of WATCHED_FILES) {
    const hash = sha256File(f)
    if (!hash) {
      findings.file_integrity.push({
        type: 'FILE_MISSING', file: f, severity: 'HIGH',
        message: `Monitored file missing: ${f}`
      })
    } else if (baseline[f] && baseline[f] !== hash) {
      findings.file_integrity.push({
        type: 'FILE_TAMPERED', file: f, severity: 'CRITICAL',
        message: `File hash mismatch — possible tampering: ${f}`,
        expected: baseline[f].slice(0, 12) + '…',
        found: hash.slice(0, 12) + '…'
      })
    }
  }

  // ── 2. Code Vulnerability Scan ─────────────────────────────────────────────
  const allFiles = [
    ...SCAN_EXTRA,
    ...SCAN_DIRS.flatMap(d => getAllJSFiles(d))
  ]

  for (const filepath of allFiles) {
    let content
    try { content = fs.readFileSync(filepath, 'utf8') } catch { continue }
    const lines = content.split('\n')

    for (const vuln of VULN_PATTERNS) {
      // Reset regex lastIndex
      const regex = new RegExp(vuln.pattern.source, vuln.pattern.flags)
      let match
      while ((match = regex.exec(content)) !== null) {
        // Find line number
        const lineNum = content.slice(0, match.index).split('\n').length
        const lineContent = lines[lineNum - 1]?.trim().slice(0, 120)

        findings.code_vulnerabilities.push({
          type: vuln.id,
          label: vuln.label,
          severity: vuln.severity,
          file: filepath.replace('/app/', ''),
          line: lineNum,
          snippet: lineContent,
          message: vuln.desc,
        })

        // Limit to 3 matches per pattern per file to avoid noise
        if (findings.code_vulnerabilities.filter(f => f.file === filepath.replace('/app/', '') && f.type === vuln.id).length >= 3) break
      }
    }
  }

  // ── 3. Config Checks ──────────────────────────────────────────────────────
  // Check JWT secret strength
  try {
    const serverContent = fs.readFileSync('/app/Server.js', 'utf8')
    if (serverContent.includes('JWT_SECRET') === false) {
      findings.config_issues.push({ type: 'NO_JWT_SECRET', severity: 'CRITICAL', message: 'JWT_SECRET not configured in Server.js' })
    }
  } catch {}

  // Check if CORS is open (*)
  try {
    const serverContent = fs.readFileSync('/app/Server.js', 'utf8')
    if (serverContent.includes('origin: "*"')) {
      findings.config_issues.push({ type: 'OPEN_CORS', severity: 'MEDIUM', message: 'CORS origin is wildcard (*) — restrict in production', file: 'Server.js' })
    }
  } catch {}

  // Check ML model exists + age
  try {
    const modelStat = fs.statSync('/app/ML/anomaly_model.pkl')
    const ageDays = (Date.now() - modelStat.mtimeMs) / (1000 * 60 * 60 * 24)
    if (ageDays > 7) {
      findings.config_issues.push({
        type: 'ML_MODEL_STALE', severity: 'MEDIUM',
        message: `ML model not retrained in ${Math.round(ageDays)} days — retrain recommended`,
        file: 'ML/anomaly_model.pkl'
      })
    }
  } catch {
    findings.config_issues.push({ type: 'ML_MODEL_MISSING', severity: 'CRITICAL', message: 'ML anomaly_model.pkl missing!', file: 'ML/anomaly_model.pkl' })
  }

  // ── 4. Server Checks (host logs accessible from container) ────────────────
  const logChecks = [
    { path: '/host-logs/nginx/error.log', label: 'NGINX error log' },
    { path: '/host-logs/suricata/fast.log', label: 'Suricata IDS log' },
    { path: '/host-logs/fail2ban.log', label: 'Fail2Ban log' },
  ]
  for (const lc of logChecks) {
    if (!fs.existsSync(lc.path)) {
      findings.server_checks.push({ type: 'LOG_MISSING', severity: 'LOW', message: `${lc.label} not accessible`, file: lc.path })
    } else {
      try {
        const stat = fs.statSync(lc.path)
        const sizeMB = stat.size / (1024 * 1024)
        if (sizeMB > 500) {
          findings.server_checks.push({ type: 'LOG_TOO_LARGE', severity: 'LOW', message: `${lc.label} is ${sizeMB.toFixed(0)}MB — consider rotation`, file: lc.path })
        }
      } catch {}
    }
  }

  // Check if blocked_ips.txt has pending IPs
  try {
    if (fs.existsSync('/app/blocked_ips.txt')) {
      const pending = fs.readFileSync('/app/blocked_ips.txt', 'utf8').split('\n').filter(Boolean).length
      if (pending > 0) {
        findings.server_checks.push({ type: 'UFW_SYNC_PENDING', severity: 'INFO', message: `${pending} IPs waiting for UFW sync` })
      }
    }
  } catch {}

  // ── Summary ────────────────────────────────────────────────────────────────
  const all = [
    ...findings.file_integrity, ...findings.code_vulnerabilities,
    ...findings.config_issues, ...findings.server_checks
  ]
  const bySev = (s) => all.filter(f => f.severity === s).length

  const report = {
    scan_time: new Date().toISOString(),
    scan_duration_ms: Date.now() - startTs,
    files_scanned: allFiles.length,
    ...findings,
    summary: {
      total_findings: all.length,
      critical: bySev('CRITICAL'),
      high: bySev('HIGH'),
      medium: bySev('MEDIUM'),
      low: bySev('LOW'),
      status: bySev('CRITICAL') > 0 ? 'CRITICAL' : bySev('HIGH') > 0 ? 'HIGH' : bySev('MEDIUM') > 0 ? 'MEDIUM' : 'CLEAN',
    }
  }

  fs.writeFileSync(HELIX_REPORT, JSON.stringify(report, null, 2))
  return report
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get('/report', protect, (req, res) => {
  const r = readJSON(HELIX_REPORT)
  res.json({ success: true, data: r, message: r ? undefined : 'No scan yet. Click "Run Scan".' })
})

router.get('/nexus-summary', protect, (req, res) => {
  const s = readJSON(NEXUS_SUMMARY)
  res.json({ success: true, data: s })
})

router.get('/heal-log', protect, (req, res) => {
  try {
    const log = fs.existsSync(HEAL_LOG)
      ? fs.readFileSync(HEAL_LOG, 'utf8').split('\n').slice(-150).join('\n')
      : 'No heal log yet.'
    res.json({ success: true, data: log })
  } catch { res.json({ success: true, data: 'Could not read log' }) }
})

router.post('/scan', protect, (req, res) => {
  try {
    const report = runFullScan()
    // Emit socket alert if critical/high
    if (global.aegixIO && (report.summary.critical > 0 || report.summary.high > 0)) {
      global.aegixIO.to('alerts').emit('new_alert', {
        type: 'HELIX_SCAN',
        severity: report.summary.critical > 0 ? 'CRITICAL' : 'HIGH',
        message: `HELIX found ${report.summary.critical} critical, ${report.summary.high} high issues`,
        ip: 'SYSTEM',
        ts: new Date().toISOString(),
      })
    }
    res.json({ success: true, data: report.summary, report })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

router.post('/heal', protect, (req, res) => {
  try {
    const report = readJSON(HELIX_REPORT)
    if (!report) return res.json({ success: false, message: 'Run scan first' })

    const healed = [], failed = []
    const ts = new Date().toISOString()

    // Restore tampered files
    const tampered = (report.file_integrity || []).filter(f => f.type === 'FILE_TAMPERED')
    for (const f of tampered) {
      try {
        const rel = path.relative('/app', f.file)
        exec(`cd /app && git checkout HEAD -- "${rel}"`, (err) => {
          const logLine = `[${new Date().toISOString()}] ${err ? 'FAILED' : 'RESTORED'}: ${f.file}\n`
          fs.appendFileSync(HEAL_LOG, logLine)
        })
        healed.push(`Queued git restore: ${f.file}`)
      } catch { failed.push(f.file) }
    }

    if (tampered.length === 0) healed.push('No tampered files detected — integrity OK')

    const summary = { healed_at: ts, healed, failed, total_healed: healed.length, total_failed: failed.length }
    fs.writeFileSync(NEXUS_SUMMARY, JSON.stringify(summary, null, 2))
    fs.appendFileSync(HEAL_LOG, `[${ts}] NEXUS run: ${healed.length} healed, ${failed.length} failed\n`)
    res.json({ success: true, data: summary })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

router.post('/baseline', protect, (req, res) => {
  try {
    const baseline = {}
    for (const f of WATCHED_FILES) {
      const h = sha256File(f)
      if (h) baseline[f] = h
    }
    fs.mkdirSync('/app/helix', { recursive: true })
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2))
    res.json({ success: true, message: `Baseline: ${Object.keys(baseline).length} files`, data: baseline })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
})

module.exports = router
