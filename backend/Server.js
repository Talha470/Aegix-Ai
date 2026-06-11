require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server: SocketServer } = require("socket.io");
const jwt = require("jsonwebtoken");

const expressError = require("./utils/expressError");
const connectDB = require("./init/connect");
const { detectAttack, protect, require2FA } = require("./middlewares");

const app = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io",
});

// Auth middleware for socket
io.use((socket, next) => {
  socket.on("authenticate", (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
    } catch (e) {}
  });
  next();
});

io.on("connection", (socket) => {
  socket.join("alerts");
});

// Make io accessible in controllers
app.set("io", io);

// Export io so controllers can emit events
global.aegixIO = io;

// ── DB ────────────────────────────────────────────────────────────────────────
app.set("trust proxy", 1);
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Rate Limiters ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  standardHeaders: true, legacyHeaders: false,
  message: { msg: "Too many requests, please try again later" },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  standardHeaders: true, legacyHeaders: false,
  message: { msg: "Too many auth attempts, please try again later" },
});
const authLimiterforproductpage = rateLimit({
  windowMs: 15 * 60 * 1000, max: 50,
  standardHeaders: true, legacyHeaders: false,
  message: { msg: "Too many auth attempts, please try again later" },
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "OK" }));

// ── Core Routes ───────────────────────────────────────────────────────────────
app.use("/api/ml",          generalLimiter, require("./routes/ml"));
app.use("/api/auth",        authLimiter, detectAttack, require("./routes/auth"));
app.use("/api/dashboard",   protect, require2FA, generalLimiter, require("./routes/dashboard"));
app.use("/api/users",       protect, require2FA, generalLimiter, detectAttack, require("./routes/users"));
app.use("/api/productpage", authLimiterforproductpage, detectAttack, require("./routes/productpage"));
app.use("/api/server",      generalLimiter, require("./routes/serverLogs"));
app.use("/api/reports",     require("./routes/reports"));
app.use("/api/2fa",         protect, generalLimiter, require("./routes/twoFactor"));

// ── Upgrade Routes ────────────────────────────────────────────────────────────
app.use("/api/blocked-ips",  protect, require2FA, generalLimiter, require("./routes/blockedIPs"));
app.use("/api/morpheus",     generalLimiter, require("./routes/morpheus"));
app.use("/api/helix",        generalLimiter, require("./routes/helix"));
app.use("/api/compliance",   generalLimiter, require("./routes/compliance"));
app.use("/api/threat-intel", generalLimiter, require("./routes/threatIntel"));

// ── Error Handlers ────────────────────────────────────────────────────────────
app.use((req, res, next) => next(new expressError(404, "Page not found!")));
app.use((err, req, res, next) => {
  const { status = 500, message = "Something went wrong!" } = err;
  res.status(status).json({ success: false, status, message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(process.env.PORT, () => {
  console.log("AEGIX AI Server started on port " + process.env.PORT);
  console.log("Socket.io enabled for real-time alerts");
});

module.exports = { app, io };
