const mongoose = require("mongoose");

const suspiciousIPSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstSeen: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    totalAttacks: {
      type: Number,
      default: 0,
    },
    totalAlerts: {
      type: Number,
      default: 0,
    },
    uniqueRoutes: {
      type: [String],
      default: [],
    },
    lastAttackType: {
      type: String,
      default: "",
    },
    currentSeverity: {
      type: String,
      default: "LOW",
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    status: {
      type: String,
      default: "ACTIVE",
      enum: ["ACTIVE", "BLOCKED"],
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
    userAgents: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SuspiciousIP", suspiciousIPSchema);