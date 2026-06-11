const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares')
const {
  checkAbuseIPDB, getAbuseIPDBBlacklist,
  getOTXPulses, getOTXIPReport,
  autoBlockThreatIPs, getThreatFeed
} = require('../controllers/threatIntel')

router.get('/feed', protect, getThreatFeed)
router.get('/abuseipdb/check', protect, checkAbuseIPDB)
router.get('/abuseipdb/blacklist', protect, getAbuseIPDBBlacklist)
router.get('/otx/pulses', protect, getOTXPulses)
router.get('/otx/ip', protect, getOTXIPReport)
router.post('/auto-block', protect, autoBlockThreatIPs)

module.exports = router
