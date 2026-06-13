const express = require('express')
const router = express.Router()
const Log = require('../models/logs')
const { protect } = require('../middlewares')

// GET /api/internal-logs — show ::1 / 127.0.0.1 logs (HELIX self-tests)
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [logs, total] = await Promise.all([
      Log.find({ ip: { $in: ['::1', '127.0.0.1', '::ffff:127.0.0.1'] } })
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Log.countDocuments({ ip: { $in: ['::1', '127.0.0.1', '::ffff:127.0.0.1'] } })
    ])

    res.json({ success: true, data: logs, total, page: parseInt(page) })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/internal-logs/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [total, sqli, xss, traversal] = await Promise.all([
      Log.countDocuments({ ip: { $in: ['::1', '127.0.0.1', '::ffff:127.0.0.1'] } }),
      Log.countDocuments({ ip: { $in: ['::1', '127.0.0.1'] }, attackType: 'SQL_INJECTION' }),
      Log.countDocuments({ ip: { $in: ['::1', '127.0.0.1'] }, attackType: 'XSS' }),
      Log.countDocuments({ ip: { $in: ['::1', '127.0.0.1'] }, attackType: 'PATH_TRAVERSAL' }),
    ])
    res.json({ success: true, data: { total, sqli, xss, traversal } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
