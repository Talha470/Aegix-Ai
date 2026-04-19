const router = require("express").Router();
const dash = require("../controllers/dashboard");
const { isLoggedIn } = require("../middlewares");

router.get("/", isLoggedIn, dash.home);
router.get("/stats", isLoggedIn, dash.stats);
router.get("/logs", isLoggedIn, dash.logs);
router.get("/alerts", isLoggedIn, dash.alerts);
router.get("/suspicious-ips", isLoggedIn, dash.suspiciousIPs);
router.get("/route-stats", isLoggedIn, dash.routeStats);

module.exports = router;