/**
 * AEGIX AI — Zero-Day Detection Middleware
 * Real-time ML scoring on every request.
 * Auto-blocks if confidence > 80% and both models agree (ZERO-DAY).
 */
const { PythonShell } = require('python-shell')
const BlockedIP = require('../models/BlockedIP')
const Log = require('../models/logs')
const Alert = require('../models/alerts')
const { exec } = require('child_process')

const BLOCK_CONFIDENCE = 80  // % threshold

function getClientIP(req) {
  const fwd = req.headers['x-forwarded-for']
  return fwd ? fwd.split(',')[0].trim() : req.socket?.remoteAddress || req.ip || ''
}

// In-memory cache to avoid re-scoring same IP too frequently (1 min TTL)
const scoreCache = new Map()

async function zeroDayDetect(req, res, next) {
  try {
    const ip = getClientIP(req)
    const now = Date.now()

    // Skip health check and static assets
    if (req.originalUrl.startsWith('/api/health') || req.originalUrl.startsWith('/static')) {
      return next()
    }

    // Check if IP already in our BlockedIP collection
    const alreadyBlocked = await BlockedIP.findOne({ ip })
    if (alreadyBlocked) {
      return res.status(403).json({
        msg: 'IP blocked by AEGIX Security',
        threat_level: 'BLOCKED',
        source: alreadyBlocked.source
      })
    }

    // Cache check — don't re-score same IP within 60s
    const cached = scoreCache.get(ip)
    if (cached && (now - cached.ts) < 60000) {
      if (cached.should_block) {
        return res.status(403).json({ msg: 'Zero-Day threat blocked', threat_level: cached.threat_level })
      }
      return next()
    }

    // Build log entry for ML scoring
    const logEntry = {
      ip,
      path: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent'] || '',
      payload: JSON.stringify({ body: req.body, query: req.query }),
      severity: 'MEDIUM',
      source: 'live',
      timestamp: new Date().toISOString(),
    }

    // Run ML prediction (async, non-blocking with timeout)
    const result = await Promise.race([
      runMLPredict(logEntry),
      new Promise((_, reject) => setTimeout(() => reject(new Error('ML timeout')), 3000))
    ]).catch(() => null)

    if (!result) return next()  // ML timeout — don't block

    // Cache result
    scoreCache.set(ip, { ts: now, ...result })

    // If Zero-Day with high confidence → auto-block
    if (result.should_block && result.threat_level === 'ZERO-DAY') {
      await autoBlock(ip, result, req)
      return res.status(403).json({
        msg: 'Zero-Day threat automatically blocked',
        threat_level: 'ZERO-DAY',
        confidence: result.confidence,
        blocked: true,
      })
    }

    // Attach ML data to request for logging
    req.mlResult = result
    next()
  } catch (err) {
    next()  // Never block on middleware errors
  }
}

async function runMLPredict(logEntry) {
  return new Promise((resolve, reject) => {
    const opts = {
      mode: 'text',
      pythonPath: 'python3',
      scriptPath: '/app/ML',
      args: ['predict'],
    }
    const shell = new PythonShell('train_model.py', opts)
    shell.send(JSON.stringify(logEntry))
    let output = ''
    shell.on('message', msg => output += msg)
    shell.end(err => {
      if (err) return reject(err)
      try { resolve(JSON.parse(output)) }
      catch (e) { reject(e) }
    })
  })
}

async function autoBlock(ip, mlResult, req) {
  try {
    await BlockedIP.create({
      ip,
      reason: `Auto-blocked: ZERO-DAY threat (confidence: ${mlResult.confidence}%)`,
      source: 'AUTO_ML',
      abuseConfidenceScore: mlResult.confidence,
      blockedBy: 'AEGIX-ML-ENGINE',
    })

    await Log.create({
      ip,
      endpoint: req.originalUrl,
      route: req.originalUrl,
      method: req.method,
      attackType: 'ZERO_DAY',
      severity: 'CRITICAL',
      score: 25,
      status: 'BLOCKED',
      payload: JSON.stringify({ body: req.body }),
      userAgent: req.headers['user-agent'] || '',
      message: `ZERO-DAY auto-block: confidence ${mlResult.confidence}%`,
    })

    await Alert.findOneAndUpdate(
      { ip, type: 'ZERO_DAY' },
      {
        $set: { severity: 'CRITICAL', lastSeen: new Date(), message: `ZERO-DAY auto-blocked from ${ip}` },
        $inc: { count: 1 },
        $setOnInsert: { score: 25, blockedUntil: null }
      },
      { upsert: true }
    )

    // UFW block
    exec(`sudo ufw deny from ${ip} to any comment "AEGIX-ZERODAY"`)
  } catch (e) {
    // Duplicate key = already blocked, ignore
  }
}

module.exports = zeroDayDetect
