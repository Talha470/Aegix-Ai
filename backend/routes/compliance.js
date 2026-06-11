const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares')
const { getDashboard, getAuditTrail, getCVSSReport, getIEEEReport } = require('../controllers/compliance')

router.get('/dashboard', protect, getDashboard)
router.get('/audit-trail', protect, getAuditTrail)
router.get('/cvss-report', protect, getCVSSReport)
router.get('/ieee-report', protect, getIEEEReport)

module.exports = router
