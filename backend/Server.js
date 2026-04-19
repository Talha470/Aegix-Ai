if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const expressError = require("./utils/expressError");
const connectDB = require("./init/connect");
const { detectAttack } = require("./middlewares");

const app = express();

// local testing ke liye trust proxy off rakho
// production me nginx ke piche ho to 1 kar dena
app.set("trust proxy", 1);

connectDB();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    msg: "Too many requests, please try again later",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    msg: "Too many auth attempts, please try again later",
  },
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use("/api/auth", authLimiter, detectAttack, require("./routes/auth"));
app.use("/api/dashboard", generalLimiter, detectAttack, require("./routes/dashboard"));
app.use("/api/users", generalLimiter, detectAttack, require("./routes/users"));

app.use((req, res, next) => {
  next(new expressError(404, "Page not found!"));
});

app.use((err, req, res, next) => {
  const { status = 500, message = "Something went wrong!" } = err;

  res.status(status).json({
    success: false,
    status,
    message,
  });
});

app.listen(process.env.PORT, () => {
  console.log("Server started on port " + process.env.PORT);
});