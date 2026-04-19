const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      default: "",
      index: true,
    },
    endpoint: {
      type: String,
      default: "",
      index: true,
    },
    route: {
      type: String,
      default: "",
    },
    method: {
      type: String,
      default: "",
    },
    attackType: {
      type: String,
      default: "NORMAL",
      index: true,
    },
    severity: {
      type: String,
      default: "LOW",
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    score: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "ALLOWED",
      enum: ["ALLOWED", "FLAGGED", "BLOCKED"],
    },
    payload: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Log", logSchema);