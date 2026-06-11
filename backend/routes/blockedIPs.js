const express = require('express')
const router = express.Router()
const {
  getAllBlockedIPs,
  addBlockedIP,
  removeBlockedIP,
  bulkAddIPs,
  checkAbuseIPDB,
  fetchAndBlockAbuseIPs,
  getStats
} = require('../controllers/blockedIPs')

router.get('/stats', getStats)
router.get('/', getAllBlockedIPs)
router.post('/', addBlockedIP)
router.delete('/:id', removeBlockedIP)
router.post('/bulk', bulkAddIPs)
router.post('/check-abuseipdb', checkAbuseIPDB)
router.post('/fetch-abuseipdb', fetchAndBlockAbuseIPs)

module.exports = router
