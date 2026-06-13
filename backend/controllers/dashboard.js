const User = require("../models/users");
const Log = require("../models/logs");
const Alert = require("../models/alerts");
const SuspiciousIP = require("../models/suspiciousIPs");
const RouteStats = require("../models/routeStats");

module.exports.home = async (req, res, next) => {
  try {
    res.json({ msg: "Welcome Dashboard", user: req.user });
  } catch (err) { next(err) }
};

module.exports.stats = async (req, res, next) => {
  try {
    const [totalUsers, totalLogs, totalAlerts, totalSuspiciousIPs, attacks] = await Promise.all([
      User.countDocuments(),
      Log.countDocuments(),
      Alert.countDocuments(),
      SuspiciousIP.countDocuments(),
      Log.countDocuments({ attackType: { $exists: true, $ne: null } }),
    ]);

    res.json({
      users: totalUsers,
      attacks,
      logs: totalLogs,
      alerts: totalAlerts,
      suspiciousIPs: totalSuspiciousIPs,
      activeHoneypots: 3,
    });
  } catch (err) { next(err) }
};

module.exports.logs = async (req, res, next) => {
  try {
    // Exclude ::1 localhost logs from display
    const logs = await Log.find({ ip: { $nin: ['::1', '127.0.0.1'] } })
      .sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) { next(err) }
};

module.exports.alerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find({ ip: { $nin: ['::1', '127.0.0.1'] } })
      .sort({ lastSeen: -1 }).limit(50);
    res.json(alerts);
  } catch (err) { next(err) }
};

module.exports.suspiciousIPs = async (req, res, next) => {
  try {
    const ips = await SuspiciousIP.find({ ip: { $nin: ['::1', '127.0.0.1'] } })
      .sort({ updatedAt: -1 }).limit(50);
    res.json(ips);
  } catch (err) { next(err) }
};

module.exports.routeStats = async (req, res, next) => {
  try {
    const routes = await RouteStats.find()
      .sort({ totalAttacks: -1, totalHits: -1 }).limit(50);
    res.json(routes);
  } catch (err) { next(err) }
};
