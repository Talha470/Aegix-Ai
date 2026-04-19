const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      default: "",
      index: true,
    },
    type: {
      type: String,
      default: "",
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
    count: {
      type: Number,
      default: 1,
    },
    message: {
      type: String,
      default: "",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);