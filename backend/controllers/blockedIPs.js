const BlockedIP = require('../models/BlockedIP')
const { exec } = require('child_process')
const https = require('https')

// Helper: validate IPv4/IPv6
function isValidIP(ip) {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  return ipv4.test(ip) || ipv6.test(ip)
}

// Helper: run shell command (for UFW + Fail2Ban sync)
function runCmd(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      resolve({ success: !err, output: stdout || stderr || '' })
    })
  })
}

// GET /api/blocked-ips — list all blocked IPs
async function getAllBlockedIPs(req, res) {
  try {
    const { search, source, page = 1, limit = 50 } = req.query
    const query = {}
    if (search) query.ip = { $regex: search, $options: 'i' }
    if (source) query.source = source

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [ips, total] = await Promise.all([
      BlockedIP.find(query).sort({ blockedAt: -1 }).skip(skip).limit(parseInt(limit)),
      BlockedIP.countDocuments(query)
    ])

    res.json({ success: true, data: ips, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/blocked-ips — add single IP manually
async function addBlockedIP(req, res) {
  try {
    const { ip, reason, permanent = true, expiresAt } = req.body
    if (!ip) return res.status(400).json({ success: false, message: 'IP address required' })
    if (!isValidIP(ip)) return res.status(400).json({ success: false, message: 'Invalid IP format' })

    const user = req.user?.email || 'admin'
    const existing = await BlockedIP.findOne({ ip })
    if (existing) return res.status(409).json({ success: false, message: 'IP already blocked' })

    const blocked = await BlockedIP.create({
      ip, reason: reason || 'Manual block', source: 'MANUAL',
      blockedBy: user, permanent, expiresAt: permanent ? null : expiresAt
    })

    // Sync to UFW + Fail2Ban on server
    await runCmd(`sudo ufw deny from ${ip} to any comment "AEGIX-BLOCKED"`)
    await runCmd(`sudo fail2ban-client set sshd banip ${ip}`)

    res.json({ success: true, message: `IP ${ip} blocked successfully`, data: blocked })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'IP already blocked' })
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/blocked-ips/:id — remove block
async function removeBlockedIP(req, res) {
  try {
    const blocked = await BlockedIP.findById(req.params.id)
    if (!blocked) return res.status(404).json({ success: false, message: 'IP not found' })

    const { ip } = blocked
    await BlockedIP.findByIdAndDelete(req.params.id)

    // Remove from UFW
    await runCmd(`sudo ufw delete deny from ${ip} to any`)
    await runCmd(`sudo fail2ban-client set sshd unbanip ${ip} 2>/dev/null || true`)

    res.json({ success: true, message: `IP ${ip} unblocked` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/blocked-ips/bulk — bulk add IPs
async function bulkAddIPs(req, res) {
  try {
    const { ips, reason, source = 'MANUAL' } = req.body
    if (!Array.isArray(ips) || ips.length === 0)
      return res.status(400).json({ success: false, message: 'ips array required' })

    const user = req.user?.email || 'admin'
    const results = { added: [], skipped: [], failed: [] }

    for (const ip of ips) {
      if (!isValidIP(ip.trim())) { results.failed.push(ip); continue }
      try {
        await BlockedIP.create({ ip: ip.trim(), reason: reason || 'Bulk import', source, blockedBy: user })
        await runCmd(`sudo ufw deny from ${ip.trim()} to any comment "AEGIX-BLOCKED"`)
        results.added.push(ip.trim())
      } catch (e) {
        if (e.code === 11000) results.skipped.push(ip.trim())
        else results.failed.push(ip.trim())
      }
    }

    res.json({ success: true, results })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/blocked-ips/check-abuseipdb — check single IP on AbuseIPDB
async function checkAbuseIPDB(req, res) {
  try {
    const { ip } = req.body
    if (!ip) return res.status(400).json({ success: false, message: 'IP required' })

    const apiKey = process.env.ABUSEIPDB_KEY
    if (!apiKey) return res.status(503).json({ success: false, message: 'AbuseIPDB API key not configured' })

    const data = await fetchAbuseIPDB(ip, apiKey)
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/blocked-ips/fetch-abuseipdb — fetch top malicious IPs and auto-block
async function fetchAndBlockAbuseIPs(req, res) {
  try {
    const apiKey = process.env.ABUSEIPDB_KEY
    if (!apiKey) return res.status(503).json({ success: false, message: 'ABUSEIPDB_KEY not set in environment' })

    const { confidenceMin = 90, limit = 100 } = req.body
    const user = req.user?.email || 'admin'

    // Fetch blacklist from AbuseIPDB
    const blacklist = await fetchAbuseBlacklist(apiKey, confidenceMin, limit)
    if (!blacklist || !blacklist.length)
      return res.json({ success: true, message: 'No IPs fetched', added: 0 })

    let added = 0, skipped = 0
    for (const entry of blacklist) {
      const ip = entry.ipAddress
      try {
        await BlockedIP.create({
          ip,
          reason: `AbuseIPDB score: ${entry.abuseConfidenceScore}%`,
          source: 'ABUSEIPDB',
          abuseConfidenceScore: entry.abuseConfidenceScore,
          countryCode: entry.countryCode || '',
          totalReports: entry.totalReports || 0,
          blockedBy: user
        })
        await runCmd(`sudo ufw deny from ${ip} to any comment "AEGIX-ABUSEIPDB"`)
        added++
      } catch (e) {
        if (e.code === 11000) skipped++
      }
    }

    res.json({ success: true, message: `Fetched and blocked IPs`, added, skipped, total: blacklist.length })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/blocked-ips/stats
async function getStats(req, res) {
  try {
    const [total, manual, abuseipdb, autoMl] = await Promise.all([
      BlockedIP.countDocuments(),
      BlockedIP.countDocuments({ source: 'MANUAL' }),
      BlockedIP.countDocuments({ source: 'ABUSEIPDB' }),
      BlockedIP.countDocuments({ source: 'AUTO_ML' }),
    ])
    res.json({ success: true, data: { total, manual, abuseipdb, autoMl } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// Helper: query AbuseIPDB for single IP
function fetchAbuseIPDB(ip, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.abuseipdb.com',
      path: `/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      method: 'GET',
      headers: { Key: apiKey, Accept: 'application/json' }
    }
    let body = ''
    const req = https.request(options, (resp) => {
      resp.on('data', d => body += d)
      resp.on('end', () => {
        try { resolve(JSON.parse(body).data) }
        catch (e) { reject(new Error('Failed to parse AbuseIPDB response')) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

// Helper: fetch AbuseIPDB blacklist
function fetchAbuseBlacklist(apiKey, confidenceMin, limit) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.abuseipdb.com',
      path: `/api/v2/blacklist?confidenceMinimum=${confidenceMin}&limit=${limit}`,
      method: 'GET',
      headers: { Key: apiKey, Accept: 'application/json' }
    }
    let body = ''
    const req = https.request(options, (resp) => {
      resp.on('data', d => body += d)
      resp.on('end', () => {
        try { resolve(JSON.parse(body).data) }
        catch (e) { reject(new Error('Failed to parse AbuseIPDB blacklist response')) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

module.exports = {
  getAllBlockedIPs,
  addBlockedIP,
  removeBlockedIP,
  bulkAddIPs,
  checkAbuseIPDB,
  fetchAndBlockAbuseIPs,
  getStats
}
