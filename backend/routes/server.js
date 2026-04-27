const express = require('express');
const router = express.Router();
const { getRealStats, getServerStats, getFail2BanData, getModSecData, getCowrieData } = require('../controllers/server');
const { getAttackLocations } = require('../controllers/geolocation');

// Existing routes
router.get('/real-stats', getRealStats);
router.get('/server-stats', getServerStats);
router.get('/fail2ban', getFail2BanData);
router.get('/modsec', getModSecData);
router.get('/cowrie', getCowrieData);

// Geolocation route
router.get('/attack-locations', getAttackLocations);

module.exports = router;
