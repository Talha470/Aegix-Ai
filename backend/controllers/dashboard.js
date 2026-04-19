const User = require("../models/users");
const Log = require("../models/logs");
const Alert = require("../models/alerts");
const SuspiciousIP = require("../models/suspiciousIPs");
const RouteStats = require("../models/routeStats");

module.exports.home = async (req, res, next) => {
  try {
    res.json({
      msg: "Welcome Dashboard",
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
};

module.exports.stats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalLogs = await Log.countDocuments();
    const totalAlerts = await Alert.countDocuments();
    const totalSuspiciousIPs = await SuspiciousIP.countDocuments();
    const attacks = await Log.countDocuments({
      attackType: { $ne: "NORMAL" },
    });

    res.json({
      users: totalUsers,
      attacks,
      logs: totalLogs,
      alerts: totalAlerts,
      suspiciousIPs: totalSuspiciousIPs,
      activeHoneypots: 0,
    });
  } catch (err) {
    next(err);
  }
};

module.exports.logs = async (req, res, next) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

module.exports.alerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(50);
    res.json(alerts);
  } catch (err) {
    next(err);
  }
};

module.exports.suspiciousIPs = async (req, res, next) => {
  try {
    const ips = await SuspiciousIP.find().sort({ updatedAt: -1 }).limit(50);
    res.json(ips);
  } catch (err) {
    next(err);
  }
};

module.exports.routeStats = async (req, res, next) => {
  try {
    const routes = await RouteStats.find().sort({ totalAttacks: -1, totalHits: -1 }).limit(50);
    res.json(routes);
  } catch (err) {
    next(err);
  }
};