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
// ModSecurity WAF logs from error.log
router.get('/logs/modsecurity', async (req, res) => {
  try {
    const fs = require('fs');
    const data = fs.readFileSync('/host-logs/nginx/error.log', 'utf8');  // CHANGED
    const lines = data.split('\n').slice(-200);
    
    const logs = lines
      .filter(l => l.includes('ModSecurity'))
      .map(line => {
        const match = line.match(/\[client ([^\]]+)\].*\[msg "([^"]+)"\].*\[uri "([^"]+)"\]/);
        if (match) {
          return {
            ip: match[1],
            message: match[2],
            uri: match[3],
            timestamp: line.substring(0, 19)
          };
        }
        return null;
      })
      .filter(Boolean);
    
    res.json({ success: true, logs, count: logs.length });
  } catch (err) {
    res.json({ success: false, message: err.message, logs: [], count: 0 });
  }
});
module.exports = router;
