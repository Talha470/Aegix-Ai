const https = require('https')
const http = require('http')
const BlockedIP = require('../models/BlockedIP')

// ── AbuseIPDB ─────────────────────────────────────────────────────────────────

function abuseipdbRequest(path, apiKey) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.abuseipdb.com',
      path, method: 'GET',
      headers: { Key: apiKey, Accept: 'application/json' }
    }
    let body = ''
    const req = https.request(opts, res => {
      res.on('data', d => body += d)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) }
        catch (e) { reject(new Error('AbuseIPDB parse error')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('AbuseIPDB timeout')) })
    req.end()
  })
}

// GET /api/threat-intel/abuseipdb/check?ip=x.x.x.x
async function checkAbuseIPDB(req, res) {
  try {
    const { ip } = req.query
    if (!ip) return res.status(400).json({ success: false, message: 'ip query param required' })

    const apiKey = process.env.ABUSEIPDB_KEY
    if (!apiKey) return res.status(503).json({ success: false, message: 'ABUSEIPDB_KEY not configured' })

    const result = await abuseipdbRequest(`/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose=true`, apiKey)
    res.json({ success: true, data: result.data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/threat-intel/abuseipdb/blacklist
async function getAbuseIPDBBlacklist(req, res) {
  try {
    const apiKey = process.env.ABUSEIPDB_KEY
    if (!apiKey) return res.status(503).json({ success: false, message: 'ABUSEIPDB_KEY not configured' })

    const { limit = 50, confidence = 85 } = req.query
    const result = await abuseipdbRequest(
      `/api/v2/blacklist?confidenceMinimum=${confidence}&limit=${limit}`, apiKey
    )
    res.json({ success: true, data: result.data || [], total: (result.data || []).length })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ── AlienVault OTX ────────────────────────────────────────────────────────────

function otxRequest(path, apiKey) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'otx.alienvault.com',
      path, method: 'GET',
      headers: { 'X-OTX-API-KEY': apiKey || '', Accept: 'application/json' }
    }
    let body = ''
    const req = https.request(opts, res => {
      res.on('data', d => body += d)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) }
        catch (e) { reject(new Error('OTX parse error')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('OTX timeout')) })
    req.end()
  })
}

// GET /api/threat-intel/otx/pulses — latest threat pulses
async function getOTXPulses(req, res) {
  try {
    const apiKey = process.env.OTX_API_KEY
    if (!apiKey) return res.status(503).json({ success: false, message: 'OTX_API_KEY not configured' })

    const result = await otxRequest('/api/v1/pulses/subscribed?limit=10', apiKey)
    const pulses = (result.results || []).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description?.slice(0, 200),
      created: p.created,
      modified: p.modified,
      tags: p.tags || [],
      targeted_countries: p.targeted_countries || [],
      malware_families: p.malware_families || [],
      adversary: p.adversary || '',
      tlp: p.tlp,
      indicator_count: p.indicators?.length || 0,
    }))
    res.json({ success: true, data: pulses })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/threat-intel/otx/ip?ip=x.x.x.x
async function getOTXIPReport(req, res) {
  try {
    const { ip } = req.query
    if (!ip) return res.status(400).json({ success: false, message: 'ip query param required' })

    const apiKey = process.env.OTX_API_KEY
    if (!apiKey) return res.status(503).json({ success: false, message: 'OTX_API_KEY not configured' })

    const [general, repute] = await Promise.allSettled([
      otxRequest(`/api/v1/indicators/IPv4/${ip}/general`, apiKey),
      otxRequest(`/api/v1/indicators/IPv4/${ip}/reputation`, apiKey),
    ])

    res.json({
      success: true,
      data: {
        general: general.status === 'fulfilled' ? general.value : null,
        reputation: repute.status === 'fulfilled' ? repute.value : null,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/threat-intel/auto-block — check + auto-block high-risk IPs
async function autoBlockThreatIPs(req, res) {
  try {
    const { ips = [] } = req.body
    if (!ips.length) return res.status(400).json({ success: false, message: 'ips array required' })

    const apiKey = process.env.ABUSEIPDB_KEY
    if (!apiKey) return res.status(503).json({ success: false, message: 'ABUSEIPDB_KEY not configured' })

    const results = { blocked: [], skipped: [], failed: [] }
    const { exec } = require('child_process')

    for (const ip of ips.slice(0, 20)) {  // max 20 at a time
      try {
        const result = await abuseipdbRequest(`/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`, apiKey)
        const d = result.data
        if (d && d.abuseConfidenceScore >= 80) {
          try {
            await BlockedIP.create({
              ip,
              reason: `Auto-blocked: AbuseIPDB score ${d.abuseConfidenceScore}%`,
              source: 'ABUSEIPDB',
              abuseConfidenceScore: d.abuseConfidenceScore,
              countryCode: d.countryCode || '',
              isp: d.isp || '',
              totalReports: d.totalReports || 0,
              blockedBy: 'THREAT-INTEL-AUTO',
            })
            exec(`sudo ufw deny from ${ip} to any comment "AEGIX-THREATINTEL"`)
            results.blocked.push({ ip, score: d.abuseConfidenceScore })
          } catch (e) {
            if (e.code === 11000) results.skipped.push(ip)
            else results.failed.push(ip)
          }
        } else {
          results.skipped.push(ip)
        }
      } catch (e) {
        results.failed.push(ip)
      }
    }

    res.json({ success: true, results })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/threat-intel/feed — combined feed summary
async function getThreatFeed(req, res) {
  try {
    const blockedCount = await BlockedIP.countDocuments()
    const recentBlocked = await BlockedIP.find({ source: 'ABUSEIPDB' }).sort({ blockedAt: -1 }).limit(20)

    const feed = {
      summary: {
        total_blocked: blockedCount,
        abuseipdb_blocks: recentBlocked.length,
        last_updated: new Date().toISOString(),
      },
      recent_threats: recentBlocked.map(b => ({
        ip: b.ip,
        country: b.countryCode,
        score: b.abuseConfidenceScore,
        isp: b.isp,
        reason: b.reason,
        blocked_at: b.blockedAt,
      })),
      apis_configured: {
        abuseipdb: !!process.env.ABUSEIPDB_KEY,
        otx: !!process.env.OTX_API_KEY,
      }
    }

    res.json({ success: true, data: feed })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { checkAbuseIPDB, getAbuseIPDBBlacklist, getOTXPulses, getOTXIPReport, autoBlockThreatIPs, getThreatFeed }
