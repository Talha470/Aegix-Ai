const router = require("express").Router();
const srv = require("../controllers/serverLogs");
const { isLoggedIn } = require("../middlewares");

router.get("/modsec", isLoggedIn, srv.modsecLogs);
router.get("/fail2ban", isLoggedIn, srv.fail2banStatus);
router.get("/suricata", isLoggedIn, srv.suricataLogs);
router.get("/honeypot", isLoggedIn, srv.honeypotLogs);
router.get("/cowrie", isLoggedIn, srv.cowrieLogs);
router.get("/server-stats", isLoggedIn, srv.serverStats);
router.get("/real-ips", isLoggedIn, srv.realSuspiciousIPs);
router.get("/real-stats", isLoggedIn, srv.realStats);
router.get("/real-alerts", isLoggedIn, srv.realAlerts);
module.exports = router;
