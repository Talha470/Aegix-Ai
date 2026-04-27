const Joi = require("joi");
const jwt = require("jsonwebtoken");
const Log = require("./models/logs");
const Alert = require("./models/alerts");
const SuspiciousIP = require("./models/suspiciousIPs");
const RouteStats = require("./models/routeStats");
const {
  signupSchema,
  loginSchema,
  productSignupSchema,
  productLoginSchema,
  demoRequestSchema,
  selectPlanSchema,
} = require("./utils/joiSchemas");
const {
  sqlPatterns,
  xssPatterns,
  pathTraversalPatterns,
  suspiciousPatterns,
} = require("./utils/attackPatterns");

// -------------------- HELPERS --------------------

const getClientIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket.remoteAddress || req.ip || "";
};

const toSearchableString = (input) => {
  if (!input) return "";
  if (typeof input === "string") return input;

  try {
    return JSON.stringify(input);
  } catch (err) {
    return "";
  }
};

const detectPattern = (input, patterns) => {
  const value = toSearchableString(input);
  if (!value) return false;

  return patterns.some((pattern) => pattern.test(value));
};

const isSafeRoute = (url) => {
  const safeRoutes = ["/api/health"];
  return safeRoutes.includes(url);
};

const getBaseScore = (attackType) => {
  switch (attackType) {
    case "SQL_INJECTION":
      return 9;
    case "XSS":
      return 8;
    case "PATH_TRAVERSAL":
      return 9;
    case "SUSPICIOUS_REQUEST":
      return 5;
    default:
      return 1;
  }
};

const getSeverityFromScore = (score) => {
  if (score >= 20) return "CRITICAL";
  if (score >= 12) return "HIGH";
  if (score >= 7) return "MEDIUM";
  return "LOW";
};

const getUserAgent = (req) => {
  return req.headers["user-agent"] || "";
};

const getTimeWindowStart = (minutes = 10) => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - minutes);
  return now;
};

const updateRouteStats = async (route, attackType = null) => {
  const routeDoc = await RouteStats.findOne({ route });

  if (routeDoc) {
    routeDoc.totalHits += 1;
    routeDoc.lastSeen = new Date();

    if (attackType) {
      routeDoc.totalAttacks += 1;
      routeDoc.lastAttackType = attackType;
    }

    await routeDoc.save();
  } else {
    await RouteStats.create({
      route,
      totalHits: 1,
      totalAttacks: attackType ? 1 : 0,
      lastAttackType: attackType || "",
      lastSeen: new Date(),
    });
  }
};

const updateSuspiciousIP = async (ip, route, attackType, severity, userAgent, blockedUntil = null) => {
  let ipDoc = await SuspiciousIP.findOne({ ip });

  if (!ipDoc) {
    ipDoc = await SuspiciousIP.create({
      ip,
      firstSeen: new Date(),
      lastSeen: new Date(),
      totalAttacks: 1,
      totalAlerts: 1,
      uniqueRoutes: [route],
      lastAttackType: attackType,
      currentSeverity: severity,
      status: blockedUntil ? "BLOCKED" : "ACTIVE",
      blockedUntil,
      userAgents: userAgent ? [userAgent] : [],
    });
    return ipDoc;
  }

  ipDoc.lastSeen = new Date();
  ipDoc.totalAttacks += 1;
  ipDoc.totalAlerts += 1;
  ipDoc.lastAttackType = attackType;
  ipDoc.currentSeverity = severity;

  if (!ipDoc.uniqueRoutes.includes(route)) {
    ipDoc.uniqueRoutes.push(route);
  }

  if (userAgent && !ipDoc.userAgents.includes(userAgent)) {
    ipDoc.userAgents.push(userAgent);
  }

  if (blockedUntil) {
    ipDoc.status = "BLOCKED";
    ipDoc.blockedUntil = blockedUntil;
  }

  await ipDoc.save();
  return ipDoc;
};

const isBlockedIP = async (ip) => {
  const ipDoc = await SuspiciousIP.findOne({ ip });

  if (!ipDoc || !ipDoc.blockedUntil) return false;

  if (new Date() > ipDoc.blockedUntil) {
    ipDoc.status = "ACTIVE";
    ipDoc.blockedUntil = null;
    await ipDoc.save();
    return false;
  }

  return true;
};
const rateLimitForIP = {};
// -------------------- EXPORTS --------------------

module.exports = {

  require2FA : async (req, res, next) => {
  try {
    const User = require("./models/users");
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    
    // If 2FA not enabled, require setup
    if (!user.twoFactorEnabled) {
      return res.status(403).json({ 
        msg: "2FA setup required",
        requires2FASetup: true 
      });
    }
    
    next();
  } catch (err) {
    return res.status(500).json({ msg: "Server error" });
  }
},

  validateOTP: (req, res, next) => {
  const { otp } = req.body;

  if (!otp || otp.length !== 6 || isNaN(otp)) {
    return res.status(400).json({ msg: "Invalid OTP. Please enter a 6-digit OTP." });
  }

  next();
},

validateNewPassword:  (req, res, next) => {
  const { newPassword } = req.body;

  if (newPassword.length < 8) {
    return res.status(400).json({ msg: "Password must be at least 8 characters." });
  }
  
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({
      msg: "Password must include uppercase, lowercase, and a number.",
    });
  }

  next();
},

  isLoggedIn: (req, res, next) => {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "No token provided" });
    }

    const token = auth.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ msg: "Invalid token" });
    }
  },

  validateSignup: (req, res, next) => {
    const { error } = signupSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        msg: error.details[0].message,
      });
    }

    next();
  },

  validateLogin: (req, res, next) => {
const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    twoFactorCode: Joi.string().optional().allow('', null)  // ADD THIS LINE
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ msg: error.details[0].message });
  }
  next();
},

  validateProductSignup: (req, res, next) => {
    const { error } = productSignupSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        msg: error.details[0].message,
      });
    }

    next();
  },

  validateProductLogin: (req, res, next) => {
    const { error } = productLoginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        msg: error.details[0].message,
      });
    }

    next();
  },

  validateDemoRequest: (req, res, next) => {
    const { error } = demoRequestSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        msg: error.details[0].message,
      });
    }

    next();
  },

  validateSelectPlan: (req, res, next) => {
  const { error } = selectPlanSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      msg: error.details[0].message,
    });
  }

  next();
},

  isAdmin: (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Admin only" });
    }

    next();
  },

  detectAttack : async (req, res, next) => {
  try {
    if (isSafeRoute(req.originalUrl)) {
      await updateRouteStats(req.originalUrl);
      return next();
    }

    const ip = getClientIP(req);

    // Rate limit tracking per IP
    if (!rateLimitForIP[ip]) {
      rateLimitForIP[ip] = { count: 1, lastRequest: Date.now() };
    } else {
      const timeDiff = Date.now() - rateLimitForIP[ip].lastRequest;
      if (timeDiff < 60 * 1000) { // 1 minute window
        rateLimitForIP[ip].count += 1;
      } else {
        rateLimitForIP[ip].count = 1;
      }

      rateLimitForIP[ip].lastRequest = Date.now();

      if (rateLimitForIP[ip].count > 20) { // Block after 20 requests within 1 minute
        await updateSuspiciousIP(ip, req.originalUrl, "TOO_MANY_REQUESTS", "CRITICAL", getUserAgent(req), new Date(Date.now() + 1 * 10 * 100)); // Block for 10 minutes
        return res.status(429).json({ msg: "Too many requests from this IP, please try again later." });
      }
    }

    // Check if the IP is blocked
    const blocked = await isBlockedIP(ip);
    if (blocked) {
      return res.status(403).json({
        msg: "IP temporarily blocked",
        severity: "CRITICAL",
      });
    }

    const requestData = {
      body: req.body,
      query: req.query,
      params: req.params,
      url: req.originalUrl,
    };

    // Detect attack patterns
    let attackType = null;
    if (detectPattern(requestData, sqlPatterns)) attackType = "SQL_INJECTION";
    else if (detectPattern(requestData, xssPatterns)) attackType = "XSS";
    else if (detectPattern(requestData, pathTraversalPatterns)) attackType = "PATH_TRAVERSAL";
    else if (detectPattern(requestData, suspiciousPatterns)) attackType = "SUSPICIOUS_REQUEST";

    if (!attackType) {
      await updateRouteStats(req.originalUrl);
      return next();
    }

    const recentWindow = getTimeWindowStart(10);
    const recentCount = await Log.countDocuments({
      ip,
      attackType,
      createdAt: { $gte: recentWindow },
    });

    const baseScore = getBaseScore(attackType);
    const repeatedBonus = recentCount >= 5 ? 10 : recentCount >= 3 ? 5 : recentCount >= 1 ? 2 : 0;
    const totalScore = baseScore + repeatedBonus;
    const severity = getSeverityFromScore(totalScore);

    let blockedUntil = null;

    if (severity === "CRITICAL") {
      blockedUntil = new Date(Date.now() + 10 * 60 * 1000); // Block for 10 minutes if attack severity is critical
    }

    await Log.create({
      ip,
      endpoint: req.originalUrl,
      route: req.originalUrl,
      method: req.method,
      attackType,
      severity,
      score: totalScore,
      status: blockedUntil ? "BLOCKED" : "FLAGGED",
      payload: JSON.stringify(requestData),
      userAgent: getUserAgent(req),
      message: `${attackType} detected`,
    });

    await updateRouteStats(req.originalUrl, attackType);

    let alert = await Alert.findOne({ ip, type: attackType });

    if (!alert) {
      alert = await Alert.create({
        ip,
        type: attackType,
        severity,
        score: totalScore,
        count: 1,
        message: `${attackType} detected from IP ${ip}`,
        lastSeen: new Date(),
        blockedUntil,
      });
    } else {
      alert.count += 1;
      alert.lastSeen = new Date();
      alert.score = totalScore;
      alert.severity = severity;
      alert.message = `${attackType} detected from IP ${ip}`;
      if (blockedUntil) {
        alert.blockedUntil = blockedUntil;
      }
      await alert.save();
    }

    await updateSuspiciousIP(ip, req.originalUrl, attackType, severity, getUserAgent(req), blockedUntil);

    return res.status(403).json({
      msg: "Malicious request detected",
      attackType,
      severity,
      score: totalScore,
      blocked: !!blockedUntil,
    });
  } catch (err) {
    next(err);
  }
},
protect : async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    
    if (!token) {
      return res.status(401).json({ msg: "Not authorized, no token" });
    }
    
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ msg: "Not authorized, token failed" });
  }
},
};
