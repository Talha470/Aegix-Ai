const { execSync } = require("child_process");
const fs = require("fs");

function readLastLines(filePath, count) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, "utf8");
    const lines = data.split("\n").filter(l => l.trim());
    return lines.slice(-count);
  } catch (e) {
    return [];
  }
}

module.exports.modsecLogs = async (req, res) => {
  try {
    const lines = readLastLines("/host-logs/nginx/modsec_audit.log", 200);
    const entries = [];
    const raw = lines.join("\n");
    const blocks = raw.split(/---[a-zA-Z0-9]+---A--/).filter(b => b.trim());

    for (const block of blocks.slice(-30)) {
      const ipMatch = block.match(/(\d+\.\d+\.\d+\.\d+)/);
      const dateMatch = block.match(/\[(\d{2}\/\w+\/\d{4}[^\]]+)\]/);
      const uriMatch = block.match(/(GET|POST|PUT|DELETE)\s+(\S+)/);

      if (ipMatch) {
        entries.push({
          ip: ipMatch[1],
          time: dateMatch ? dateMatch[1] : "Unknown",
          method: uriMatch ? uriMatch[1] : "GET",
          uri: uriMatch ? uriMatch[2] : "/",
          source: "ModSecurity"
        });
      }
    }

    res.json(entries.reverse());
  } catch (err) {
    res.json([]);
  }
};

module.exports.fail2banStatus = async (req, res) => {
  try {
    const lines = readLastLines("/host-logs/fail2ban.log", 200);
    const jails = ["sshd", "modsecurity", "nginx-botsearch", "nginx-http-auth", "suricata", "honeypot"];
    const results = [];

    for (const jail of jails) {
      const banLines = lines.filter(l => l.includes(jail) && l.includes("Ban "));
      const unbanLines = lines.filter(l => l.includes(jail) && l.includes("Unban "));

      const bannedIPs = new Set();
      for (const line of banLines) {
        const ipMatch = line.match(/Ban\s+(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) bannedIPs.add(ipMatch[1]);
      }
      for (const line of unbanLines) {
        const ipMatch = line.match(/Unban\s+(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) bannedIPs.delete(ipMatch[1]);
      }

      results.push({
        jail,
        currentlyBanned: bannedIPs.size,
        totalBanned: banLines.length,
        bannedIPs: Array.from(bannedIPs)
      });
    }

    res.json(results);
  } catch (err) {
    res.json([]);
  }
};

module.exports.suricataLogs = async (req, res) => {
  try {
    const lines = readLastLines("/host-logs/suricata/fast.log", 100);
    const entries = lines.slice(-30).map(line => {
      const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4}-\d{2}:\d{2}:\d{2})/);
      const msgMatch = line.match(/\[\*\*\]\s*\[\d+:\d+:\d+\]\s*(.*?)\s*\[\*\*\]/);
      const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+):\d+\s*->\s*(\d+\.\d+\.\d+\.\d+)/);

      return {
        time: dateMatch ? dateMatch[1] : "Unknown",
        message: msgMatch ? msgMatch[1] : line.substring(0, 100),
        sourceIP: ipMatch ? ipMatch[1] : "Unknown",
        destIP: ipMatch ? ipMatch[2] : "Unknown",
        source: "Suricata"
      };
    });

    res.json(entries.reverse());
  } catch (err) {
    res.json([]);
  }
};

module.exports.honeypotLogs = async (req, res) => {
  try {
    const lines = readLastLines("/host-logs/nginx/honeypot.log", 100);
    const entries = lines.slice(-30).map(line => {
      const ipMatch = line.match(/^(\d+\.\d+\.\d+\.\d+)/);
      const dateMatch = line.match(/\[([^\]]+)\]/);
      const reqMatch = line.match(/"(GET|POST)\s+(\S+)/);
      const uaMatch = line.match(/"([^"]*)"$/);

      return {
        ip: ipMatch ? ipMatch[1] : "Unknown",
        time: dateMatch ? dateMatch[1] : "Unknown",
        method: reqMatch ? reqMatch[1] : "GET",
        path: reqMatch ? reqMatch[2] : "/",
        userAgent: uaMatch ? uaMatch[1] : "Unknown",
        source: "HTTP Honeypot"
      };
    });

    res.json(entries.reverse());
  } catch (err) {
    res.json([]);
  }
};

module.exports.cowrieLogs = async (req, res) => {
  try {
    const logFile = "/host-logs/cowrie/cowrie.json";
    let entries = [];

    if (fs.existsSync(logFile)) {
      const data = fs.readFileSync(logFile, "utf8");
      const lines = data.split("\n").filter(l => l.trim());

      for (const line of lines.slice(-100)) {
        try {
          const obj = JSON.parse(line);
          if (obj.eventid === "cowrie.login.failed" || obj.eventid === "cowrie.login.success" ||
              obj.eventid === "cowrie.session.connect" || obj.eventid === "cowrie.command.input") {
            entries.push({
              ip: obj.src_ip || "Unknown",
              time: obj.timestamp || "Unknown",
              event: obj.eventid,
              username: obj.username || "",
              password: obj.password || "",
              message: obj.message || "",
              source: "Cowrie SSH"
            });
          }
        } catch (e) {}
      }
    }

    res.json(entries.reverse().slice(0, 30));
  } catch (err) {
    res.json([]);
  }
};

module.exports.serverStats = async (req, res) => {
  try {
    const uptime = execSync("cat /proc/uptime 2>/dev/null").toString().trim();
    const uptimeSeconds = parseFloat(uptime.split(" ")[0]);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeStr = `${days}d ${hours}h`;

    const cpuRaw = fs.readFileSync("/proc/stat", "utf8");
    const cpuLine = cpuRaw.split("\n")[0].split(/\s+/);
    const idle = parseInt(cpuLine[4]);
    const total = cpuLine.slice(1).reduce((a, b) => a + parseInt(b), 0);
    const cpuUsage = Math.round(((total - idle) / total) * 100);

    const memRaw = fs.readFileSync("/proc/meminfo", "utf8");
    const memTotal = parseInt(memRaw.match(/MemTotal:\s+(\d+)/)[1]) / 1024;
    const memAvail = parseInt(memRaw.match(/MemAvailable:\s+(\d+)/)[1]) / 1024;
    const memUsed = Math.round(memTotal - memAvail);

    let disk = { total: "0", used: "0", available: "0", usagePercent: "0%" };
    try {
      const diskRaw = execSync("df -h / | awk 'NR==2{printf \"%s %s %s %s\", $2,$3,$4,$5}'").toString().trim();
      const dp = diskRaw.split(" ");
      disk = { total: dp[0], used: dp[1], available: dp[2], usagePercent: dp[3] };
    } catch (e) {}

    res.json({
      uptime: uptimeStr,
      cpu: cpuUsage,
      memory: { total: Math.round(memTotal), used: memUsed, available: Math.round(memAvail) },
      disk
    });
  } catch (err) {
    res.json({ uptime: "unknown", cpu: 0, memory: {}, disk: {} });
  }
};

module.exports.realSuspiciousIPs = async (req, res) => {
  try {
    const ipCount = {};

    // Cowrie logs
    const cowrieFile = "/host-logs/cowrie/cowrie.json";
    if (fs.existsSync(cowrieFile)) {
      const data = fs.readFileSync(cowrieFile, "utf8");
      data.split("\n").filter(l => l.trim()).forEach(line => {
        try {
          const obj = JSON.parse(line);
          if (obj.src_ip) {
            if (!ipCount[obj.src_ip]) ipCount[obj.src_ip] = { attacks: 0, lastAttack: "", sources: new Set() };
            ipCount[obj.src_ip].attacks++;
            ipCount[obj.src_ip].lastAttack = obj.eventid || "";
            ipCount[obj.src_ip].sources.add("Cowrie");
          }
        } catch(e) {}
      });
    }

    // Honeypot HTTP logs
    const httpLines = readLastLines("/host-logs/nginx/honeypot.log", 500);
    httpLines.forEach(line => {
      const m = line.match(/^(\d+\.\d+\.\d+\.\d+)/);
      if (m) {
        const ip = m[1];
        if (!ipCount[ip]) ipCount[ip] = { attacks: 0, lastAttack: "", sources: new Set() };
        ipCount[ip].attacks++;
        ipCount[ip].lastAttack = "HTTP_TRAP";
        ipCount[ip].sources.add("HTTP Honeypot");
      }
    });

    // Suricata logs
    const suricataLines = readLastLines("/host-logs/suricata/fast.log", 500);
    suricataLines.forEach(line => {
      const m = line.match(/(\d+\.\d+\.\d+\.\d+):\d+\s*->/);
      if (m) {
        const ip = m[1];
        if (ip.startsWith("10.") || ip.startsWith("127.")) return;
        if (!ipCount[ip]) ipCount[ip] = { attacks: 0, lastAttack: "", sources: new Set() };
        ipCount[ip].attacks++;
        ipCount[ip].sources.add("Suricata");
      }
    });

    const results = Object.entries(ipCount)
      .map(([ip, data]) => ({
        ip,
        totalAttacks: data.attacks,
        lastAttack: data.lastAttack,
        sources: Array.from(data.sources),
        severity: data.attacks > 20 ? "CRITICAL" : data.attacks > 10 ? "HIGH" : data.attacks > 5 ? "MEDIUM" : "LOW"
      }))
      .sort((a, b) => b.totalAttacks - a.totalAttacks)
      .slice(0, 50);

    res.json(results);
  } catch(err) {
    res.json([]);
  }
};
module.exports.realAlerts = async (req, res) => {
  try {
    const alerts = [];

    // Cowrie alerts
    const cowrieFile = "/host-logs/cowrie/cowrie.json";
    if (fs.existsSync(cowrieFile)) {
      const data = fs.readFileSync(cowrieFile, "utf8");
      const lines = data.split("\n").filter(l => l.trim());
      const ipAttempts = {};

      lines.forEach(line => {
        try {
          const obj = JSON.parse(line);
          if (obj.eventid === "cowrie.login.failed" || obj.eventid === "cowrie.login.success") {
            if (!ipAttempts[obj.src_ip]) ipAttempts[obj.src_ip] = { count: 0, last: "", event: "" };
            ipAttempts[obj.src_ip].count++;
            ipAttempts[obj.src_ip].last = obj.timestamp;
            ipAttempts[obj.src_ip].event = obj.eventid;
          }
        } catch(e) {}
      });

      Object.entries(ipAttempts).forEach(([ip, data]) => {
        const severity = data.count > 20 ? "CRITICAL" : data.count > 10 ? "HIGH" : data.count > 5 ? "MEDIUM" : "LOW";
        alerts.push({
          ip,
          type: data.event.includes("success") ? "SSH_LOGIN_SUCCESS" : "SSH_BRUTE_FORCE",
          severity,
          score: data.count * 2,
          count: data.count,
          message: `${data.count} SSH login attempts from ${ip}`,
          lastSeen: data.last,
          source: "Cowrie"
        });
      });
    }

    // Suricata alerts
    const suricataLines = readLastLines("/host-logs/suricata/fast.log", 500);
    const suricataIPs = {};
    suricataLines.forEach(line => {
      const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+):\d+\s*->/);
      const msgMatch = line.match(/\[\*\*\]\s*\[\d+:\d+:\d+\]\s*(.*?)\s*\[\*\*\]/);
      const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4}-\d{2}:\d{2}:\d{2})/);
      if (ipMatch && !ipMatch[1].startsWith("10.") && !ipMatch[1].startsWith("127.")) {
        const ip = ipMatch[1];
        if (!suricataIPs[ip]) suricataIPs[ip] = { count: 0, msg: "", last: "" };
        suricataIPs[ip].count++;
        suricataIPs[ip].msg = msgMatch ? msgMatch[1] : "IDS Alert";
        suricataIPs[ip].last = dateMatch ? dateMatch[1] : "";
      }
    });

    Object.entries(suricataIPs).forEach(([ip, data]) => {
      const severity = data.count > 20 ? "CRITICAL" : data.count > 10 ? "HIGH" : data.count > 5 ? "MEDIUM" : "LOW";
      alerts.push({
        ip,
        type: data.msg.includes("Nmap") ? "PORT_SCAN" : data.msg.includes("Brute") ? "SSH_BRUTE_FORCE" : "IDS_ALERT",
        severity,
        score: data.count * 3,
        count: data.count,
        message: `${data.msg} (${data.count} times)`,
        lastSeen: data.last,
        source: "Suricata"
      });
    });

    // HTTP Honeypot alerts
    const httpLines = readLastLines("/host-logs/nginx/honeypot.log", 500);
    const httpIPs = {};
    httpLines.forEach(line => {
      const m = line.match(/^(\d+\.\d+\.\d+\.\d+)/);
      const dateMatch = line.match(/\[([^\]]+)\]/);
      const pathMatch = line.match(/"(?:GET|POST)\s+(\S+)/);
      if (m) {
        const ip = m[1];
        if (!httpIPs[ip]) httpIPs[ip] = { count: 0, path: "", last: "" };
        httpIPs[ip].count++;
        httpIPs[ip].path = pathMatch ? pathMatch[1] : "/";
        httpIPs[ip].last = dateMatch ? dateMatch[1] : "";
      }
    });

    Object.entries(httpIPs).forEach(([ip, data]) => {
      alerts.push({
        ip,
        type: "HTTP_TRAP_HIT",
        severity: data.count > 5 ? "HIGH" : "MEDIUM",
        score: data.count * 5,
        count: data.count,
        message: `Hit honeypot trap ${data.path} (${data.count} times)`,
        lastSeen: data.last,
        source: "HTTP Honeypot"
      });
    });

    alerts.sort((a, b) => b.score - a.score);
    res.json(alerts.slice(0, 50));
  } catch(err) {
    res.json([]);
  }
};
module.exports.realStats = async (req, res) => {
  try {
    let totalAttacks = 0;
    let totalAlerts = 0;
    const uniqueIPs = new Set();

    // Cowrie
    const cowrieFile = "/host-logs/cowrie/cowrie.json";
    if (fs.existsSync(cowrieFile)) {
      const lines = fs.readFileSync(cowrieFile, "utf8").split("\n").filter(l => l.trim());
      lines.forEach(line => {
        try {
          const obj = JSON.parse(line);
          if (obj.eventid?.includes("login")) { totalAttacks++; totalAlerts++; }
          if (obj.src_ip) uniqueIPs.add(obj.src_ip);
        } catch(e) {}
      });
    }

    // Suricata
    const suricataLines = readLastLines("/host-logs/suricata/fast.log", 1000);
    suricataLines.forEach(line => {
      totalAttacks++;
      const m = line.match(/(\d+\.\d+\.\d+\.\d+):\d+\s*->/);
      if (m && !m[1].startsWith("10.") && !m[1].startsWith("127.")) uniqueIPs.add(m[1]);
    });

    // ModSecurity
    const modsecLines = readLastLines("/host-logs/nginx/modsec_audit.log", 1000);
    const modsecBlocks = modsecLines.join("\n").split(/---[a-zA-Z0-9]+---A--/).filter(b => b.trim());
    modsecBlocks.forEach(block => {
      const ipMatch = block.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (ipMatch) { totalAlerts++; uniqueIPs.add(ipMatch[1]); }
    });

    // HTTP Honeypot
    const httpLines = readLastLines("/host-logs/nginx/honeypot.log", 500);
    httpLines.forEach(line => {
      const m = line.match(/^(\d+\.\d+\.\d+\.\d+)/);
      if (m) { totalAttacks++; uniqueIPs.add(m[1]); }
    });

    // Users from MongoDB
    const User = require("../models/users");
    const totalUsers = await User.countDocuments();

    res.json({
      attacks: totalAttacks,
      alerts: totalAlerts,
      suspiciousIPs: uniqueIPs.size,
      logs: totalAttacks + totalAlerts,
      users: totalUsers,
      activeHoneypots: 3
    });
  } catch(err) {
    res.json({ attacks: 0, alerts: 0, suspiciousIPs: 0, logs: 0, users: 0, activeHoneypots: 3 });
  }
};
